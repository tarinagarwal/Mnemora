# Mnemora Setup Guide

## Prerequisites

1. **Node.js 18+** - [Download](https://nodejs.org/)
2. **Python 3.10+** - [Download](https://python.org/)
3. **Ollama** - [Download](https://ollama.ai/download)

---

## Installation

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone https://github.com/yourusername/mnemora.git
cd mnemora

# Install Node.js dependencies
npm install

# Install Python dependencies
cd backend
pip install -r requirements.txt
cd ..
```

---

## Running Mnemora

You need **2 terminals** running:

### Terminal 1: Ollama
```bash
ollama serve
```
> Keep this running. Ollama provides the local AI models.

### Terminal 2: Python Backend
```bash
cd backend
python main.py
```
> You should see: `Mnemora backend ready!`

### Terminal 3: Frontend + Electron (Single Command)
```bash
npm run electron
```
> This starts both Vite dev server and Electron app together.

---

**Web-only mode** (without Electron desktop app):
```bash
npm run dev
# Open http://localhost:5173 in browser
```

---

## First Run - Automatic Model Setup

On first launch, Mnemora will:

1. ✅ Check if Ollama is running
2. ✅ Check for required AI models
3. ✅ Offer to download missing models automatically

### Required Models

| Model | Purpose | Size |
|-------|---------|------|
| `llama3.2:3b` | Chat responses | ~2GB |
| `nomic-embed-text` | Document search | ~275MB |

### Manual Model Download (Optional)

If you prefer to download models manually:
```bash
ollama pull llama3.2:3b
ollama pull nomic-embed-text
```

---

## Troubleshooting

### "Install Ollama" shows even though Ollama is installed
→ Ollama needs to be **running**. Start it with `ollama serve`

### Port 8000 already in use
→ Another Python process is using the port. Kill it or restart your terminal.

### Tailwind/CSS errors
→ Run `npm install` again to ensure all dependencies installed.

### Python import errors
→ Run `pip install -r requirements.txt` in the backend folder.

---

## Quick Start Checklist

- [ ] Node.js installed
- [ ] Python installed
- [ ] Ollama installed
- [ ] `npm install` completed
- [ ] `pip install -r requirements.txt` completed
- [ ] Ollama running (`ollama serve`)
- [ ] Python backend running (`python main.py`)
- [ ] Frontend running (`npm run dev`)
