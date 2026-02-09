from fastapi import FastAPI
from contextlib import asynccontextmanager
from schemas import AnalysisResponse
from service import get_rag_response, initialize_vector_store
from fastapi.middleware.cors import CORSMiddleware
from fastapi import UploadFile, File

# This function runs ONCE when the server starts
@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize_vector_store() # Builds the in-memory DB
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_scenario(user_query: str):
    return get_rag_response(user_query)

@app.post("/upload", response_model=AnalysisResponse)
async def upload_document(file: UploadFile = File(...)):
    from service import process_document # Import here to avoid circular loops
    return await process_document(file)