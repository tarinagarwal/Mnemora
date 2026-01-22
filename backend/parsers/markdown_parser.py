"""
Markdown Parser with Obsidian-aware features
"""
import logging
import os
import re
from typing import Optional

logger = logging.getLogger(__name__)


class MarkdownParser:
    """Parse Markdown files with Obsidian-aware processing"""
    
    def __init__(self):
        # Regex patterns for Obsidian features
        self.wikilink_pattern = re.compile(r'\[\[([^\]|]+)(?:\|([^\]]+))?\]\]')
        self.tag_pattern = re.compile(r'(?<!\S)#([a-zA-Z][a-zA-Z0-9_/-]*)')
        self.frontmatter_pattern = re.compile(r'^---\s*\n(.*?)\n---\s*\n', re.DOTALL)
    
    def parse(self, file_path: str) -> str:
        """Parse a Markdown file and return clean text content"""
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            # Process the content
            content = self._process_content(content)
            
            return content.strip()
            
        except Exception as e:
            logger.error(f"Error parsing markdown {file_path}: {e}", exc_info=True)
            return ""
    
    def _process_content(self, content: str) -> str:
        """Process Markdown content with Obsidian-aware features"""
        # Extract and note frontmatter
        frontmatter = None
        frontmatter_match = self.frontmatter_pattern.match(content)
        if frontmatter_match:
            frontmatter = frontmatter_match.group(1)
            content = content[frontmatter_match.end():]
        
        # Convert [[wiki-links]] to plain text
        content = self._convert_wikilinks(content)
        
        # Keep tags as-is (they provide useful context)
        
        # Clean up excessive whitespace
        content = re.sub(r'\n{3,}', '\n\n', content)
        
        # If there was frontmatter with useful info, prepend it
        if frontmatter:
            frontmatter_text = self._process_frontmatter(frontmatter)
            if frontmatter_text:
                content = f"[Metadata: {frontmatter_text}]\n\n{content}"
        
        return content
    
    def _convert_wikilinks(self, content: str) -> str:
        """Convert [[wiki-links]] to plain text"""
        def replace_wikilink(match):
            link_text = match.group(1)
            display_text = match.group(2) if match.group(2) else link_text
            return display_text
        
        return self.wikilink_pattern.sub(replace_wikilink, content)
    
    def _process_frontmatter(self, frontmatter: str) -> str:
        """Extract useful info from YAML frontmatter"""
        useful_keys = ['title', 'tags', 'topics', 'summary', 'description', 'author', 'date']
        parts = []
        
        for line in frontmatter.split('\n'):
            line = line.strip()
            if ':' in line:
                key, value = line.split(':', 1)
                key = key.strip().lower()
                value = value.strip()
                
                if key in useful_keys and value:
                    # Clean up array notation
                    value = re.sub(r'[\[\]]', '', value)
                    parts.append(f"{key}: {value}")
        
        return ', '.join(parts)
    
    def extract_tags(self, content: str) -> list:
        """Extract all #tags from content"""
        return self.tag_pattern.findall(content)
    
    def extract_wikilinks(self, content: str) -> list:
        """Extract all [[wiki-links]] from content"""
        return [match.group(1) for match in self.wikilink_pattern.finditer(content)]
