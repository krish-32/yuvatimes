import { useState, useRef, useEffect, useCallback } from 'react';
import {
  ScanLine,
  Trash2,
  ShoppingCart,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Receipt,
  Plus,
  X,
} from 'lucide-react';
import GlassCard from '../components/GlassCard';
import GlassButton from '../components/GlassButton';
import GlassModal from '../components/GlassModal';
import { useCheckoutSession } from '../hooks/useCheckoutSession';

function generateSessionId() {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return `pos-${ts}-${rand}`;
}

export default function POS() {
  const [sessionId, setSessionId] = useState(() => {
    const existing = sessionStorage.getItem('pos_session_id');
    if (existing) return existing;
    const id = generateSessionId();
    sessionStorage.setItem('pos_session_id', id);
    return id;
  });

  const {
    items,
    loading,
    error,
    completing,
    fetchItems,
    scanItem,
    removeItem,
    completeCheckout,
  } = useCheckoutSession(sessionId);

  const [scanInput, setScanInput] = useState('');
  const [scanFeedback, setScanFeedback] = useState(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const inputRef = useRef(null);
  const feedbackTimer = useRef(null);

  // Auto-focus the scanner input — laser scanners need the field focused at all times
  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    focusInput();
    fetchItems();
  }, [fetchItems, focusInput]);

  // Re-focus on any click (scanner should always be ready)
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
    const serial = scanInput.trim();
    if (!serial) return;

    setScanInput('');
    setScanFeedback({ type: 'scanning', message: `Scanning ${serial}...` });

    try {
      await scanItem(serial);
      setScanFeedback({ type: 'success', message: `Added: ${serial}` });
    } catch (err) {
      setScanFeedback({ type: 'error', message: err.message });
    }

    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setScanFeedback(null), 3000);
    focusInput();
  };

  const handleRemove = async (serial) => {
    try {
      await removeItem(serial);
    } catch (err) {
      // error already in hook state
    }
    focusInput();
  };

  const handleComplete = async () => {
    try {
      const data = await completeCheckout();
      setReceipt(data);
      setShowCompleteModal(false);
    } catch (err) {
      // error in hook state
    }
  };

  const handleNewSession = () => {
    const newId = generateSessionId();
    sessionStorage.setItem('pos_session_id', newId);
    setSessionId(newId);
    setReceipt(null);
    setScanFeedback(null);
    setScanInput('');
    setTimeout(focusInput, 100);
  };

  // Calculate totals from cart items
  const subtotal = items.reduce(
    (sum, item) => sum + (item.sellingPrice || item.price || 0),
    0
  );
  const taxRate = 0.08;
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-primary-800">
            POS / Checkout
          </h1>
          <p className="text-primary-700/60 mt-1">
            Session: <span className="font-mono text-xs">{sessionId}</span>
          </p>
        </div>
        <GlassButton variant="secondary" onClick={handleNewSession}>
          <Plus size={16} />
          New Session
        </GlassButton>
      </div>

      {/* Error banner */}
      {error && (
        <GlassCard className="!bg-secondary-500/20 !border-secondary-400/50">
          <div className="flex items-center gap-3 text-secondary-700">
            <AlertCircle size={20} />
            <span className="text-sm font-medium">{error}</span>
          </div>
        </GlassCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Scanner input */}
        <div className="space-y-4">
          {/* Scanner input card */}
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

          {/* Session info */}
          <GlassCard>
            <h3 className="font-display font-semibold text-primary-800 mb-3">Session Info</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-primary-700/60">Items in cart</span>
                <span className="font-semibold text-primary-800">{items.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-primary-700/60">Session ID</span>
                <span className="font-mono text-xs text-primary-800">{sessionId}</span>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Right: Cart */}
        <div className="flex flex-col gap-4">
          <GlassCard className="!p-0 overflow-hidden flex flex-col flex-1">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-white/30">
              <ShoppingCart className="text-primary-600" size={20} />
              <h2 className="font-display font-semibold text-primary-800">Current Cart</h2>
              <span className="ml-auto text-sm text-primary-700/60">
                {items.length} item{items.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Cart items */}
            <div className="flex-1 overflow-y-auto max-h-[400px]">
              {loading && items.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-primary-700/50">
                  <Loader2 className="animate-spin mr-2" size={18} />
                  Loading cart...
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-primary-700/40">
                  <ShoppingCart size={40} className="mb-3 opacity-50" />
                  <p className="text-sm">Cart is empty. Scan a barcode to begin.</p>
                </div>
              ) : (
                <div className="divide-y divide-white/20">
                  {items.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between px-6 py-3 hover:bg-white/20 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-primary-800 truncate">
                          {item.brand} {item.model}
                        </p>
                        <p className="text-xs font-mono text-primary-700/50">
                          {item.serial || item.barcode}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 ml-3">
                        <span className="text-sm font-semibold text-primary-800">
                          ${(item.sellingPrice || item.price || 0).toFixed(2)}
                        </span>
                        <button
                          onClick={() => handleRemove(item.serial || item.barcode)}
                          className="p-1.5 rounded-lg text-secondary-600 hover:bg-secondary-500/15 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Totals & checkout */}
            {items.length > 0 && (
              <div className="border-t border-white/30 px-6 py-4 space-y-3">
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-primary-700/70">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-primary-700/70">
                    <span>Tax (8%)</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-display font-bold text-primary-800 text-base pt-1.5 border-t border-white/20">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
                <GlassButton
                  className="w-full !py-3"
                  onClick={() => setShowCompleteModal(true)}
                  disabled={completing}
                >
                  <Receipt size={18} />
                  Complete Checkout — ${total.toFixed(2)}
                </GlassButton>
              </div>
            )}
          </GlassCard>
        </div>
      </div>

      {/* Complete checkout confirmation */}
      <GlassModal
        open={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        title="Confirm Checkout"
        footer={
          <>
            <GlassButton variant="secondary" onClick={() => setShowCompleteModal(false)}>
              Cancel
            </GlassButton>
            <GlassButton onClick={handleComplete} loading={completing}>
              <CheckCircle2 size={16} />
              Confirm Sale
            </GlassButton>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-primary-700/70">
            You are about to complete this sale. All {items.length} item{items.length !== 1 ? 's' : ''} will be
            marked as sold and the session will be cleared.
          </p>
          <div className="glass-card p-4 space-y-2">
            <div className="flex justify-between text-sm text-primary-700/70">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-primary-700/70">
              <span>Tax (8%)</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-display font-bold text-primary-800 text-base pt-2 border-t border-white/20">
              <span>Total Due</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </GlassModal>

      {/* Receipt modal */}
      <GlassModal
        open={!!receipt}
        onClose={() => setReceipt(null)}
        title="Sale Complete"
        size="sm"
        footer={
          <>
            <GlassButton variant="secondary" onClick={() => setReceipt(null)}>
              Close
            </GlassButton>
            <GlassButton onClick={handleNewSession}>
              <Plus size={16} />
              New Session
            </GlassButton>
          </>
        }
      >
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
              <CheckCircle2 className="text-green-600" size={36} />
            </div>
          </div>
          <p className="font-display text-lg font-semibold text-primary-800">
            Sale completed successfully!
          </p>
          {receipt && (
            <div className="glass-card p-4 text-left space-y-1.5 text-sm">
              {receipt.receipt_id && (
                <div className="flex justify-between">
                  <span className="text-primary-700/60">Receipt ID</span>
                  <span className="font-mono text-primary-800">{receipt.receipt_id}</span>
                </div>
              )}
              {receipt.total !== undefined && (
                <div className="flex justify-between font-semibold">
                  <span className="text-primary-700/60">Total</span>
                  <span className="text-primary-800">${Number(receipt.total).toFixed(2)}</span>
                </div>
              )}
              {receipt.items_sold !== undefined && (
                <div className="flex justify-between">
                  <span className="text-primary-700/60">Items sold</span>
                  <span className="text-primary-800">{receipt.items_sold}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </GlassModal>
    </div>
  );
}
