import os
import json
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_huggingface import HuggingFaceEmbeddings # <--- New Import
from langchain_community.vectorstores import FAISS
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from schemas import CorepFieldUpdate, AnalysisResponse
from fastapi import UploadFile
import io
from pypdf import PdfReader

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
    
    source_info = "System Memory" # Default source
    context_text = ""

    # 1. Search the "Database" for relevant rules
    if vector_store:
        # Retrieve the top 2 most relevant chunks
        docs = vector_store.similarity_search(query, k=2)
        
        # --- NEW: Metadata Extraction ---
        if docs:
            # We take the metadata from the most relevant doc (docs[0])
            meta = docs[0].metadata
            # PDF loaders usually save 'page' (int) and 'source' (file path)
            page_num = meta.get('page', 'Unknown')
            # Clean up the filename (remove full path if present)
            raw_source = meta.get('source', 'Uploaded Doc')
            doc_name = os.path.basename(raw_source) if raw_source else "Document"
            
            source_info = f"{doc_name} (Page {page_num})"
            
            # Combine content from all retrieved docs for context
            context_text = "\n\n".join([d.page_content for d in docs])
        else:
            context_text = "No specific rules found in database."
    else:
        context_text = "No rules loaded."

    # 2. Construct the Prompt
    # We now inject 'source_info' into the instructions so the LLM adds it to the JSON.
    prompt = f"""
    You are a PRA Regulatory Reporting Assistant.
    User Scenario: "{query}"
    
    Relevant Rules/Context Found:
    {context_text}
    
    Source Metadata: {source_info}
    
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
            "reasoning": "One sentence explaining why.",
            "source_page": "{source_info}"
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
            # Ensure the source_page is set (in case LLM hallucinated or missed it)
            if "source_page" not in data["data_update"]:
                 data["data_update"]["source_page"] = source_info
            
            update = CorepFieldUpdate(**data["data_update"])
            return AnalysisResponse(response_text=data["response_text"], data_update=update)
        else:
            return AnalysisResponse(response_text=data["response_text"], data_update=None)
            
    except Exception as e:
        print(f"Error parsing Gemini response: {e}")
        # Return a safe error response instead of crashing
        return AnalysisResponse(
            response_text=f"I found relevant info in {source_info}, but I had trouble formatting the answer. Please try again.", 
            data_update=None
        )
        
async def process_document(file: UploadFile) -> AnalysisResponse:
    """
    Reads a file, extracts text, and asks the LLM to analyze it.
    """
    content = ""
    
    # 1. Extract Text based on file type
    if file.filename.endswith(".pdf"):
        # Read PDF bytes
        pdf_bytes = await file.read()
        reader = PdfReader(io.BytesIO(pdf_bytes))
        # Extract text from first 2 pages (usually enough for summary)
        for page in reader.pages[:2]: 
            content += page.extract_text() or ""
    elif file.filename.endswith(".txt"):
        content = (await file.read()).decode("utf-8")
    else:
        return AnalysisResponse(response_text="Error: Only .pdf and .txt files are supported for now.")

    # 2. Limit content length to avoid confusing the LLM
    # (Keep it under ~2000 chars for this prototype)
    truncated_content = content[:2000]

    # 3. Create a Prompt for the LLM
    # We pretend the document text is the "User Query"
    prompt_context = f"Analyze this uploaded financial document snippet and extract capital requirements:\n\n{truncated_content}"
    
    # 4. Reuse your existing RAG logic!
    # This is the smart part: We treat the document text just like a user chat message.
    return get_rag_response(prompt_context)