import { useEffect } from 'react'
import { X, Cpu, Palette, Database, RefreshCw } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'

export default function SettingsModal({ onClose }) {
  const { 
    availableModels, 
    selectedModel, 
    setSelectedModel, 
    fetchModels,
    theme,
    setTheme,
    folders,
  } = useAppStore()

  useEffect(() => {
    fetchModels()
  }, [fetchModels])

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-surface-900 rounded-2xl border border-surface-700 shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-800">
          <h2 className="text-lg font-semibold text-surface-100">Settings</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-800 text-surface-400 hover:text-surface-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Model Selection */}
          <SettingsSection
            icon={<Cpu className="w-5 h-5" />}
            title="AI Model"
            description="Select the Ollama model for chat responses"
          >
            <div className="flex items-center gap-2">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="flex-1 bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-surface-200 outline-none focus:border-mnemora-500"
              >
                {availableModels.length === 0 ? (
                  <option value={selectedModel}>{selectedModel}</option>
                ) : (
                  availableModels.map((model) => (
                    <option key={model.name} value={model.name}>
                      {model.name} ({formatSize(model.size)})
                    </option>
                  ))
                )}
              </select>
              <button
                onClick={fetchModels}
                className="p-2 rounded-lg bg-surface-800 hover:bg-surface-700 text-surface-400 hover:text-surface-200 transition-colors"
                title="Refresh models"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-surface-500 mt-2">
              Run <code className="bg-surface-800 px-1 rounded">ollama pull modelname</code> to download more models
            </p>
          </SettingsSection>

          {/* Theme */}
          <SettingsSection
            icon={<Palette className="w-5 h-5" />}
            title="Appearance"
            description="Choose your preferred theme"
          >
            <div className="flex gap-2">
              <ThemeButton 
                active={theme === 'dark'} 
                onClick={() => setTheme('dark')}
                label="Dark"
              />
              <ThemeButton 
                active={theme === 'light'} 
                onClick={() => setTheme('light')}
                label="Light"
                disabled
              />
            </div>
          </SettingsSection>

          {/* Storage Info */}
          <SettingsSection
            icon={<Database className="w-5 h-5" />}
            title="Storage"
            description="Information about your indexed data"
          >
            <div className="grid grid-cols-2 gap-4">
              <StatCard label="Indexed Folders" value={folders.length} />
              <StatCard 
                label="Total Documents" 
                value={folders.reduce((acc, f) => acc + (f.documentCount || 0), 0)} 
              />
            </div>
          </SettingsSection>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-surface-800 text-sm text-surface-500">
          <span>Mnemora v0.1.0</span>
          <a 
            href="https://github.com/yourusername/mnemora" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-mnemora-400"
          >
            GitHub
          </a>
        </div>
      </div>
    </div>
  )
}

function SettingsSection({ icon, title, description, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-mnemora-400">{icon}</span>
        <div>
          <h3 className="font-medium text-surface-200">{title}</h3>
          <p className="text-xs text-surface-500">{description}</p>
        </div>
      </div>
      <div className="ml-7">{children}</div>
    </div>
  )
}

function ThemeButton({ active, onClick, label, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 px-4 py-2 rounded-lg border transition-all ${
        active 
          ? 'bg-mnemora-600 border-mnemora-500 text-white' 
          : 'bg-surface-800 border-surface-700 text-surface-300 hover:bg-surface-750'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {label}
    </button>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="bg-surface-800 rounded-lg p-3 text-center">
      <p className="text-2xl font-semibold text-surface-100">{value}</p>
      <p className="text-xs text-surface-500">{label}</p>
    </div>
  )
}

function formatSize(bytes) {
  if (!bytes) return 'Unknown'
  const gb = bytes / (1024 * 1024 * 1024)
  return gb >= 1 ? `${gb.toFixed(1)}GB` : `${(bytes / (1024 * 1024)).toFixed(0)}MB`
}
