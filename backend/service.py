import os
import json
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_huggingface import HuggingFaceEmbeddings # <--- New Import
from langchain_community.vectorstores import FAISS
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from schemas import CorepFieldUpdate, AnalysisResponse

# Load environment variables
load_dotenv()

# 1. Setup Gemini
# "gemini-1.5-flash" is fast and free for prototypes
llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0)
embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

# Global variable to hold our "Database" in memory
vector_store = None

def initialize_vector_store():
    """
    Creates the in-memory database.
    Run this once when the app starts.
    """
    global vector_store
    
    # OPTIONAL: If you have a real PDF, put it in the backend folder
    pdf_path = "pra_rulebook.pdf" 
    
    if os.path.exists(pdf_path):
        print("Loading PDF Rulebook...")
        loader = PyPDFLoader(pdf_path)
        pages = loader.load()
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
        docs = text_splitter.split_documents(pages)
        vector_store = FAISS.from_documents(docs, embeddings)
    else:
        print("No PDF found. Loading Dummy Rules into Memory...")
        # Fallback: Create a fake rulebook in memory so the app works immediately
        dummy_rules = [
            "Article 114(4): Exposures to Member States' central governments denominated in domestic currency are assigned a 0% risk weight.",
            "Article 123: Retail exposures shall be assigned a risk weight of 75%."
        ]
        vector_store = FAISS.from_texts(dummy_rules, embeddings)

    print("Vector Store (Database) Ready!")

def get_rag_response(query: str) -> AnalysisResponse:
    global vector_store
    
    # 1. Search the "Database" for relevant rules
    if vector_store:
        docs = vector_store.similarity_search(query, k=2)
        context_text = "\n\n".join([d.page_content for d in docs])
    else:
        context_text = "No rules loaded."

    # 2. Construct the Prompt
    # We explicitly ask for JSON to ensure the frontend table can read it.
    prompt = f"""
    You are a PRA Regulatory Reporting Assistant.
    User Scenario: "{query}"
    
    Relevant Rules Found:
    {context_text}
    
    Task:
    1. Does this scenario match "Sovereign Exposure" (Govt/Gilt) or "Retail Exposure"?
    2. What is the Risk Weight?
    3. Return a JSON object ONLY.
    
    JSON Format:
    {{
        "response_text": "Brief explanation for the user.",
        "data_update": {{
            "field_id": "row_sovereign_exposure" OR "row_retail_exposure",
            "value": <number>,
            "rule_ref": "The Article number found in rules",
            "reasoning": "One sentence explaining why."
        }}
    }}
    """
    
    # 3. Call Gemini
    response = llm.invoke(prompt)
    
    # 4. Clean and Parse
    try:
        # Remove markdown formatting if Gemini adds it
        content = response.content.replace("```json", "").replace("```", "").strip()
        data = json.loads(content)
        
        if "data_update" in data and data["data_update"]:
            update = CorepFieldUpdate(**data["data_update"])
            return AnalysisResponse(response_text=data["response_text"], data_update=update)
        else:
            return AnalysisResponse(response_text=data["response_text"], data_update=None)
            
    except Exception as e:
        return AnalysisResponse(response_text=f"Error parsing Gemini response: {str(e)}", data_update=None)