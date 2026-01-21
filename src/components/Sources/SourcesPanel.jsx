import { X, FileText, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { useAppStore } from '../../stores/appStore'

export default function SourcesPanel() {
  const { currentSources, setShowSources } = useAppStore()

  return (
    <aside className="w-80 h-full flex flex-col bg-surface-900 border-l border-surface-800">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-surface-800">
        <h2 className="font-medium text-surface-200">Sources</h2>
        <button
          onClick={() => setShowSources(false)}
          className="p-1 rounded-lg hover:bg-surface-800 text-surface-400 hover:text-surface-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Sources List */}
      <div className="flex-1 overflow-y-auto p-3">
        {currentSources.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-surface-700 mx-auto mb-3" />
            <p className="text-sm text-surface-500">No sources yet</p>
            <p className="text-xs text-surface-600 mt-1">
              Sources will appear here when you chat
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {currentSources.map((source, index) => (
              <SourceCard key={index} source={source} index={index + 1} />
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}

function SourceCard({ source, index }) {
  const [expanded, setExpanded] = useState(false)
  const fileName = source.file_path.split(/[/\\]/).pop()
  
  const handleOpenFile = () => {
    // In Electron, this will use shell.openPath
    if (window.electronAPI?.openFile) {
      window.electronAPI.openFile(source.file_path)
    }
  }

  return (
    <div className="rounded-xl bg-surface-800 border border-surface-700/50 overflow-hidden">
      {/* Header */}
      <div 
        className="flex items-start gap-2 p-3 cursor-pointer hover:bg-surface-750"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="w-6 h-6 rounded-md bg-mnemora-500/20 text-mnemora-400 flex items-center justify-center text-xs font-medium flex-shrink-0">
          {index}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-surface-200 truncate" title={fileName}>
            {fileName}
          </p>
          <p className="text-xs text-surface-500 truncate" title={source.file_path}>
            {source.file_path}
          </p>
          {source.score !== undefined && (
            <div className="flex items-center gap-1 mt-1">
              <div className="h-1.5 w-16 bg-surface-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-mnemora-500"
                  style={{ width: `${Math.min(source.score * 100, 100)}%` }}
                />
              </div>
              <span className="text-xs text-surface-500">
                {Math.round(source.score * 100)}% match
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); handleOpenFile() }}
            className="p-1 rounded hover:bg-surface-700 text-surface-500 hover:text-mnemora-400"
            title="Open file"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-surface-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-surface-500" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && source.content && (
        <div className="px-3 pb-3">
          <div className="p-3 rounded-lg bg-surface-850 text-xs text-surface-300 font-mono max-h-48 overflow-y-auto">
            <pre className="whitespace-pre-wrap">{source.content}</pre>
          </div>
        </div>
      )}
    </div>
  )
}
