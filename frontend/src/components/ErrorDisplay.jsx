import { useNavigate } from "react-router-dom";
import {
  WifiOff,
  ShieldAlert,
  Lock,
  SearchX,
  ServerCrash,
  AlertOctagon,
  RefreshCw,
  Home,
  ArrowLeft,
  Clock,
} from "lucide-react";

/**
 * Maps HTTP status codes and error types to display configs.
 * Also handles special cases like "network" for offline errors.
 */
const ERROR_CONFIGS = {
  network: {
    icon: WifiOff,
    title: "No Internet Connection",
    description:
      "It looks like you're offline. Please check your Wi-Fi or mobile data and try again.",
    color: "text-accent-500",
    bg: "bg-accent-500/15",
    borderColor: "border-accent-300/50",
  },
  400: {
    icon: AlertOctagon,
    title: "Bad Request",
    description:
      "The server couldn't understand the request. Please check your input and try again.",
    color: "text-secondary-600",
    bg: "bg-secondary-500/15",
    borderColor: "border-secondary-300/50",
  },
  401: {
    icon: Lock,
    title: "Unauthorized",
    description:
      "You need to sign in to access this page. Please log in and try again.",
    color: "text-accent-500",
    bg: "bg-accent-500/15",
    borderColor: "border-accent-300/50",
  },
  403: {
    icon: ShieldAlert,
    title: "Access Denied",
    description:
      "You don't have permission to view this resource. Contact your administrator if you believe this is an error.",
    color: "text-accent-600",
    bg: "bg-accent-500/15",
    borderColor: "border-accent-300/50",
  },
  404: {
    icon: SearchX,
    title: "Page Not Found",
    description:
      "The page you're looking for doesn't exist or may have been moved.",
    color: "text-primary-600",
    bg: "bg-primary-500/15",
    borderColor: "border-primary-300/50",
  },
  408: {
    icon: Clock,
    title: "Request Timeout",
    description:
      "The server took too long to respond. This may be due to a slow connection. Please try again.",
    color: "text-secondary-600",
    bg: "bg-secondary-500/15",
    borderColor: "border-secondary-300/50",
  },
  429: {
    icon: ShieldAlert,
    title: "Too Many Requests",
    description:
      "You've made too many requests. Please wait a moment before trying again.",
    color: "text-secondary-600",
    bg: "bg-secondary-500/15",
    borderColor: "border-secondary-300/50",
  },
  500: {
    icon: ServerCrash,
    title: "Internal Server Error",
    description:
      "Something went wrong on our end. Our team has been notified. Please try again later.",
    color: "text-accent-500",
    bg: "bg-accent-500/15",
    borderColor: "border-accent-300/50",
  },
  502: {
    icon: ServerCrash,
    title: "Bad Gateway",
    description:
      "The server received an invalid response. This is usually temporary — please try again in a few moments.",
    color: "text-accent-500",
    bg: "bg-accent-500/15",
    borderColor: "border-accent-300/50",
  },
  503: {
    icon: ServerCrash,
    title: "Service Unavailable",
    description:
      "The server is temporarily unavailable due to maintenance or overload. Please try again shortly.",
    color: "text-accent-500",
    bg: "bg-accent-500/15",
    borderColor: "border-accent-300/50",
  },
};

const DEFAULT_CONFIG = {
  icon: AlertOctagon,
  title: "Something Went Wrong",
  description:
    "An unexpected error occurred. Please try again or contact support if the issue persists.",
  color: "text-accent-500",
  bg: "bg-accent-500/15",
  borderColor: "border-accent-300/50",
};

/**
 * Determine the error type from an Error object.
 * Checks for network errors, then HTTP status codes.
 */
export function getErrorType(error) {
  if (!error) return null;

  // Network / offline detection
  if (
    !navigator.onLine ||
    error.message === "Network Error" ||
    error.message?.includes("ERR_INTERNET_DISCONNECTED") ||
    error.message?.includes("ERR_NETWORK") ||
    error.message?.includes("Failed to fetch")
  ) {
    return "network";
  }

  // HTTP status from axios-style errors
  const status =
    error.status || error.response?.status || error.statusCode;
  if (status && ERROR_CONFIGS[status]) return status;

  // Timeout
  if (
    error.code === "ECONNABORTED" ||
    error.message?.includes("timeout")
  ) {
    return 408;
  }

  return "unknown";
}

