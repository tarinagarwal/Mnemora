import { useState, useRef, useEffect } from 'react'
import { Send, StopCircle, Sparkles } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import MessageBubble from './MessageBubble'

export default function ChatView() {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const { messages, isGenerating, sendMessage, folders } = useAppStore()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!input.trim() || isGenerating) return
    sendMessage(input.trim())
    setInput('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const hasNoFolders = folders.length === 0

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <EmptyState hasNoFolders={hasNoFolders} />
        ) : (
          <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
            {messages.map((message, index) => (
              <MessageBubble key={index} message={message} />
            ))}
            {isGenerating && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="flex items-center gap-2 text-surface-400">
                <div className="typing-indicator flex gap-1">
                  <span className="w-2 h-2 bg-mnemora-400 rounded-full" />
                  <span className="w-2 h-2 bg-mnemora-400 rounded-full" />
                  <span className="w-2 h-2 bg-mnemora-400 rounded-full" />
                </div>
                <span className="text-sm">Thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-surface-800 p-4">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="relative flex items-end gap-2 p-2 rounded-2xl bg-surface-800 border border-surface-700 focus-within:border-mnemora-500/50 focus-within:glow-sm transition-all">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={hasNoFolders ? "Add a folder to start chatting..." : "Ask anything about your files..."}
              disabled={hasNoFolders || isGenerating}
              className="flex-1 bg-transparent resize-none outline-none text-surface-100 placeholder-surface-500 px-2 py-1 max-h-32 min-h-[40px]"
              rows={1}
              style={{
                height: 'auto',
                minHeight: '40px',
              }}
              onInput={(e) => {
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px'
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isGenerating || hasNoFolders}
              className="flex-shrink-0 p-2 rounded-xl bg-mnemora-600 hover:bg-mnemora-500 disabled:bg-surface-700 disabled:text-surface-500 text-white transition-colors"
            >
              {isGenerating ? (
                <StopCircle className="w-5 h-5" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          <p className="text-xs text-surface-500 mt-2 text-center">
            Mnemora uses local AI - your data never leaves your computer
          </p>
        </form>
      </div>
    </div>
  )
}

function EmptyState({ hasNoFolders }) {
  const suggestions = [
    "What are the main themes in my notes?",
    "Summarize the PDF I added yesterday",
    "Find all mentions of 'authentication' in my code",
    "What did I write about project planning?",
  ]

  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="text-center max-w-lg animate-fade-in">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-mnemora-500 to-mnemora-700 flex items-center justify-center glow-md">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-semibold text-surface-100 mb-2">
          Welcome to Mnemora
        </h2>
        <p className="text-surface-400 mb-8">
          {hasNoFolders 
            ? "Add a folder from the sidebar to start chatting with your files"
            : "Ask questions about your indexed documents"
          }
        </p>

        {!hasNoFolders && (
          <div className="space-y-2">
            <p className="text-sm text-surface-500 mb-3">Try asking:</p>
            <div className="grid gap-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => useAppStore.getState().sendMessage(suggestion)}
                  className="text-left px-4 py-3 rounded-xl bg-surface-800/50 hover:bg-surface-800 border border-surface-700/50 hover:border-mnemora-500/30 text-surface-300 hover:text-surface-100 text-sm transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
