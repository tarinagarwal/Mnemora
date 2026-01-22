import { useEffect, useState } from "react";
import {
  FolderPlus,
  Settings,
  MessageSquare,
  Trash2,
  FolderOpen,
  Cpu,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { useAppStore } from "../../stores/appStore";

export default function Sidebar({ onOpenSettings }) {
  const {
    folders,
    removeFolder,
    backendStatus,
    ollamaStatus,
    checkBackendStatus,
    indexingStatus,
    indexingFileList,
  } = useAppStore();

  useEffect(() => {
    checkBackendStatus();
    const interval = setInterval(checkBackendStatus, 10000);
    return () => clearInterval(interval);
  }, [checkBackendStatus]);

  const handleAddFolder = async () => {
    // In Electron, this will use IPC to open native folder picker
    // For now, using the browser's folder picker fallback
    if (window.electronAPI?.selectFolder) {
      const folderPath = await window.electronAPI.selectFolder();
      if (folderPath) {
        useAppStore.getState().addFolder(folderPath);
      }
    } else {
      // Browser fallback - prompt for path
      const path = prompt("Enter folder path to index:");
      if (path) {
        useAppStore.getState().addFolder(path);
      }
    }
  };

  return (
    <aside className="w-64 h-full flex flex-col bg-surface-900 border-r border-surface-800">
      {/* Header */}
      <div className="p-4 border-b border-surface-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-mnemora-500 to-mnemora-700 flex items-center justify-center glow-sm">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-lg gradient-text">Mnemora</h1>
            <p className="text-xs text-surface-400">Personal Context Engine</p>
          </div>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="p-3 border-b border-surface-800 space-y-2">
        <StatusBadge
          label="Backend"
          status={backendStatus}
          onRefresh={checkBackendStatus}
        />
        <StatusBadge label="Ollama" status={ollamaStatus} />
      </div>

      {/* Folders Section */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-surface-300">
            Indexed Folders
          </h2>
          <button
            onClick={handleAddFolder}
            className="p-1.5 rounded-lg hover:bg-surface-800 text-surface-400 hover:text-mnemora-400 transition-colors"
            title="Add folder"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
        </div>

        {folders.length === 0 ? (
          <div className="text-center py-8">
            <FolderOpen className="w-12 h-12 text-surface-700 mx-auto mb-3" />
            <p className="text-sm text-surface-500">No folders indexed</p>
            <p className="text-xs text-surface-600 mt-1">
              Add a folder to get started
            </p>
          </div>
        ) : (
          <ul className="space-y-1">
            {folders.map((folder) => (
              <FolderItem
                key={folder.path}
                folder={folder}
                onRemove={() => removeFolder(folder.path)}
              />
            ))}
          </ul>
        )}

        {/* Indexing Progress */}
        {indexingStatus && (
          <IndexingProgress
            status={indexingStatus}
            fileList={indexingFileList}
          />
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-3 border-t border-surface-800 space-y-2">
        <button
          onClick={() => useAppStore.getState().clearMessages()}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-surface-300 hover:bg-surface-800 hover:text-surface-100 transition-colors"
        >
          <MessageSquare className="w-4 h-4" />
          New Chat
        </button>
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-surface-300 hover:bg-surface-800 hover:text-surface-100 transition-colors"
        >
          <Settings className="w-4 h-4" />
          Settings
        </button>
      </div>
    </aside>
  );
}

function StatusBadge({ label, status, onRefresh }) {
  const statusColors = {
    connected: "bg-green-500",
    disconnected: "bg-red-500",
    connecting: "bg-yellow-500 animate-pulse",
  };

  return (
    <div className="flex items-center justify-between text-xs">
      <div className="flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${statusColors[status] || statusColors.disconnected}`}
        />
        <span className="text-surface-400">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-surface-500 capitalize">{status}</span>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="text-surface-500 hover:text-surface-300"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

function FolderItem({ folder, onRemove }) {
  const folderName = folder.path.split(/[/\\]/).pop();

  return (
    <li className="group flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-800 transition-colors">
      <FolderOpen className="w-4 h-4 text-mnemora-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-surface-200 truncate" title={folder.path}>
          {folderName}
        </p>
        <p className="text-xs text-surface-500">
          {folder.documentCount} documents
        </p>
      </div>
      <button
        onClick={onRemove}
        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-surface-700 text-surface-500 hover:text-red-400 transition-all"
        title="Remove folder"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </li>
  );
}

function IndexingProgress({ status, fileList }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-4 p-3 rounded-lg bg-surface-800 border border-mnemora-500/30">
      <div className="flex items-center gap-2 mb-2">
        <RefreshCw className="w-4 h-4 text-mnemora-400 animate-spin" />
        <span className="text-sm text-surface-200 flex-1">{status.status}</span>
        {fileList.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded hover:bg-surface-700 text-surface-400 hover:text-surface-200 transition-colors"
            title={expanded ? "Hide file list" : "Show file list"}
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* Current file */}
      {status.currentFile && !expanded && (
        <p className="text-xs text-mnemora-300 truncate mb-2">
          📄 {status.currentFile}
        </p>
      )}

      {/* Progress bar */}
      {status.total > 0 && (
        <div className="mt-2">
          <div className="h-2 bg-surface-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-mnemora-500 to-mnemora-400 transition-all duration-300"
              style={{
                width: `${(status.progress / status.total) * 100}%`,
              }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <p className="text-xs text-surface-500">
              {status.progress} / {status.total} files
            </p>
            {status.errors?.length > 0 && (
              <button
                onClick={() => {
                  const errorList = status.errors
                    .map((e) => `${e.file}: ${e.error}`)
                    .join("\n");
                  alert(
                    `Failed to parse ${status.errors.length} file(s):\n\n${errorList}`,
                  );
                }}
                className="text-xs text-yellow-400 hover:text-yellow-300 underline"
                title="Click to see error details"
              >
                ⚠️ {status.errors.length} errors
              </button>
            )}
          </div>
        </div>
      )}

      {/* Expandable File List */}
      {expanded && fileList.length > 0 && (
        <div className="mt-3 max-h-64 overflow-y-auto space-y-1 border-t border-surface-700 pt-2">
          {fileList.map((file, idx) => (
            <FileListItem key={idx} file={file} />
          ))}
        </div>
      )}
    </div>
  );
}

function FileListItem({ file }) {
  const getIcon = () => {
    switch (file.status) {
      case "done":
        return <CheckCircle className="w-3 h-3 text-green-400" />;
      case "error":
        return <XCircle className="w-3 h-3 text-red-400" />;
      case "processing":
        return <Loader2 className="w-3 h-3 text-mnemora-400 animate-spin" />;
      default:
        return (
          <div className="w-3 h-3 rounded-full border border-surface-600" />
        );
    }
  };

  return (
    <div className="flex items-start gap-2 p-1.5 rounded bg-surface-850 text-xs">
      <div className="mt-0.5">{getIcon()}</div>
      <div className="flex-1 min-w-0">
        <p className="text-surface-200 truncate" title={file.file}>
          {file.file}
        </p>
        {file.status === "done" && file.chunks !== undefined && (
          <p className="text-surface-500 text-[10px]">
            {file.chunks} chunk{file.chunks !== 1 ? "s" : ""}
          </p>
        )}
        {file.status === "error" && file.error && (
          <p className="text-red-400 text-[10px] truncate" title={file.error}>
            {file.error}
          </p>
        )}
      </div>
    </div>
  );
}
