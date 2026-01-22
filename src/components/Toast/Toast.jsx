import { useEffect } from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const colors = {
  success: "bg-green-500/10 border-green-500/30 text-green-300",
  error: "bg-red-500/10 border-red-500/30 text-red-300",
  warning: "bg-yellow-500/10 border-yellow-500/30 text-yellow-300",
  info: "bg-blue-500/10 border-blue-500/30 text-blue-300",
};

export default function Toast({
  message,
  type = "info",
  duration = 5000,
  onClose,
}) {
  const Icon = icons[type];

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl border ${colors[type]} shadow-lg animate-slide-up`}
    >
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm">{message}</p>
      </div>
      <button
        onClick={onClose}
        className="p-0.5 rounded hover:bg-white/10 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
