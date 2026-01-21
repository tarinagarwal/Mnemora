"""
Document Indexer - processes files and creates embeddings
"""
import asyncio
import hashlib
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

from services.ollama_client import OllamaClient
from services.vector_store import VectorStore
from parsers.markdown_parser import MarkdownParser
from parsers.pdf_parser import PDFParser
from parsers.code_parser import CodeParser

logger = logging.getLogger(__name__)

# Supported file extensions
SUPPORTED_EXTENSIONS = {
    # Markdown
    '.md', '.markdown',
    # Plain text
    '.txt',
    # Code
    '.py', '.js', '.ts', '.jsx', '.tsx', '.java', '.cpp', '.c', '.h',
    '.go', '.rs', '.rb', '.php', '.swift', '.kt', '.scala',
    '.html', '.css', '.scss', '.json', '.yaml', '.yml', '.toml',
    # PDF
    '.pdf',
}

# Maximum chunk size in characters
MAX_CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200


class DocumentIndexer:
    """Index documents from folders into the vector store"""
    
    def __init__(self, vector_store: VectorStore, ollama_client: OllamaClient):
        self.vector_store = vector_store
        self.ollama = ollama_client
        
        # Initialize parsers
        self.markdown_parser = MarkdownParser()
        self.pdf_parser = PDFParser()
        self.code_parser = CodeParser()
    
    async def index_folder(self, folder_path: str) -> Dict:
        """Index all supported files in a folder"""
        folder_path = os.path.abspath(folder_path)
        logger.info(f"Starting indexing of {folder_path}")
        
        # Find all supported files
        files = self._discover_files(folder_path)
        logger.info(f"Found {len(files)} supported files")
        
        if not files:
            return {"document_count": 0, "chunk_count": 0}
        
        # Delete existing documents from this folder
        self.vector_store.delete_by_folder(folder_path)
        
        # Process each file
        all_chunks = []
        for file_path in files:
            try:
                chunks = await self._process_file(file_path, folder_path)
                all_chunks.extend(chunks)
            except Exception as e:
                logger.error(f"Failed to process {file_path}: {e}")
        
        logger.info(f"Created {len(all_chunks)} chunks from {len(files)} files")
        
        if not all_chunks:
            return {"document_count": len(files), "chunk_count": 0}
        
        # Generate embeddings in batches
        texts = [chunk["text"] for chunk in all_chunks]
        embeddings = await self.ollama.generate_embeddings_batch(texts)
        
        # Filter out failed embeddings
        valid_chunks = []
        valid_embeddings = []
        for chunk, embedding in zip(all_chunks, embeddings):
            if embedding:
                valid_chunks.append(chunk)
                valid_embeddings.append(embedding)
        
        if not valid_chunks:
            logger.warning("No valid embeddings generated")
            return {"document_count": len(files), "chunk_count": 0}
        
        # Add to vector store
        ids = [chunk["id"] for chunk in valid_chunks]
        documents = [chunk["text"] for chunk in valid_chunks]
        metadatas = [chunk["metadata"] for chunk in valid_chunks]
        
        self.vector_store.add_documents(ids, valid_embeddings, documents, metadatas)
        
        logger.info(f"Indexed {len(valid_chunks)} chunks from {len(files)} files")
        
        return {
            "document_count": len(files),
            "chunk_count": len(valid_chunks)
        }
    
    async def index_folder_with_progress(self, folder_path: str):
        """Index folder with streaming progress updates"""
        folder_path = os.path.abspath(folder_path)
        logger.info(f"Starting indexing of {folder_path}")
        
        # Find all supported files
        files = self._discover_files(folder_path)
        total_files = len(files)
        
        yield {
            'type': 'discovery',
            'total_files': total_files,
            'folder': folder_path
        }
        
        if not files:
            return
        
        # Delete existing documents from this folder
        self.vector_store.delete_by_folder(folder_path)
        
        # Process each file with progress
        all_chunks = []
        for idx, file_path in enumerate(files):
            file_name = os.path.basename(file_path)
            try:
                chunks = await self._process_file(file_path, folder_path)
                all_chunks.extend(chunks)
                yield {
                    'type': 'file_done',
                    'file': file_name,
                    'file_path': file_path,
                    'chunks': len(chunks),
                    'current': idx + 1,
                    'total': total_files,
                    'percent': round((idx + 1) / total_files * 100)
                }
            except Exception as e:
                logger.error(f"Failed to process {file_path}: {e}")
                yield {
                    'type': 'file_error',
                    'file': file_name,
                    'file_path': file_path,
                    'error': str(e),
                    'current': idx + 1,
                    'total': total_files
                }
        
        if not all_chunks:
            return
        
        # Generate embeddings
        yield {'type': 'embedding', 'status': 'Generating embeddings...', 'total_chunks': len(all_chunks)}
        
        texts = [chunk["text"] for chunk in all_chunks]
        embeddings = await self.ollama.generate_embeddings_batch(texts)
        
        # Filter valid
        valid_chunks = []
        valid_embeddings = []
        for chunk, embedding in zip(all_chunks, embeddings):
            if embedding:
                valid_chunks.append(chunk)
                valid_embeddings.append(embedding)
        
        if valid_chunks:
            yield {'type': 'embedding', 'status': 'Saving to database...', 'valid_chunks': len(valid_chunks)}
            
            ids = [chunk["id"] for chunk in valid_chunks]
            documents = [chunk["text"] for chunk in valid_chunks]
            metadatas = [chunk["metadata"] for chunk in valid_chunks]
            
            self.vector_store.add_documents(ids, valid_embeddings, documents, metadatas)
        
        logger.info(f"Indexed {len(valid_chunks)} chunks from {total_files} files")
    
    def _discover_files(self, folder_path: str) -> List[str]:
        """Discover all supported files in a folder"""
        files = []
        
        for root, dirs, filenames in os.walk(folder_path):
            # Skip hidden directories
            dirs[:] = [d for d in dirs if not d.startswith('.')]
            
            for filename in filenames:
                if filename.startswith('.'):
                    continue
                    
                ext = os.path.splitext(filename)[1].lower()
                if ext in SUPPORTED_EXTENSIONS:
                    files.append(os.path.join(root, filename))
        
        return files
    
    async def _process_file(self, file_path: str, folder_path: str) -> List[Dict]:
        """Process a single file into chunks"""
        ext = os.path.splitext(file_path)[1].lower()
        
        try:
            # Get file content based on type
            if ext == '.pdf':
                content = self.pdf_parser.parse(file_path)
            elif ext in {'.md', '.markdown'}:
                content = self.markdown_parser.parse(file_path)
            else:
                content = self.code_parser.parse(file_path)
            
            if not content.strip():
                return []
            
            # Chunk the content
            chunks_text = self._chunk_text(content)
            
            # Create chunk metadata
            file_stat = os.stat(file_path)
            base_metadata = {
                "file_path": file_path,
                "folder_path": folder_path,
                "file_name": os.path.basename(file_path),
                "file_type": ext[1:],  # Remove the dot
                "modified_at": datetime.fromtimestamp(file_stat.st_mtime).isoformat(),
                "indexed_at": datetime.now().isoformat(),
            }
            
            # Create chunk objects
            chunks = []
            for i, chunk_text in enumerate(chunks_text):
                chunk_id = self._generate_chunk_id(file_path, i)
                chunks.append({
                    "id": chunk_id,
                    "text": chunk_text,
                    "metadata": {
                        **base_metadata,
                        "chunk_index": i,
                        "total_chunks": len(chunks_text),
                    }
                })
            
            return chunks
            
        except Exception as e:
            logger.error(f"Error processing {file_path}: {e}")
            return []
    
    def _chunk_text(self, text: str) -> List[str]:
        """Split text into overlapping chunks"""
        if len(text) <= MAX_CHUNK_SIZE:
            return [text]
        
        chunks = []
        start = 0
        
        while start < len(text):
            # Find the end of this chunk
            end = start + MAX_CHUNK_SIZE
            
            if end >= len(text):
                chunks.append(text[start:])
                break
            
            # Try to break at a natural boundary (newline, period, space)
            for sep in ['\n\n', '\n', '. ', ' ']:
                last_sep = text.rfind(sep, start, end)
                if last_sep > start:
                    end = last_sep + len(sep)
                    break
            
            chunks.append(text[start:end])
            start = end - CHUNK_OVERLAP
        
        return chunks
    
    def _generate_chunk_id(self, file_path: str, chunk_index: int) -> str:
        """Generate a unique ID for a chunk"""
        content = f"{file_path}:{chunk_index}"
        return hashlib.md5(content.encode()).hexdigest()
