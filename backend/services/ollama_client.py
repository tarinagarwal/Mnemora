"""
Ollama API Client for embeddings and chat completion
"""
import asyncio
import logging
from typing import AsyncGenerator, List, Optional

import httpx

logger = logging.getLogger(__name__)

OLLAMA_BASE_URL = "http://localhost:11434"


class OllamaClient:
    """Client for interacting with Ollama API"""
    
    def __init__(self, base_url: str = OLLAMA_BASE_URL):
        self.base_url = base_url
        self.default_embedding_model = "nomic-embed-text"
        self.timeout = httpx.Timeout(60.0, connect=10.0)
    
    async def check_health(self) -> bool:
        """Check if Ollama is running and responsive"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(f"{self.base_url}/api/tags")
                return response.status_code == 200
        except Exception as e:
            logger.warning(f"Ollama health check failed: {e}")
            return False
    
    async def list_models(self) -> List[dict]:
        """List available Ollama models"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(f"{self.base_url}/api/tags")
                if response.status_code == 200:
                    data = response.json()
                    return data.get("models", [])
                return []
        except Exception as e:
            logger.error(f"Failed to list models: {e}")
            return []
    
    async def check_model_exists(self, model_name: str) -> bool:
        """Check if a specific model is installed"""
        models = await self.list_models()
        # Check both exact match and base name (e.g., "llama3.2:3b" or "llama3.2")
        for model in models:
            name = model.get("name", "")
            if name == model_name or name.startswith(model_name.split(":")[0]):
                return True
        return False
    
    async def pull_model(self, model_name: str) -> AsyncGenerator[dict, None]:
        """Pull/download a model from Ollama registry with progress"""
        logger.info(f"Starting to pull model: {model_name}")
        
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(600.0)) as client:
                async with client.stream(
                    "POST",
                    f"{self.base_url}/api/pull",
                    json={"name": model_name, "stream": True}
                ) as response:
                    if response.status_code != 200:
                        yield {"status": "error", "message": f"Failed to pull model: {response.status_code}"}
                        return
                    
                    async for line in response.aiter_lines():
                        if line:
                            try:
                                import json
                                data = json.loads(line)
                                yield data
                            except Exception:
                                continue
        except Exception as e:
            logger.error(f"Error pulling model {model_name}: {e}")
            yield {"status": "error", "message": str(e)}
    
    async def get_required_models_status(self) -> dict:
        """Check status of required models for Mnemora"""
        required = {
            "llm": ["llama3.2:3b", "llama3.2:1b", "mistral:7b", "phi3:mini"],  # Any one of these
            "embedding": ["nomic-embed-text", "mxbai-embed-large", "all-minilm"]  # Any one of these
        }
        
        models = await self.list_models()
        model_names = [m.get("name", "") for m in models]
        
        # Check for LLM
        has_llm = False
        installed_llm = None
        for llm in required["llm"]:
            for name in model_names:
                if name.startswith(llm.split(":")[0]):
                    has_llm = True
                    installed_llm = name
                    break
            if has_llm:
                break
        
        # Check for embedding model
        has_embedding = False
        installed_embedding = None
        for emb in required["embedding"]:
            for name in model_names:
                if name.startswith(emb.split(":")[0]):
                    has_embedding = True
                    installed_embedding = name
                    break
            if has_embedding:
                break
        
        return {
            "has_llm": has_llm,
            "installed_llm": installed_llm,
            "has_embedding": has_embedding,
            "installed_embedding": installed_embedding,
            "ready": has_llm and has_embedding,
            "recommended_llm": "llama3.2:3b",
            "recommended_embedding": "nomic-embed-text"
        }
    
    async def generate_embedding(self, text: str, model: Optional[str] = None) -> List[float]:
        """Generate embedding for a single text"""
        model = model or self.default_embedding_model
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/api/embeddings",
                    json={"model": model, "prompt": text}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return data.get("embedding", [])
                else:
                    logger.error(f"Embedding failed: {response.text}")
                    return []
        except Exception as e:
            logger.error(f"Embedding error: {e}")
            return []
    
    async def generate_embeddings_batch(
        self, 
        texts: List[str], 
        model: Optional[str] = None,
        batch_size: int = 10
    ) -> List[List[float]]:
        """Generate embeddings for multiple texts in batches"""
        model = model or self.default_embedding_model
        embeddings = []
        
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            batch_embeddings = await asyncio.gather(
                *[self.generate_embedding(text, model) for text in batch]
            )
            embeddings.extend(batch_embeddings)
        
        return embeddings
    
    async def chat_stream(
        self,
        prompt: str,
        model: str = "llama3.2:3b",
        system_prompt: Optional[str] = None,
        context: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """Stream chat completion responses"""
        
        messages = []
        
        # System prompt
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        
        # Add context as system message if provided
        if context:
            messages.append({
                "role": "system", 
                "content": f"Use the following context to answer the user's question:\n\n{context}"
            })
        
        # User message
        messages.append({"role": "user", "content": prompt})
        
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(120.0)) as client:
                async with client.stream(
                    "POST",
                    f"{self.base_url}/api/chat",
                    json={
                        "model": model,
                        "messages": messages,
                        "stream": True
                    }
                ) as response:
                    if response.status_code != 200:
                        yield f"Error: {response.status_code}"
                        return
                    
                    async for line in response.aiter_lines():
                        if line:
                            try:
                                import json
                                data = json.loads(line)
                                if "message" in data and "content" in data["message"]:
                                    yield data["message"]["content"]
                            except Exception:
                                continue
        
        except Exception as e:
            logger.error(f"Chat stream error: {e}")
            yield f"Error: {str(e)}"
    
    async def chat(
        self,
        prompt: str,
        model: str = "llama3.2:3b",
        system_prompt: Optional[str] = None,
        context: Optional[str] = None
    ) -> str:
        """Non-streaming chat completion"""
        full_response = ""
        async for token in self.chat_stream(prompt, model, system_prompt, context):
            full_response += token
        return full_response
