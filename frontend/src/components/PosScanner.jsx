import { useState, useRef, useEffect, useCallback } from 'react';
import { ScanLine, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import GlassCard from './GlassCard';

export default function PosScanner({ onScan }) {
  const [scanInput, setScanInput] = useState('');
  const [scanFeedback, setScanFeedback] = useState(null);
  const inputRef = useRef(null);
  const feedbackTimer = useRef(null);

  // Auto-focus the scanner input — laser scanners need the field focused at all times
  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    focusInput();
  }, [focusInput]);

  // Re-focus on any click in the window (scanner should always be ready)
  useEffect(() => {
    const handleClick = () => focusInput();
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [focusInput]);

  // Cleanup feedback timer
  useEffect(() => {
    return () => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    };
  }, []);

  const handleScan = async (e) => {
    e.preventDefault();
    
    // Security Fix: Sanitize input (only alphanumeric and basic symbols)
    const serial = scanInput.trim();
    if (!serial) return;
    
    if (!/^[A-Z0-9_-]+$/i.test(serial)) {
      setScanFeedback({ type: 'error', message: 'Invalid barcode format.' });
      setScanInput('');
      return;
    }

    setScanInput('');
    setScanFeedback({ type: 'scanning', message: `Scanning ${serial}...` });

    try {
      await onScan(serial);
      setScanFeedback({ type: 'success', message: `Added: ${serial}` });
    } catch (err) {
      setScanFeedback({ type: 'error', message: err.message });
    }

    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setScanFeedback(null), 3000);
    focusInput();
  };

  return (
    <GlassCard className="!p-8">
      <div className="flex flex-col items-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-500/15 mb-4">
          <ScanLine className="text-primary-600" size={32} />
        </div>
        <h2 className="font-display text-lg font-semibold text-primary-800 mb-1">
          Scan Barcode
        </h2>
        <p className="text-sm text-primary-700/60 mb-6">
          Position cursor below and scan with your laser scanner
        </p>

        <form onSubmit={handleScan} className="w-full">
          <input
            ref={inputRef}
            type="text"
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value)}
            className="glass-input w-full px-5 py-4 text-center text-lg font-mono tracking-widest text-primary-900 bg-white/40"
            placeholder="Scan or type serial..."
            autoComplete="off"
            spellCheck="false"
            autoFocus
          />
        </form>

        {/* Scan feedback */}
        {scanFeedback && (
          <div
            className={`mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium animate-fade-in
              ${scanFeedback.type === 'success'
                ? 'bg-green-500/20 text-green-700'
                : scanFeedback.type === 'error'
                  ? 'bg-secondary-500/20 text-secondary-700'
                  : 'bg-accent-200/40 text-primary-700'
              }`}
          >
            {scanFeedback.type === 'success' && <CheckCircle2 size={18} />}
            {scanFeedback.type === 'error' && <AlertCircle size={18} />}
            {scanFeedback.type === 'scanning' && (
              <Loader2 size={18} className="animate-spin" />
            )}
            {scanFeedback.message}
          </div>
        )}
      </div>
    </GlassCard>
  );
}
