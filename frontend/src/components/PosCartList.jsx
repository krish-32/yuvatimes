import { ShoppingCart, Loader2, Trash2 } from 'lucide-react';
import GlassCard from './GlassCard';

export default function PosCartList({ items, loading, onRemove }) {
  return (
    <GlassCard className="!p-0 overflow-hidden flex flex-col flex-1 h-full">
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
                key={item.serial || i}
                className="flex items-center gap-4 px-6 py-4 hover:bg-white/20 transition-colors group animate-fade-in"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100/50 text-primary-800 font-bold">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-primary-800 truncate">
                    {item.brand} {item.model}
                  </h3>
                  <p className="text-xs text-primary-700/60 font-mono mt-0.5">
                    {item.serial || item.barcode}
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-primary-800">
                    ₹{item.sellingPrice || item.price}
                  </div>
                </div>
                <button
                  onClick={() => onRemove(item.serial || item.barcode)}
                  className="p-2 text-secondary-500/50 hover:text-secondary-600 hover:bg-secondary-500/10 rounded-lg transition-colors"
                  title="Remove item"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </GlassCard>
  );
}
