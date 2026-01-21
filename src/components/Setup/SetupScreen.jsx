import { useState, useEffect } from 'react'
import { Download, ExternalLink, CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react'

const API_BASE = 'http://localhost:8000'

export default function SetupScreen({ onComplete }) {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pulling, setPulling] = useState(null) // 'llm' | 'embedding' | null
  const [pullProgress, setPullProgress] = useState({})
  const [error, setError] = useState(null)

  const checkStatus = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`${API_BASE}/setup/status`)
      if (!response.ok) throw new Error('Backend not running')
      const data = await response.json()
      setStatus(data)
      
      if (data.ready) {
        setTimeout(() => onComplete(), 1000)
      }
    } catch (err) {
      setError('Cannot connect to Mnemora backend. Make sure Python backend is running.')
      setStatus(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkStatus()
    const interval = setInterval(checkStatus, 5000)
    return () => clearInterval(interval)
  }, [])

  const pullModel = async (modelName, type) => {
    setPulling(type)
    setPullProgress({ status: 'Starting download...', percent: 0 })

    try {
      const response = await fetch(`${API_BASE}/setup/pull-model`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_name: modelName })
      })

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(line => line.startsWith('data: '))

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6))
            
            if (data.status === 'error') {
              setError(data.message)
              setPulling(null)
              return
            }
            
            // Calculate progress
            let percent = 0
            if (data.total && data.completed) {
              percent = Math.round((data.completed / data.total) * 100)
            }
            
            setPullProgress({
              status: data.status || 'Downloading...',
              percent,
              digest: data.digest?.slice(0, 12)
            })
          } catch (e) {
            // Ignore parse errors
          }
        }
      }

      setPulling(null)
      setPullProgress({})
      checkStatus()
    } catch (err) {
      setError(`Failed to pull model: ${err.message}`)
      setPulling(null)
    }
  }

  if (loading && !status) {
    return (
      <div className="h-full flex items-center justify-center bg-surface-950">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-mnemora-400 animate-spin mx-auto mb-4" />
          <p className="text-surface-300">Checking setup status...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex items-center justify-center bg-surface-950 p-8">
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-mnemora-500 to-mnemora-700 flex items-center justify-center glow-md">
            <Download className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-surface-100 mb-2">Setup Mnemora</h1>
          <p className="text-surface-400">Let's get your local AI ready</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Error</p>
              <p className="text-sm opacity-80">{error}</p>
            </div>
          </div>
        )}

        {/* Backend Connection Error */}
        {!status && !loading && (
          <SetupCard
            title="Backend Not Running"
            description="Start the Python backend first"
            status="error"
          >
            <div className="text-sm text-surface-400 space-y-2">
              <p>Run this command in the backend folder:</p>
              <code className="block bg-surface-800 p-3 rounded-lg text-mnemora-300 font-mono text-xs">
                cd backend && python main.py
              </code>
              <button
                onClick={checkStatus}
                className="mt-4 px-4 py-2 rounded-lg bg-mnemora-600 hover:bg-mnemora-500 text-white text-sm transition-colors"
              >
                Retry Connection
              </button>
            </div>
          </SetupCard>
        )}

        {status && !status.ollama_running && (
          <SetupCard
            title="Install Ollama"
            description="Ollama is required for local AI inference"
            status="warning"
          >
            <div className="space-y-4">
              <p className="text-sm text-surface-400">
                Ollama lets you run AI models locally on your computer.
              </p>
              <a
                href="https://ollama.ai/download"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-mnemora-600 hover:bg-mnemora-500 text-white text-sm transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Download Ollama
              </a>
              <p className="text-xs text-surface-500">
                After installing, start Ollama and click "Retry" below.
              </p>
              <button
                onClick={checkStatus}
                className="px-4 py-2 rounded-lg bg-surface-700 hover:bg-surface-600 text-surface-200 text-sm transition-colors"
              >
                Retry Connection
              </button>
            </div>
          </SetupCard>
        )}

        {status && status.ollama_running && (
          <div className="space-y-4">
            {/* LLM Status */}
            <SetupCard
              title="Chat Model"
              description={status.has_llm ? `Using ${status.installed_llm}` : 'Required for chat responses'}
              status={status.has_llm ? 'success' : 'pending'}
            >
              {!status.has_llm && (
                <div className="space-y-3">
                  {pulling === 'llm' ? (
                    <PullProgress progress={pullProgress} />
                  ) : (
                    <button
                      onClick={() => pullModel(status.recommended_llm, 'llm')}
                      disabled={pulling !== null}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-mnemora-600 hover:bg-mnemora-500 disabled:opacity-50 text-white text-sm transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download {status.recommended_llm}
                    </button>
                  )}
                  <p className="text-xs text-surface-500 text-center">
                    ~2GB download, may take a few minutes
                  </p>
                </div>
              )}
            </SetupCard>

            {/* Embedding Status */}
            <SetupCard
              title="Embedding Model"
              description={status.has_embedding ? `Using ${status.installed_embedding}` : 'Required for document search'}
              status={status.has_embedding ? 'success' : 'pending'}
            >
              {!status.has_embedding && (
                <div className="space-y-3">
                  {pulling === 'embedding' ? (
                    <PullProgress progress={pullProgress} />
                  ) : (
                    <button
                      onClick={() => pullModel(status.recommended_embedding, 'embedding')}
                      disabled={pulling !== null}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-mnemora-600 hover:bg-mnemora-500 disabled:opacity-50 text-white text-sm transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download {status.recommended_embedding}
                    </button>
                  )}
                  <p className="text-xs text-surface-500 text-center">
                    ~275MB download
                  </p>
                </div>
              )}
            </SetupCard>

            {/* Ready State */}
            {status.ready && (
              <div className="text-center mt-6 p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-green-300 font-medium">All set! Starting Mnemora...</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function SetupCard({ title, description, status, children }) {
  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-400" />,
    error: <XCircle className="w-5 h-5 text-red-400" />,
    warning: <AlertTriangle className="w-5 h-5 text-yellow-400" />,
    pending: <div className="w-5 h-5 rounded-full border-2 border-surface-600" />,
  }

  return (
    <div className="p-4 rounded-xl bg-surface-900 border border-surface-800">
      <div className="flex items-start gap-3 mb-3">
        <div className="mt-0.5">{icons[status]}</div>
        <div>
          <h3 className="font-medium text-surface-100">{title}</h3>
          <p className="text-sm text-surface-400">{description}</p>
        </div>
      </div>
      {children && <div className="ml-8">{children}</div>}
    </div>
  )
}

function PullProgress({ progress }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-surface-300">{progress.status}</span>
        {progress.percent > 0 && (
          <span className="text-mnemora-400">{progress.percent}%</span>
        )}
      </div>
      <div className="h-2 bg-surface-800 rounded-full overflow-hidden">
        <div 
          className="h-full bg-mnemora-500 transition-all duration-300"
          style={{ width: `${progress.percent || 0}%` }}
        />
      </div>
      {progress.digest && (
        <p className="text-xs text-surface-500 font-mono">{progress.digest}</p>
      )}
    </div>
  )
}
