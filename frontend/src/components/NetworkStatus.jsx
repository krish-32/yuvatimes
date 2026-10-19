import { useState, useEffect, useCallback } from "react";
import { WifiOff, Wifi, X } from "lucide-react";

/**
 * NetworkStatus — A global overlay/banner that detects online/offline status.
 * Shows an animated banner when offline and a brief "back online" toast on reconnection.
 */
export default function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  const handleOnline = useCallback(() => {
    setIsOnline(true);
    if (wasOffline) {
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 3000);
    }
  }, [wasOffline]);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    setWasOffline(true);
  }, []);

  useEffect(() => {
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [handleOnline, handleOffline]);

  // Offline banner
  if (!isOnline) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-primary-900/30 backdrop-blur-sm p-4">
        <div className="glass-card border border-accent-300/50 p-6 sm:p-8 max-w-sm w-full text-center animate-scale-in">
          {/* Pulsing icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-accent-500/15 mb-5">
            <WifiOff
              className="text-accent-500 animate-pulse-soft"
              size={32}
              strokeWidth={1.5}
            />
          </div>

          <h2 className="font-display text-lg sm:text-xl font-bold text-primary-800 mb-2">
            No Internet Connection
          </h2>
          <p className="text-sm text-primary-700/70 leading-relaxed mb-5">
            You appear to be offline. Please check your Wi-Fi or mobile data
            connection. The app will reconnect automatically.
          </p>

          {/* Animated waiting dots */}
          <div className="flex items-center justify-center gap-1.5">
            <span className="text-xs text-primary-700/50 font-medium">
              Waiting for connection
            </span>
            <span className="flex gap-0.5">
              <span
                className="w-1 h-1 rounded-full bg-primary-500/60 animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <span
                className="w-1 h-1 rounded-full bg-primary-500/60 animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <span
                className="w-1 h-1 rounded-full bg-primary-500/60 animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Reconnected toast
  if (showReconnected) {
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] animate-slide-in">
        <div className="flex items-center gap-3 px-5 py-3 rounded-xl shadow-glass border border-green-300/60 bg-green-50/90 backdrop-blur-md">
          <Wifi size={18} className="text-green-600 shrink-0" />
          <span className="text-sm font-medium text-green-800">
            Back online!
          </span>
          <button
            onClick={() => setShowReconnected(false)}
            className="ml-1 opacity-60 hover:opacity-100 transition-opacity"
          >
            <X size={14} className="text-green-700" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
