"""
Mnemora Backend - FastAPI server for document indexing and RAG queries
"""
import asyncio
import logging
import os
import sys
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import router
from services.vector_store import VectorStore
from services.ollama_client import OllamaClient

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global instances
vector_store: VectorStore = None
ollama_client: OllamaClient = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle - startup and shutdown"""
    global vector_store, ollama_client
    
    logger.info("Starting Mnemora backend...")
    
    # Initialize services
    data_dir = os.path.join(os.path.dirname(__file__), 'data')
    os.makedirs(data_dir, exist_ok=True)
    
    vector_store = VectorStore(persist_directory=os.path.join(data_dir, 'chromadb'))
    ollama_client = OllamaClient()
    
    # Store in app state
    app.state.vector_store = vector_store
    app.state.ollama_client = ollama_client
    
    logger.info("Mnemora backend ready!")
    
    yield
    
    logger.info("Shutting down Mnemora backend...")


# Create FastAPI app
app = FastAPI(
    title="Mnemora",
    description="Local-first personal context engine",
    version="0.1.0",
    lifespan=lifespan
)

# CORS for Electron
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(router)


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=False,
        log_level="info"
    )
