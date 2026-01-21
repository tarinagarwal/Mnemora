"""
RAG Pipeline - Retrieval Augmented Generation
"""
import logging
from typing import AsyncGenerator, Dict, List, Optional

from services.ollama_client import OllamaClient
from services.vector_store import VectorStore

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are Mnemora, a helpful AI assistant that answers questions based on the user's personal documents and files. 

Guidelines:
- Base your answers on the provided context from the user's documents
- If the context doesn't contain relevant information, say so honestly
- Be concise but thorough
- Use markdown formatting for better readability
- When referencing information, mention which file it came from
- If you're unsure, acknowledge uncertainty rather than making things up"""


class RAGPipeline:
    """Retrieval Augmented Generation pipeline"""
    
    def __init__(
        self, 
        vector_store: VectorStore, 
        ollama: OllamaClient,
        model: str = "llama3.2:3b"
    ):
        self.vector_store = vector_store
        self.ollama = ollama
        self.model = model
    
    async def retrieve(self, query: str, top_k: int = 5) -> List[Dict]:
        """Retrieve relevant documents for a query"""
        # Generate query embedding
        query_embedding = await self.ollama.generate_embedding(query)
        
        if not query_embedding:
            logger.warning("Failed to generate query embedding")
            return []
        
        # Search vector store
        results = self.vector_store.query(query_embedding, top_k=top_k)
        
        # Format for response
        sources = []
        for result in results:
            sources.append({
                "file_path": result["metadata"].get("file_path", "Unknown"),
                "file_name": result["metadata"].get("file_name", "Unknown"),
                "content": result["content"][:500],  # Truncate for response
                "score": round(result.get("score", 0), 3),
                "chunk_index": result["metadata"].get("chunk_index", 0),
            })
        
        return sources
    
    async def generate(
        self, 
        query: str, 
        sources: List[Dict]
    ) -> AsyncGenerator[str, None]:
        """Generate a response using retrieved context"""
        
        # Build context from sources
        if sources:
            context_parts = []
            for i, source in enumerate(sources, 1):
                context_parts.append(
                    f"[Source {i}: {source['file_name']}]\n{source['content']}"
                )
            context = "\n\n---\n\n".join(context_parts)
        else:
            context = "No relevant documents found in the knowledge base."
        
        # Stream the response
        async for token in self.ollama.chat_stream(
            prompt=query,
            model=self.model,
            system_prompt=SYSTEM_PROMPT,
            context=context
        ):
            yield token
    
    async def query(self, query: str, top_k: int = 5) -> Dict:
        """Full RAG query - retrieve and generate"""
        # Retrieve
        sources = await self.retrieve(query, top_k=top_k)
        
        # Generate
        response = ""
        async for token in self.generate(query, sources):
            response += token
        
        return {
            "response": response,
            "sources": sources
        }
