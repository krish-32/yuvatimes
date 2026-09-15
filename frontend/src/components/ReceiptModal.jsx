import { CheckCircle2, Plus } from 'lucide-react';
import GlassModal from './GlassModal';
import GlassButton from './GlassButton';

export default function ReceiptModal({ receipt, onClose, onNewSession }) {
  if (!receipt) return null;

  return (
    <GlassModal
      open={!!receipt}
      onClose={onClose}
      title="Sale Complete"
      size="sm"
      footer={
        <>
          <GlassButton variant="secondary" onClick={onClose}>
            Close
          </GlassButton>
          <GlassButton onClick={onNewSession}>
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
              <span className="text-primary-800">₹{Number(receipt.total).toFixed(2)}</span>
            </div>
          )}
          {receipt.items_sold !== undefined && (
            <div className="flex justify-between">
              <span className="text-primary-700/60">Items sold</span>
              <span className="text-primary-800">{receipt.items_sold}</span>
            </div>
          )}
        </div>
      </div>
    </GlassModal>
  );
}
