import { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar/Sidebar";
import ChatView from "./components/Chat/ChatView";
import SourcesPanel from "./components/Sources/SourcesPanel";
import SettingsModal from "./components/Settings/SettingsModal";
import SetupScreen from "./components/Setup/SetupScreen";
import Toast from "./components/Toast/Toast";
import { useAppStore } from "./stores/appStore";

const API_BASE = "http://localhost:8000";

function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);
  const { showSources, toasts, removeToast } = useAppStore();

  // Check if setup is complete on load
  useEffect(() => {
    const checkSetup = async () => {
      try {
        const response = await fetch(`${API_BASE}/setup/status`);
        if (response.ok) {
          const data = await response.json();
          if (data.ready) {
            setSetupComplete(true);
          }
        }
      } catch (err) {
        // Backend not running, show setup
      }
      setCheckingSetup(false);
    };

    checkSetup();
  }, []);

  // Show loading state while checking
  if (checkingSetup) {
    return (
      <div className="h-full flex items-center justify-center bg-surface-950">
        <div className="w-8 h-8 border-2 border-mnemora-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show setup screen if not complete
  if (!setupComplete) {
    return <SetupScreen onComplete={() => setSetupComplete(true)} />;
  }

  return (
    <div className="h-full flex bg-surface-950">
      {/* Sidebar */}
      <Sidebar onOpenSettings={() => setShowSettings(true)} />

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Chat Area */}
        <ChatView />

        {/* Sources Panel */}
        {showSources && <SourcesPanel />}
      </main>

      {/* Settings Modal */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-md">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </div>
  );
}

export default App;