/**
 * ErrorDisplay — A beautiful, responsive error page component.
 *
 * @param {object}  props
 * @param {number|string} props.status    — HTTP status code or "network" / "unknown"
 * @param {string}  props.title           — Override the default title
 * @param {string}  props.description     — Override the default description
 * @param {string}  props.errorMessage    — Raw error message to show in detail
 * @param {Function} props.onRetry        — Called when user clicks "Try Again"
 * @param {boolean} props.showHomeButton  — Show "Go Home" button (default: true)
 * @param {boolean} props.showBackButton  — Show "Go Back" button (default: true)
 * @param {boolean} props.fullPage        — Render as full-page centered (default: false)
 */
export default function ErrorDisplay({
  status = "unknown",
  title,
  description,
  errorMessage,
  onRetry,
  showHomeButton = true,
  showBackButton = true,
  fullPage = false,
}) {
  const navigate = useNavigate();
  const config = ERROR_CONFIGS[status] || DEFAULT_CONFIG;

  const IconComponent = config.icon;
  const displayTitle = title || config.title;
  const displayDescription = description || config.description;
  const displayStatus =
    typeof status === "number" ? status : status === "network" ? "OFFLINE" : "ERROR";

  const content = (
    <div className="w-full max-w-lg mx-auto animate-fade-in">
      {/* Main card */}
      <div
        className={`glass-card p-8 sm:p-10 text-center border ${config.borderColor}`}
      >
        {/* Status badge */}
        <div className="mb-6">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase ${config.bg} ${config.color}`}
          >
            {displayStatus}
          </span>
        </div>

        {/* Icon */}
        <div
          className={`inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-2xl ${config.bg} mb-6`}
        >
          <IconComponent
            className={`${config.color} animate-pulse-soft`}
            size={40}
            strokeWidth={1.5}
          />
        </div>

        {/* Title */}
        <h1 className="font-display text-xl sm:text-2xl font-bold text-primary-800 mb-3">
          {displayTitle}
        </h1>

        {/* Description */}
        <p className="text-sm sm:text-base text-primary-700/70 leading-relaxed mb-6 max-w-sm mx-auto">
          {displayDescription}
        </p>

        {/* Raw error detail (collapsible) */}
        {errorMessage && (
          <details className="mb-6 text-left">
            <summary className="text-xs font-medium text-primary-700/50 cursor-pointer hover:text-primary-700/80 transition-colors">
              Technical details
            </summary>
            <div className="mt-2 p-3 rounded-xl bg-primary-800/5 border border-primary-800/10">
              <code className="text-xs text-primary-700/70 break-all leading-relaxed">
                {errorMessage}
              </code>
            </div>
          </details>
        )}

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-medium shadow-glass-sm hover:bg-primary-600 active:scale-[0.98] transition-all duration-200 w-full sm:w-auto justify-center"
            >
              <RefreshCw size={16} />
              Try Again
            </button>
          )}
          {showBackButton && (
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/50 text-primary-800 text-sm font-medium border border-white/60 hover:bg-white/70 active:scale-[0.98] transition-all duration-200 w-full sm:w-auto justify-center"
            >
              <ArrowLeft size={16} />
              Go Back
            </button>
          )}
          {showHomeButton && (
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/50 text-primary-800 text-sm font-medium border border-white/60 hover:bg-white/70 active:scale-[0.98] transition-all duration-200 w-full sm:w-auto justify-center"
            >
              <Home size={16} />
              Home
            </button>
          )}
        </div>
      </div>

      {/* Subtle footer */}
      <p className="text-center text-xs text-primary-700/40 mt-4">
        YuvaTimes — Watch POS System
      </p>
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        {content}
      </div>
    );
  }

  return <div className="flex items-center justify-center py-12 px-4">{content}</div>;
}
