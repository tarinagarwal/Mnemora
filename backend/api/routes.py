"""
API Routes for Mnemora
"""
import asyncio
import json
import logging
import os
from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from services.indexer import DocumentIndexer
from services.rag import RAGPipeline

logger = logging.getLogger(__name__)
router = APIRouter()


class IndexRequest(BaseModel):
    folder_path: str


class QueryRequest(BaseModel):
    query: str
    model: Optional[str] = "llama3.2:3b"
    top_k: Optional[int] = 5


class FolderInfo(BaseModel):
    path: str
    document_count: int


# ============== Health & Status ==============

@router.get("/health")
async def health_check(request: Request):
    """Check backend and Ollama status"""
    ollama = request.app.state.ollama_client
    ollama_status = await ollama.check_health()
    
    return {
        "status": "healthy",
        "ollama_status": "connected" if ollama_status else "disconnected"
    }


@router.get("/models")
async def list_models(request: Request):
    """List available Ollama models"""
    ollama = request.app.state.ollama_client
    models = await ollama.list_models()
    return {"models": models}


@router.get("/setup/status")
async def get_setup_status(request: Request):
    """Get Ollama setup status - check if required models are installed"""
    ollama = request.app.state.ollama_client
    
    # Check if Ollama is running
    is_running = await ollama.check_health()
    
    if not is_running:
        return {
            "ollama_installed": False,
            "ollama_running": False,
            "ready": False,
            "message": "Ollama is not running. Please install and start Ollama.",
            "install_url": "https://ollama.ai/download"
        }
    
    # Check model status
    model_status = await ollama.get_required_models_status()
    
    return {
        "ollama_installed": True,
        "ollama_running": True,
        "ready": model_status["ready"],
        "has_llm": model_status["has_llm"],
        "has_embedding": model_status["has_embedding"],
        "installed_llm": model_status["installed_llm"],
        "installed_embedding": model_status["installed_embedding"],
        "recommended_llm": model_status["recommended_llm"],
        "recommended_embedding": model_status["recommended_embedding"]
    }


class PullModelRequest(BaseModel):
    model_name: str


@router.post("/setup/pull-model")
async def pull_model(req: PullModelRequest, request: Request):
    """Pull/download a model from Ollama registry"""
    ollama = request.app.state.ollama_client
    
    async def stream_progress():
        async for progress in ollama.pull_model(req.model_name):
            yield f"data: {json.dumps(progress)}\n\n"
    
    return StreamingResponse(
        stream_progress(),
        media_type="text/event-stream"
    )


# ============== Folder Management ==============

@router.post("/index")
async def index_folder(req: IndexRequest, request: Request):
    """Index a folder of documents with streaming progress"""
    folder_path = req.folder_path
    
    if not os.path.isdir(folder_path):
        raise HTTPException(status_code=400, detail=f"Invalid folder path: {folder_path}")
    
    vector_store = request.app.state.vector_store
    ollama = request.app.state.ollama_client
    
    indexer = DocumentIndexer(vector_store, ollama)
    
    async def stream_progress():
        errors = []
        processed = 0
        
        try:
            # Send initial status
            yield f"data: {json.dumps({'type': 'start', 'folder': folder_path})}\n\n"
            
            # Index with progress callback
            async for progress in indexer.index_folder_with_progress(folder_path):
                if progress.get('type') == 'file_done':
                    processed += 1
                    yield f"data: {json.dumps(progress)}\n\n"
                elif progress.get('type') == 'file_error':
                    errors.append(progress)
                    yield f"data: {json.dumps(progress)}\n\n"
                elif progress.get('type') == 'discovery':
                    yield f"data: {json.dumps(progress)}\n\n"
                elif progress.get('type') == 'embedding':
                    yield f"data: {json.dumps(progress)}\n\n"
            
            # Send completion
            yield f"data: {json.dumps({'type': 'done', 'processed': processed, 'errors': len(errors), 'error_files': errors})}\n\n"
            
        except Exception as e:
            logger.error(f"Indexing failed: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
    
    return StreamingResponse(
        stream_progress(),
        media_type="text/event-stream"
    )


@router.delete("/folders/{folder_path:path}")
async def remove_folder(folder_path: str, request: Request):
    """Remove a folder from the index"""
    vector_store = request.app.state.vector_store
    
    try:
        # Remove documents from this folder
        vector_store.delete_by_folder(folder_path)
        return {"status": "success", "message": f"Removed {folder_path} from index"}
    except Exception as e:
        logger.error(f"Failed to remove folder: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============== Query / Chat ==============

@router.post("/query")
async def query_documents(req: QueryRequest, request: Request):
    """Query indexed documents with RAG"""
    vector_store = request.app.state.vector_store
    ollama = request.app.state.ollama_client
    
    rag = RAGPipeline(vector_store, ollama, model=req.model)
    
    async def generate():
        try:
            # First, retrieve relevant sources
            sources = await rag.retrieve(req.query, top_k=req.top_k)
            
            # Send sources to frontend
            yield f"data: {json.dumps({'type': 'sources', 'sources': sources})}\n\n"
            
            # Stream the response
            async for token in rag.generate(req.query, sources):
                yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"
            
            # Done
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
            
        except Exception as e:
            logger.error(f"Query failed: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )
