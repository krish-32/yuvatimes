import { useState, useCallback, memo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Tag,
  Trash2,
  ShoppingCart,
  Loader2,
  Package,
  Clock,
  CheckCircle2,
  AlertTriangle,
  X,
} from "lucide-react";
import GlassCard from "../components/GlassCard";
import GlassButton from "../components/GlassButton";
import GlassModal from "../components/GlassModal";
import ErrorDisplay, { getErrorType } from "../components/ErrorDisplay";
import { useProductItems, useDeleteBarcode } from "../hooks/useInventoryAPI";
import { useCheckoutSession } from "../hooks/useCheckoutSession";
import { usePosStore } from "../store/usePosStore";

/* ── Tiny inline toast ── */
const Toast = memo(function Toast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [toast, onDismiss]);

  if (!toast) return null;
  const isSuccess = toast.type === "success";
  return (
    <div className="fixed bottom-6 right-6 z-[100] animate-fade-in">
      <div
        className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg border backdrop-blur-md ${
          isSuccess
            ? "bg-green-50/90 border-green-300 text-green-800"
            : "bg-red-50/90 border-red-300 text-red-800"
        }`}
      >
        {isSuccess ? (
          <CheckCircle2 size={18} className="text-green-600 shrink-0" />
        ) : (
          <AlertTriangle size={18} className="text-red-600 shrink-0" />
        )}
        <span className="text-sm font-medium">{toast.message}</span>
        <button
          onClick={onDismiss}
          className="ml-2 opacity-60 hover:opacity-100"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
});

const STATUS_BADGES = {
  DRAFT: "bg-yellow-100 text-yellow-800 border-yellow-300",
  IN_STOCK: "bg-green-100 text-green-800 border-green-300",
  STAGED: "bg-blue-100 text-blue-800 border-blue-300",
  SOLD: "bg-primary-100 text-primary-800 border-primary-300",
};

export default function ProductItems() {
  const { id: productId } = useParams();
  const navigate = useNavigate();

  const {
    data: items = [],
    isLoading,
    error,
    refetch,
  } = useProductItems(productId);

  const { mutateAsync: deleteBarcode, isPending: isDeleting } =
    useDeleteBarcode();

  const activeSessionId = usePosStore((state) => state.activeSessionId);
  const { scanItem } = useCheckoutSession(activeSessionId);

  const [deletingItem, setDeletingItem] = useState(null);
  const [addingToCart, setAddingToCart] = useState(null);
  const [toast, setToast] = useState(null);
  const dismissToast = useCallback(() => setToast(null), []);

  // Product metadata from first item (all items share the same product)
  const product = items.length > 0 ? items[0] : null;

  const handleDelete = async () => {
    if (!deletingItem) return;
    try {
      await deleteBarcode(deletingItem.serial);
      setDeletingItem(null);
      setToast({
        type: "success",
        message: `Barcode ${deletingItem.serial} deleted`,
      });
    } catch (err) {
      setToast({ type: "error", message: `Delete failed: ${err.message}` });
    }
  };

  const handleAddToCart = async (item) => {
    if (!activeSessionId) {
      setToast({
        type: "error",
        message: "No active POS session. Open the POS tab first.",
      });
      return;
    }
    if (item.status !== "IN_STOCK") {
      setToast({
        type: "error",
        message: `Cannot add item with status ${item.status}`,
      });
      return;
    }
    setAddingToCart(item.serial);
    try {
      await scanItem(item.serial);
      setToast({
        type: "success",
        message: `${item.serial} added to cart`,
      });
      refetch();
    } catch (err) {
      setToast({
        type: "error",
        message: `Failed to add to cart: ${err.message}`,
      });
    } finally {
      setAddingToCart(null);
    }
  };

  if (error) {
    return (
      <ErrorDisplay
        status={getErrorType(error)}
        errorMessage={error?.message}
        onRetry={refetch}
        showHomeButton={false}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/inventory")}
            className="p-2 rounded-xl bg-white/40 hover:bg-white/60 border border-white/50 transition-colors"
            title="Back to Inventory"
          >
            <ArrowLeft size={20} className="text-primary-700" />
          </button>
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold text-primary-800">
              {product
                ? `${product.brand} ${product.model}`
                : "Product Items"}
            </h1>
            <p className="text-primary-700/60 mt-1">
              {product
                ? `${product.productType} — ₹${product.sellingPrice?.toFixed(2)} — FIFO ordered`
                : "Loading product details..."}
            </p>
          </div>
        </div>

        <GlassButton variant="secondary" onClick={refetch} isLoading={isLoading}>
          Refresh
        </GlassButton>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center p-12">
          <Loader2 className="animate-spin text-primary-500" size={32} />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && items.length === 0 && (
        <GlassCard className="text-center py-16">
          <Package size={48} className="mx-auto mb-4 text-primary-700/30" />
          <p className="text-primary-700/50 text-sm">
            No barcode items found for this product.
          </p>
        </GlassCard>
      )}

      {/* Items table */}
      {!isLoading && items.length > 0 && (
        <GlassCard className="!p-0 overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-white/30">
            <Tag className="text-primary-600" size={20} />
            <h2 className="font-display font-semibold text-primary-800">
              Barcode Items
            </h2>
            <span className="ml-auto text-sm text-primary-700/60">
              {items.length} item{items.length !== 1 ? "s" : ""} (FIFO order)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/30">
                  <th className="text-left text-xs font-semibold text-primary-700/60 uppercase tracking-wide px-6 py-3">
                    #
                  </th>
                  <th className="text-left text-xs font-semibold text-primary-700/60 uppercase tracking-wide px-6 py-3">
                    <div className="flex items-center gap-1.5">
                      <Tag size={14} /> Serial
                    </div>
                  </th>
                  <th className="text-left text-xs font-semibold text-primary-700/60 uppercase tracking-wide px-6 py-3">
                    Status
                  </th>
                  <th className="text-left text-xs font-semibold text-primary-700/60 uppercase tracking-wide px-6 py-3">
                    <div className="flex items-center gap-1.5">
                      <Clock size={14} /> Created
                    </div>
                  </th>
                  <th className="text-left text-xs font-semibold text-primary-700/60 uppercase tracking-wide px-6 py-3">
                    Batch
                  </th>
                  <th className="text-right text-xs font-semibold text-primary-700/60 uppercase tracking-wide px-6 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/20">
                {items.map((item, idx) => {
                  const canDelete =
                    item.status === "IN_STOCK" || item.status === "DRAFT";
                  const canPurchase = item.status === "IN_STOCK";

                  return (
                    <tr
                      key={item.serial}
                      className="hover:bg-white/20 transition-colors"
                    >
                      <td className="px-6 py-4 text-xs text-primary-700/50 font-mono">
                        {idx + 1}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm text-primary-800 bg-primary-900/5 px-2 py-1 rounded">
                          {item.serial}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            STATUS_BADGES[item.status] ||
                            "bg-gray-100 text-gray-700 border-gray-300"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-primary-700/60">
                        {item.createdAt
                          ? new Date(item.createdAt).toLocaleString()
                          : "—"}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-primary-700/50">
                        {item.batchId?.slice(0, 8)}…
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {canPurchase && (
                            <button
                              onClick={() => handleAddToCart(item)}
                              disabled={addingToCart === item.serial}
                              className="p-2 text-primary-600 hover:text-white hover:bg-primary-500 rounded-lg transition-colors disabled:opacity-50"
                              title="Add to Cart"
                            >
                              {addingToCart === item.serial ? (
                                <Loader2
                                  size={16}
                                  className="animate-spin"
                                />
                              ) : (
                                <ShoppingCart size={16} />
                              )}
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => setDeletingItem(item)}
                              className="p-2 text-secondary-500/60 hover:text-white hover:bg-secondary-500 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                          {!canDelete && !canPurchase && (
                            <span className="text-xs text-primary-700/40 italic">
                              No actions
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* Delete confirmation modal */}
      <GlassModal
        open={!!deletingItem}
        onClose={() => setDeletingItem(null)}
        title="Delete Barcode Item"
        footer={
          <>
            <GlassButton
              variant="secondary"
              onClick={() => setDeletingItem(null)}
              disabled={isDeleting}
            >
              Cancel
            </GlassButton>
            <GlassButton
              variant="danger"
              onClick={handleDelete}
              isLoading={isDeleting}
            >
              Delete Item
            </GlassButton>
          </>
        }
      >
        <div className="flex items-start gap-4">
          <div className="p-3 bg-secondary-500/20 rounded-full text-secondary-600">
            <Trash2 size={24} />
          </div>
          <div>
            <h4 className="text-primary-800 font-semibold mb-1">
              Permanently delete this item?
            </h4>
            <p className="text-sm text-primary-700/70 mb-2">
              This will permanently remove barcode{" "}
              <code className="font-mono bg-primary-900/5 px-1.5 py-0.5 rounded text-primary-800">
                {deletingItem?.serial}
              </code>{" "}
              from inventory. This action cannot be undone.
            </p>
            {deletingItem?.status === "DRAFT" && (
              <p className="text-xs text-yellow-700 bg-yellow-50 rounded-lg px-3 py-2 border border-yellow-200">
                This item is still in DRAFT status and has not been committed to stock.
              </p>
            )}
          </div>
        </div>
      </GlassModal>

      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
}
