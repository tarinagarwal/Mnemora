"""
PDF Parser using PyMuPDF
"""
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class PDFParser:
    """Parse PDF files and extract text content"""
    
    def __init__(self):
        self._fitz = None
    
    @property
    def fitz(self):
        """Lazy load PyMuPDF"""
        if self._fitz is None:
            try:
                import fitz
                self._fitz = fitz
            except ImportError:
                logger.error("PyMuPDF (fitz) not installed. Install with: pip install pymupdf")
                raise
        return self._fitz
    
    def parse(self, file_path: str) -> str:
        """Parse a PDF file and return text content"""
        try:
            doc = self.fitz.open(file_path)
            text_parts = []
            
            for page_num, page in enumerate(doc, 1):
                # Extract text from page
                text = page.get_text()
                
                if text.strip():
                    # Add page marker for context
                    text_parts.append(f"[Page {page_num}]\n{text}")
            
            doc.close()
            
            # Join all pages
            content = "\n\n".join(text_parts)
            
            # Clean up excessive whitespace
            content = self._clean_text(content)
            
            return content.strip()
            
        except Exception as e:
            logger.error(f"Error parsing PDF {file_path}: {e}", exc_info=True)
            return ""
    
    def _clean_text(self, text: str) -> str:
        """Clean up extracted PDF text"""
        import re
        
        # Remove excessive whitespace
        text = re.sub(r'[ \t]+', ' ', text)
        text = re.sub(r'\n{3,}', '\n\n', text)
        
        # Fix common PDF extraction issues
        # - Hyphenation at line breaks
        text = re.sub(r'-\s*\n\s*', '', text)
        
        return text
    
    def get_metadata(self, file_path: str) -> dict:
        """Extract PDF metadata"""
        try:
            doc = self.fitz.open(file_path)
            metadata = doc.metadata
            page_count = len(doc)
            doc.close()
            
            return {
                "title": metadata.get("title", ""),
                "author": metadata.get("author", ""),
                "subject": metadata.get("subject", ""),
                "page_count": page_count,
            }
        except Exception as e:
            logger.error(f"Error extracting PDF metadata: {e}")
            return {}
