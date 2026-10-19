import { Component } from "react";
import {
  AlertOctagon,
  RefreshCw,
  Home,
} from "lucide-react";

/**
 * ErrorBoundary — Catches unhandled React render errors.
 * Uses a class component (required for componentDidCatch / getDerivedStateFromError).
 * Styled with the glassmorphism design system.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-lg mx-auto animate-fade-in">
          <div className="glass-card p-8 sm:p-10 text-center border border-accent-300/50">
            {/* Status badge */}
            <div className="mb-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-accent-500/15 text-accent-500">
                CRASH
              </span>
            </div>

            {/* Icon */}
            <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-accent-500/15 mb-6">
              <AlertOctagon
                className="text-accent-500 animate-pulse-soft"
                size={40}
                strokeWidth={1.5}
              />
            </div>

            {/* Title */}
            <h1 className="font-display text-xl sm:text-2xl font-bold text-primary-800 mb-3">
              Something Went Wrong
            </h1>

            {/* Description */}
            <p className="text-sm sm:text-base text-primary-700/70 leading-relaxed mb-6 max-w-sm mx-auto">
              The application encountered an unexpected error. This has been
              logged and our team will look into it.
            </p>

            {/* Error detail */}
            {this.state.error?.message && (
              <details className="mb-6 text-left">
                <summary className="text-xs font-medium text-primary-700/50 cursor-pointer hover:text-primary-700/80 transition-colors">
                  Technical details
                </summary>
                <div className="mt-2 p-3 rounded-xl bg-primary-800/5 border border-primary-800/10">
                  <code className="text-xs text-primary-700/70 break-all leading-relaxed">
                    {this.state.error.message}
                  </code>
                </div>
              </details>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-medium shadow-glass-sm hover:bg-primary-600 active:scale-[0.98] transition-all duration-200 w-full sm:w-auto justify-center"
              >
                <RefreshCw size={16} />
                Try Again
              </button>
              <button
                onClick={this.handleGoHome}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/50 text-primary-800 text-sm font-medium border border-white/60 hover:bg-white/70 active:scale-[0.98] transition-all duration-200 w-full sm:w-auto justify-center"
              >
                <Home size={16} />
                Go Home
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-primary-700/40 mt-4">
            YuvaTimes — Watch POS System
          </p>
        </div>
      </div>
    );
  }
}
