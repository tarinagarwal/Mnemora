import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const API_BASE = 'http://localhost:8000'

export const useAppStore = create(
  persist(
    (set, get) => ({
      // UI State
      showSources: true,
      theme: 'dark',

      // Indexed Folders
      folders: [],
      indexingStatus: null, // null | { folder, progress, total, status }

      // Chat State
      messages: [],
      isGenerating: false,
      currentSources: [],

      // Models
      availableModels: [],
      selectedModel: 'llama3.2:3b',
      selectedEmbeddingModel: 'nomic-embed-text',

      // Backend Status
      backendStatus: 'disconnected', // 'connected' | 'disconnected' | 'connecting'
      ollamaStatus: 'disconnected',

      // Actions
      setShowSources: (show) => set({ showSources: show }),
      setTheme: (theme) => set({ theme }),

      // Folder Management
      addFolder: async (folderPath) => {
        try {
          set({ 
            indexingStatus: { 
              folder: folderPath, 
              progress: 0, 
              total: 0, 
              status: 'Starting...', 
              currentFile: null,
              errors: []
            } 
          })
          
          const response = await fetch(`${API_BASE}/index`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folder_path: folderPath }),
          })
          
          if (!response.ok) throw new Error('Failed to index folder')
          
          const reader = response.body.getReader()
          const decoder = new TextDecoder()
          let documentCount = 0
          let errors = []
          
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            
            const chunk = decoder.decode(value)
            const lines = chunk.split('\n').filter(line => line.startsWith('data: '))
            
            for (const line of lines) {
              try {
                const data = JSON.parse(line.slice(6))
                
                if (data.type === 'discovery') {
                  set({ 
                    indexingStatus: { 
                      folder: folderPath, 
                      progress: 0, 
                      total: data.total_files, 
                      status: `Found ${data.total_files} files`,
                      currentFile: null,
                      errors: []
                    }
                  })
                } else if (data.type === 'file_done') {
                  documentCount++
                  set({ 
                    indexingStatus: { 
                      folder: folderPath, 
                      progress: data.current, 
                      total: data.total, 
                      status: `Indexing: ${data.percent}%`,
                      currentFile: data.file,
                      errors
                    }
                  })
                } else if (data.type === 'file_error') {
                  errors.push({ file: data.file, error: data.error })
                  set({ 
                    indexingStatus: { 
                      folder: folderPath, 
                      progress: data.current, 
                      total: data.total, 
                      status: `Error on ${data.file}`,
                      currentFile: data.file,
                      errors
                    }
                  })
                } else if (data.type === 'embedding') {
                  set({ 
                    indexingStatus: { 
                      folder: folderPath, 
                      progress: 100, 
                      total: 100, 
                      status: data.status,
                      currentFile: null,
                      errors
                    }
                  })
                } else if (data.type === 'done') {
                  const { setState } = get()
                  set((state) => ({
                    folders: [...state.folders, { 
                      path: folderPath, 
                      documentCount: data.processed,
                      errors: data.errors
                    }],
                    indexingStatus: null,
                  }))
                  return { success: true, processed: data.processed, errors: data.errors }
                } else if (data.type === 'error') {
                  throw new Error(data.message)
                }
              } catch (e) {
                console.error('Failed to parse SSE data:', e)
              }
            }
          }
          
          set({ indexingStatus: null })
          return { success: true, processed: documentCount, errors: errors.length }
        } catch (error) {
          set({ indexingStatus: null })
          throw error
        }
      },

      removeFolder: async (folderPath) => {
        try {
          await fetch(`${API_BASE}/folders/${encodeURIComponent(folderPath)}`, {
            method: 'DELETE',
          })
          set((state) => ({
            folders: state.folders.filter((f) => f.path !== folderPath),
          }))
        } catch (error) {
          console.error('Failed to remove folder:', error)
        }
      },

      // Chat Actions
      sendMessage: async (content) => {
        const userMessage = { role: 'user', content, timestamp: Date.now() }
        set((state) => ({
          messages: [...state.messages, userMessage],
          isGenerating: true,
          currentSources: [],
        }))

        try {
          const response = await fetch(`${API_BASE}/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: content,
              model: get().selectedModel,
            }),
          })

          if (!response.ok) throw new Error('Query failed')

          const reader = response.body.getReader()
          const decoder = new TextDecoder()
          let assistantContent = ''
          let sources = []

          set((state) => ({
            messages: [...state.messages, { role: 'assistant', content: '', timestamp: Date.now() }],
          }))

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value)
            const lines = chunk.split('\n').filter((line) => line.startsWith('data: '))

            for (const line of lines) {
              try {
                const data = JSON.parse(line.slice(6))
                
                if (data.type === 'sources') {
                  sources = data.sources
                  set({ currentSources: sources })
                } else if (data.type === 'token') {
                  assistantContent += data.content
                  set((state) => ({
                    messages: state.messages.map((msg, idx) =>
                      idx === state.messages.length - 1
                        ? { ...msg, content: assistantContent }
                        : msg
                    ),
                  }))
                } else if (data.type === 'done') {
                  set((state) => ({
                    messages: state.messages.map((msg, idx) =>
                      idx === state.messages.length - 1
                        ? { ...msg, sources }
                        : msg
                    ),
                  }))
                }
              } catch (e) {
                console.error('Failed to parse SSE data:', e)
              }
            }
          }
        } catch (error) {
          console.error('Chat error:', error)
          set((state) => ({
            messages: [
              ...state.messages,
              { role: 'assistant', content: `Error: ${error.message}`, timestamp: Date.now(), isError: true },
            ],
          }))
        } finally {
          set({ isGenerating: false })
        }
      },

      clearMessages: () => set({ messages: [], currentSources: [] }),

      // Model Selection
      setSelectedModel: (model) => set({ selectedModel: model }),

      fetchModels: async () => {
        try {
          const response = await fetch(`${API_BASE}/models`)
          if (!response.ok) throw new Error('Failed to fetch models')
          const data = await response.json()
          set({ availableModels: data.models })
        } catch (error) {
          console.error('Failed to fetch models:', error)
        }
      },

      // Status Checks
      checkBackendStatus: async () => {
        try {
          set({ backendStatus: 'connecting' })
          const response = await fetch(`${API_BASE}/health`)
          if (!response.ok) throw new Error('Backend unhealthy')
          const data = await response.json()
          set({
            backendStatus: 'connected',
            ollamaStatus: data.ollama_status,
          })
        } catch (error) {
          set({ backendStatus: 'disconnected', ollamaStatus: 'disconnected' })
        }
      },
    }),
    {
      name: 'mnemora-storage',
      partialize: (state) => ({
        folders: state.folders,
        selectedModel: state.selectedModel,
        theme: state.theme,
        showSources: state.showSources,
      }),
    }
  )
)
