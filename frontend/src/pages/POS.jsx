import { useState, useMemo } from 'react';
import { CheckCircle2, AlertCircle, Receipt } from 'lucide-react';

import GlassCard from '../components/GlassCard';
import GlassButton from '../components/GlassButton';
import GlassModal from '../components/GlassModal';
import PosTabs from '../components/PosTabs';
import PosScanner from '../components/PosScanner';
import PosCartList from '../components/PosCartList';
import ReceiptModal from '../components/ReceiptModal';

import { useCheckoutSession } from '../hooks/useCheckoutSession';
import { usePosStore } from '../store/usePosStore';
import { useBrowserPrint } from '../hooks/useBrowserPrint';
import { generateReceiptZpl } from '../utils/receiptZpl';

export default function POS() {
  const activeSessionId = usePosStore((state) => state.activeSessionId);
  const addSession = usePosStore((state) => state.addSession);
  const setDiscount = usePosStore((state) => state.setDiscount);
  const setDiscountType = usePosStore((state) => state.setDiscountType);
  
  const activeSession = usePosStore((state) => 
    state.sessions.find(s => s.id === state.activeSessionId)
  );
  const discount = activeSession?.discount || 0;
  const discountType = activeSession?.discountType || 'rupees';

  const {
    items,
    loading,
    error,
    completing,
    scanItem,
    removeItem,
    completeCheckout,
  } = useCheckoutSession(activeSessionId);

  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [receipt, setReceipt] = useState(null);

  const { isPrinting, printZpl } = useBrowserPrint();

  const handleRemove = async (serial) => {
    try {
      await removeItem(serial);
    } catch (err) {
      // error is handled in useCheckoutSession and displayed below
    }
  };

  const handleComplete = async () => {
    try {
      const data = await completeCheckout(calculatedDiscountAmount);
      setShowCompleteModal(false);

      // Instantly generate and print the receipt ZPL!
      const receiptData = {
        storeName: "YuvaTimes Watch POS",
        sessionId: data.invoiceNumber || activeSessionId,
        items,
        subtotal,
        discountAmount: calculatedDiscountAmount,
        totalDue: total,
      };
      
      const { zpl, size } = generateReceiptZpl(receiptData);
      printZpl(zpl, size).catch(err => {
        console.error("Silent print failed:", err);
      });
      
    } catch (err) {
      // error handled in useCheckoutSession
    }
  };

  const handleNewSession = () => {
    addSession();
    setReceipt(null);
  };

  // Performance Optimization: Cache these calculations
  const { subtotal, total, calculatedDiscountAmount } = useMemo(() => {
    const calculatedSubtotal = items.reduce(
      (sum, item) => sum + (item.sellingPrice || item.price || 0),
      0
    );
    
    let discountAmt = 0;
    if (discountType === 'percentage') {
      discountAmt = calculatedSubtotal * (discount / 100);
    } else {
      discountAmt = discount;
    }
    
    return {
      subtotal: calculatedSubtotal,
      total: Math.max(0, calculatedSubtotal - discountAmt),
      calculatedDiscountAmount: discountAmt
    };
  }, [items, discount, discountType]);

  if (!activeSessionId) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-primary-700/50">
        No active session
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Bar */}
      <PosTabs />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-primary-800">
            Checkout
          </h1>
          <p className="text-primary-700/60 mt-1">
            Scan items to automatically add them to the current tab
          </p>
        </div>
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
          <PosScanner onScan={scanItem} />
        </div>

        {/* Right: Cart */}
        <div className="flex flex-col gap-4">
          <PosCartList items={items} loading={loading} onRemove={handleRemove} />

          {/* Cart Summary & Action */}
          <GlassCard className="!bg-primary-900/5 !border-primary-500/10">
            <div className="space-y-3">
              <div className="flex justify-between text-primary-700/70">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-primary-700/70">
                <div className="flex items-center gap-2">
                  <span>Offer / Discount</span>
                  <div className="flex bg-white/30 rounded overflow-hidden shadow-inner">
                    <button
                      className={`px-2 py-0.5 text-xs font-semibold ${discountType === 'rupees' ? 'bg-primary-500 text-white shadow' : 'hover:bg-white/50 text-primary-600'}`}
                      onClick={() => setDiscountType(activeSessionId, 'rupees')}
                    >
                      ₹
                    </button>
                    <button
                      className={`px-2 py-0.5 text-xs font-semibold ${discountType === 'percentage' ? 'bg-primary-500 text-white shadow' : 'hover:bg-white/50 text-primary-600'}`}
                      onClick={() => setDiscountType(activeSessionId, 'percentage')}
                    >
                      %
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={discount === 0 ? '' : discount}
                    onChange={(e) => setDiscount(activeSessionId, Number(e.target.value) || 0)}
                    className="glass-input w-24 pl-3 pr-6 py-1.5 text-right font-mono text-sm bg-white/40"
                    placeholder="0"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-primary-700/40 text-xs font-bold pointer-events-none">
                    {discountType === 'percentage' ? '%' : '₹'}
                  </span>
                </div>
              </div>
              
              <div className="pt-3 border-t border-primary-900/10 flex justify-between items-end">
                <div>
                  <span className="block text-sm text-primary-700/60">Total Due</span>
                  <span className="font-display text-2xl font-bold text-primary-800">
                    ₹{total.toFixed(2)}
                  </span>
                </div>
                <GlassButton
                  onClick={() => setShowCompleteModal(true)}
                  disabled={items.length === 0 || completing}
                  className="!px-6"
                >
                  <Receipt size={18} />
                  Complete Sale
                </GlassButton>
              </div>
            </div>
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
            <GlassButton onClick={handleComplete} loading={completing || isPrinting}>
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
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-primary-700/70">
              <span>Offer / Discount {discountType === 'percentage' && `(${discount}%)`}</span>
              <span className="text-secondary-600">-₹{calculatedDiscountAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-display font-bold text-primary-800 text-base pt-2 border-t border-white/20">
              <span>Total Due</span>
              <span>₹{total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </GlassModal>

      {/* Receipt modal */}
      <ReceiptModal 
        receipt={receipt} 
        onClose={() => setReceipt(null)} 
        onNewSession={handleNewSession} 
      />
    </div>
  );
}
