"""
Code Parser - processes source code files
"""
import logging
import os
import re
from typing import Optional

logger = logging.getLogger(__name__)

# Language-specific comment patterns
COMMENT_PATTERNS = {
    'python': {
        'single': r'#.*$',
        'multi_start': r'"""',
        'multi_end': r'"""',
    },
    'javascript': {
        'single': r'//.*$',
        'multi_start': r'/\*',
        'multi_end': r'\*/',
    },
    'java': {
        'single': r'//.*$',
        'multi_start': r'/\*',
        'multi_end': r'\*/',
    },
}

# Extension to language mapping
EXT_TO_LANG = {
    '.py': 'python',
    '.js': 'javascript',
    '.ts': 'javascript',
    '.jsx': 'javascript',
    '.tsx': 'javascript',
    '.java': 'java',
    '.cpp': 'java',
    '.c': 'java',
    '.h': 'java',
    '.go': 'java',
    '.rs': 'java',
    '.swift': 'java',
    '.kt': 'java',
}


class CodeParser:
    """Parse source code files with syntax awareness"""
    
    def __init__(self):
        pass
    
    def parse(self, file_path: str) -> str:
        """Parse a code file and return formatted content"""
        try:
            ext = os.path.splitext(file_path)[1].lower()
            
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            # Get language
            lang = EXT_TO_LANG.get(ext, 'unknown')
            
            # Add file context
            file_name = os.path.basename(file_path)
            formatted = f"[File: {file_name}]\n[Language: {lang}]\n\n{content}"
            
            # Extract important structures if possible
            try:
                structures = self._extract_structures(content, lang, ext)
                if structures:
                    formatted = f"{formatted}\n\n[Structures: {structures}]"
            except Exception as struct_error:
                logger.warning(f"Could not extract structures from {file_path}: {struct_error}")
            
            return formatted.strip()
            
        except Exception as e:
            logger.error(f"Error parsing code file {file_path}: {e}", exc_info=True)
            return ""
    
    def _extract_structures(self, content: str, lang: str, ext: str) -> str:
        """Extract class and function definitions"""
        structures = []
        
        if lang == 'python':
            # Find class definitions
            classes = re.findall(r'^class\s+(\w+)', content, re.MULTILINE)
            structures.extend([f"class {c}" for c in classes])
            
            # Find function definitions  
            functions = re.findall(r'^def\s+(\w+)', content, re.MULTILINE)
            structures.extend([f"def {f}" for f in functions])
            
        elif lang == 'javascript':
            # Find class definitions
            classes = re.findall(r'class\s+(\w+)', content)
            structures.extend([f"class {c}" for c in classes])
            
            # Find function definitions
            functions = re.findall(r'function\s+(\w+)', content)
            structures.extend([f"function {f}" for f in functions])
            
            # Find arrow functions assigned to const/let
            arrow_funcs = re.findall(r'(?:const|let)\s+(\w+)\s*=\s*(?:async\s*)?\(', content)
            structures.extend([f"const {f}" for f in arrow_funcs])
            
        elif lang == 'java':
            # Find class definitions
            classes = re.findall(r'class\s+(\w+)', content)
            structures.extend([f"class {c}" for c in classes])
            
            # Find method definitions (simplified)
            methods = re.findall(r'(?:public|private|protected)?\s*(?:static)?\s*\w+\s+(\w+)\s*\(', content)
            structures.extend([f"method {m}" for m in methods if m not in ['if', 'for', 'while', 'switch']])
        
        return ', '.join(structures[:20]) if structures else ""
    
    def parse_with_line_numbers(self, file_path: str) -> str:
        """Parse code file with line numbers for reference"""
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                lines = f.readlines()
            
            numbered_lines = []
            for i, line in enumerate(lines, 1):
                numbered_lines.append(f"{i:4d} | {line.rstrip()}")
            
            return '\n'.join(numbered_lines)
            
        except Exception as e:
            logger.error(f"Error parsing code file {file_path}: {e}")
            return ""
