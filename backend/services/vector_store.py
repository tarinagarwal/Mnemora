"""
ChromaDB Vector Store for document embeddings
"""
import logging
import os
from typing import Dict, List, Optional

import chromadb
from chromadb.config import Settings

logger = logging.getLogger(__name__)


class VectorStore:
    """Wrapper for ChromaDB vector database operations"""
    
    def __init__(self, persist_directory: str):
        self.persist_directory = persist_directory
        os.makedirs(persist_directory, exist_ok=True)
        
        # Initialize ChromaDB
        self.client = chromadb.PersistentClient(
            path=persist_directory,
            settings=Settings(
                anonymized_telemetry=False,
                allow_reset=True
            )
        )
        
        # Get or create the main collection
        self.collection = self.client.get_or_create_collection(
            name="mnemora_documents",
            metadata={"hnsw:space": "cosine"}
        )
        
        logger.info(f"VectorStore initialized at {persist_directory}")
        logger.info(f"Collection has {self.collection.count()} documents")
    
    def add_documents(
        self,
        ids: List[str],
        embeddings: List[List[float]],
        documents: List[str],
        metadatas: List[Dict]
    ) -> None:
        """Add documents with embeddings to the collection"""
        if not ids:
            return
        
        self.collection.add(
            ids=ids,
            embeddings=embeddings,
            documents=documents,
            metadatas=metadatas
        )
        logger.info(f"Added {len(ids)} documents to vector store")
    
    def query(
        self,
        query_embedding: List[float],
        top_k: int = 5,
        where: Optional[Dict] = None
    ) -> List[Dict]:
        """Query the collection for similar documents"""
        if not query_embedding:
            return []
        
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            where=where,
            include=["documents", "metadatas", "distances"]
        )
        
        # Format results
        formatted = []
        if results and results["ids"] and results["ids"][0]:
            for i, doc_id in enumerate(results["ids"][0]):
                formatted.append({
                    "id": doc_id,
                    "content": results["documents"][0][i] if results["documents"] else "",
                    "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                    "distance": results["distances"][0][i] if results["distances"] else 0,
                    "score": 1 - (results["distances"][0][i] if results["distances"] else 0)  # Convert distance to similarity
                })
        
        return formatted
    
    def delete_by_folder(self, folder_path: str) -> int:
        """Delete all documents from a specific folder"""
        try:
            # Get IDs of documents from this folder
            results = self.collection.get(
                where={"folder_path": folder_path},
                include=[]
            )
            
            if results and results["ids"]:
                self.collection.delete(ids=results["ids"])
                logger.info(f"Deleted {len(results['ids'])} documents from {folder_path}")
                return len(results["ids"])
            
            return 0
        except Exception as e:
            logger.error(f"Error deleting documents: {e}")
            return 0
    
    def get_document_count(self) -> int:
        """Get total number of documents in the collection"""
        return self.collection.count()
    
    def get_folders(self) -> List[str]:
        """Get list of indexed folders"""
        try:
            # Get all documents and extract unique folder paths
            results = self.collection.get(include=["metadatas"])
            folders = set()
            if results and results["metadatas"]:
                for metadata in results["metadatas"]:
                    if metadata and "folder_path" in metadata:
                        folders.add(metadata["folder_path"])
            return list(folders)
        except Exception as e:
            logger.error(f"Error getting folders: {e}")
            return []
    
    def clear_all(self) -> None:
        """Clear all documents from the collection"""
        try:
            self.client.delete_collection("mnemora_documents")
            self.collection = self.client.create_collection(
                name="mnemora_documents",
                metadata={"hnsw:space": "cosine"}
            )
            logger.info("Cleared all documents from vector store")
        except Exception as e:
            logger.error(f"Error clearing vector store: {e}")
