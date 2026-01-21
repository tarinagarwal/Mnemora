import ReactMarkdown from 'react-markdown'
import { User, Bot, AlertCircle, FileText } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user'
  const { setShowSources } = useAppStore()

  return (
    <div className={`flex gap-3 animate-slide-up ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
        isUser 
          ? 'bg-surface-700' 
          : message.isError 
            ? 'bg-red-500/20' 
            : 'bg-gradient-to-br from-mnemora-500 to-mnemora-700'
      }`}>
        {isUser ? (
          <User className="w-4 h-4 text-surface-300" />
        ) : message.isError ? (
          <AlertCircle className="w-4 h-4 text-red-400" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 max-w-[85%] ${isUser ? 'text-right' : ''}`}>
        <div className={`inline-block text-left rounded-2xl px-4 py-3 ${
          isUser 
            ? 'bg-mnemora-600 text-white rounded-tr-md' 
            : message.isError
              ? 'bg-red-500/10 border border-red-500/30 text-red-200'
              : 'bg-surface-800 text-surface-100 rounded-tl-md'
        }`}>
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="markdown-content">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Source Citations */}
        {message.sources && message.sources.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {message.sources.slice(0, 3).map((source, idx) => (
              <button
                key={idx}
                onClick={() => setShowSources(true)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-surface-800/50 hover:bg-surface-800 border border-surface-700/50 text-xs text-surface-400 hover:text-mnemora-400 transition-colors"
                title={source.file_path}
              >
                <FileText className="w-3 h-3" />
                <span className="truncate max-w-[120px]">
                  {source.file_path.split(/[/\\]/).pop()}
                </span>
              </button>
            ))}
            {message.sources.length > 3 && (
              <button
                onClick={() => setShowSources(true)}
                className="px-2 py-1 rounded-md bg-surface-800/50 hover:bg-surface-800 text-xs text-surface-400 hover:text-mnemora-400"
              >
                +{message.sources.length - 3} more
              </button>
            )}
          </div>
        )}

        {/* Timestamp */}
        <p className="text-xs text-surface-600 mt-1">
          {new Date(message.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </p>
      </div>
    </div>
  )
}
