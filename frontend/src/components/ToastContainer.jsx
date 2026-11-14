import { memo, useCallback } from "react";
import { CheckCircle2, AlertTriangle, Info, AlertCircle, X } from "lucide-react";
import { useToastStore } from "../store/useToastStore";

const ICON_MAP = {
  success: CheckCircle2,
  error: AlertTriangle,
  warning: AlertCircle,
  info: Info,
};

const STYLE_MAP = {
  success: "bg-green-50/90 border-green-300 text-green-800",
  error: "bg-red-50/90 border-red-300 text-red-800",
  warning: "bg-yellow-50/90 border-yellow-300 text-yellow-800",
  info: "bg-blue-50/90 border-blue-300 text-blue-800",
};

const ICON_COLOR_MAP = {
  success: "text-green-600",
  error: "text-red-600",
  warning: "text-yellow-600",
  info: "text-blue-600",
};

const PROGRESS_COLOR_MAP = {
  success: "bg-green-500",
  error: "bg-red-500",
  warning: "bg-yellow-500",
  info: "bg-blue-500",
};

// status = polite announcement (success/info), alert = assertive (error/warning)
const ROLE_MAP = {
  success: "status",
  info: "status",
  error: "alert",
  warning: "alert",
};

/**
 * Global toast container — renders all active toast notifications.
 * Place once at the app root level (e.g. in App.jsx).
 */
const ToastContainer = memo(function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const dismissToast = useToastStore((s) => s.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-[200] flex flex-col-reverse gap-3 max-w-sm w-full pointer-events-none"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={dismissToast}
        />
      ))}
    </div>
  );
});

const ToastItem = memo(function ToastItem({ toast, onDismiss }) {
  const Icon = ICON_MAP[toast.type] || Info;
  const style = STYLE_MAP[toast.type] || STYLE_MAP.info;
  const iconColor = ICON_COLOR_MAP[toast.type] || ICON_COLOR_MAP.info;
  const progressColor = PROGRESS_COLOR_MAP[toast.type] || PROGRESS_COLOR_MAP.info;

  const handleDismiss = useCallback(
    () => onDismiss(toast.id),
    [onDismiss, toast.id],
  );

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-md animate-toast-in relative overflow-hidden ${style}`}
      role={ROLE_MAP[toast.type] || "status"}
    >
      <Icon size={18} className={`${iconColor} shrink-0 mt-0.5`} />
      <span className="text-sm font-medium flex-1 leading-snug">{toast.message}</span>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss notification"
        className="ml-1 p-0.5 opacity-60 hover:opacity-100 transition-opacity shrink-0"
      >
        <X size={14} />
      </button>
      {/* Auto-dismiss progress bar */}
      {toast.duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px]">
          <div
            className={`h-full ${progressColor} opacity-40`}
            style={{
              animation: `toastProgress ${toast.duration}ms linear forwards`,
            }}
          />
        </div>
      )}
    </div>
  );
});

export default ToastContainer;
