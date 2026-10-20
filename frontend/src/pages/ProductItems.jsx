import { useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Tag,
  Trash2,
  ShoppingCart,
  Loader2,
  Package,
  Clock,
  MinusCircle,
} from "lucide-react";
import GlassCard from "../components/GlassCard";
import GlassButton from "../components/GlassButton";
import GlassModal from "../components/GlassModal";
import ErrorDisplay, { getErrorType } from "../components/ErrorDisplay";
import { useProductItems, useDeleteBarcode } from "../hooks/useInventoryAPI";
import { useCheckoutSession } from "../hooks/useCheckoutSession";
import { usePosStore } from "../store/usePosStore";
import { useCartStore } from "../store/useCartStore";
import { useToastStore } from "../store/useToastStore";
import { inventoryKeys } from "../lib/queryClient";

const STATUS_BADGES = {
  DRAFT: "bg-yellow-100 text-yellow-800 border-yellow-300",
  IN_STOCK: "bg-green-100 text-green-800 border-green-300",
  STAGED: "bg-blue-100 text-blue-800 border-blue-300",
  SOLD: "bg-primary-100 text-primary-800 border-primary-300",
};

/** Safely format a date string; returns "—" for missing/invalid values. */
const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
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
  const { scanItem, removeItem } = useCheckoutSession(activeSessionId);

  // Cart awareness — optimistic state.
  // Select the Set itself (not the isInCart method) so the component
  // re-renders when serials are added/removed optimistically.
  const cartSerials = useCartStore((state) => state._cartSerials);
  const addToast = useToastStore((state) => state.addToast);

  // Query client for optimistic cache updates (delete rollback)
  const queryClient = useQueryClient();

  const [deletingItem, setDeletingItem] = useState(null);
  const [addingToCart, setAddingToCart] = useState(null);
  const [removingFromCart, setRemovingFromCart] = useState(null);

  // Memoize product metadata derived from first item (all items share the same product)
  const product = useMemo(() => (items.length > 0 ? items[0] : null), [items]);

  /* ── Optimistic Delete ────────────────────────────────── */
  const handleDelete = useCallback(async () => {
    if (!deletingItem || isDeleting) return;
    const serial = deletingItem.serial;
    const queryKey = inventoryKeys.productItems(productId);

    // Cancel any in-flight refetches so they don't clobber the optimistic state
    await queryClient.cancelQueries({ queryKey });
    const previousItems = queryClient.getQueryData(queryKey) || [];

    // ── Optimistic Update: remove item from local list immediately ──
    queryClient.setQueryData(queryKey, (old = []) =>
      old.filter((item) => item.serial !== serial),
    );
    setDeletingItem(null);

    try {
      await deleteBarcode(serial);
      addToast("success", `Barcode ${serial} deleted`);
    } catch (err) {
      // ── Rollback: restore the exact previous snapshot ──
      queryClient.setQueryData(queryKey, previousItems);
      addToast("error", `Delete failed: ${err.message}`);
    }
  }, [deletingItem, isDeleting, deleteBarcode, addToast, queryClient, productId]);

  /* ── Optimistic Add to Cart ───────────────────────────── */
  const handleAddToCart = useCallback(
    async (item) => {
      if (!activeSessionId) {
        addToast("error", "No active POS session. Open the POS tab first.");
        return;
      }
      if (item.status !== "IN_STOCK") {
        addToast("error", `Cannot add item with status ${item.status}`);
        return;
      }
      setAddingToCart(item.serial);
      try {
        await scanItem(item.serial);
        // Success feedback is a non-intrusive toast from useCheckoutSession
        // Fire-and-forget refetch with silent error handling
        refetch().catch(() => {});
      } catch {
        // Error already handled by useCheckoutSession (toast + rollback)
      } finally {
        setAddingToCart(null);
      }
    },
    [activeSessionId, scanItem, refetch, addToast],
  );

  /* ── Optimistic Remove from Cart ──────────────────────── */
  const handleRemoveFromCart = useCallback(
    async (item) => {
      if (!activeSessionId) return;
      setRemovingFromCart(item.serial);
      try {
        await removeItem(item.serial);
        addToast("success", `Removed ${item.serial} from cart`);
        // Refetch product items to update status
        refetch().catch(() => {});
      } catch {
        // Error already handled by useCheckoutSession (toast + rollback)
      } finally {
        setRemovingFromCart(null);
      }
    },
    [activeSessionId, removeItem, refetch, addToast],
  );

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
            aria-label="Back to Inventory"
          >
            <ArrowLeft size={20} className="text-primary-700" />
          </button>
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold text-primary-800">
              {product ? `${product.brand} ${product.model}` : "Product Items"}
            </h1>
            <p className="text-primary-700/60 mt-1">
              {product
                ? `${product.productType} — ₹${product.sellingPrice?.toFixed(2)}`
                : "Loading product details..."}
            </p>
          </div>
        </div>

        <GlassButton
          variant="secondary"
          onClick={refetch}
          isLoading={isLoading}
        >
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
              {items.length} item{items.length !== 1 ? "s" : ""}
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
                  const itemInCart = cartSerials.has(item.serial);
                  const canDelete =
                    (item.status === "IN_STOCK" || item.status === "DRAFT") && !itemInCart;
                  const canPurchase = item.status === "IN_STOCK" && !itemInCart;
                  const canRemoveFromCart = itemInCart && item.status === "STAGED";
                  const isAdding = addingToCart === item.serial;
                  const isRemoving = removingFromCart === item.serial;

                  return (
                    <tr
                      key={item.serial}
                      className={`hover:bg-white/20 transition-colors ${
                        itemInCart ? "bg-primary-500/5" : ""
                      }`}
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
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            STATUS_BADGES[item.status] ||
                            "bg-gray-100 text-gray-700 border-gray-300"
                          }`}
                        >
                          {itemInCart && (
                            <ShoppingCart size={10} className="shrink-0" />
                          )}
                          {item.status}
                          {itemInCart && " (In Cart)"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-primary-700/60">
                        {formatDate(item.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-primary-700/50">
                        {item.batchId ? `${item.batchId.slice(0, 8)}…` : "—"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          {/* Add to Cart — shown when item is NOT in cart and is IN_STOCK */}
                          {canPurchase && (
                            <button
                              onClick={() => handleAddToCart(item)}
                              disabled={isAdding}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-all duration-200 disabled:opacity-50 shadow-sm hover:shadow-md active:scale-95"
                              aria-label={`Add ${item.serial} to cart`}
                            >
                              {isAdding ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <ShoppingCart size={14} />
                              )}
                              <span className="hidden sm:inline">
                                Add to Cart
                              </span>
                            </button>
                          )}

                          {/* Remove from Cart — shown when item IS in cart */}
                          {(itemInCart || canRemoveFromCart) && (
                            <button
                              onClick={() => handleRemoveFromCart(item)}
                              disabled={isRemoving}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-orange-700 bg-orange-500/15 hover:bg-orange-500 hover:text-white rounded-lg transition-all duration-200 disabled:opacity-50 shadow-sm hover:shadow-md active:scale-95 border border-orange-300/30"
                              aria-label={`Remove ${item.serial} from cart`}
                            >
                              {isRemoving ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <MinusCircle size={14} />
                              )}
                              <span className="hidden sm:inline">
                                Remove from Cart
                              </span>
                            </button>
                          )}

                          {/* Delete — hidden when item is in cart to avoid state conflicts */}
                          {canDelete && (
                            <button
                              onClick={() => setDeletingItem(item)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-secondary-600 bg-secondary-500/10 hover:bg-secondary-500 hover:text-white rounded-lg transition-all duration-200 active:scale-95"
                              aria-label={`Delete barcode ${item.serial}`}
                            >
                              <Trash2 size={14} />
                              <span className="hidden sm:inline">Delete</span>
                            </button>
                          )}

                          {!canDelete && !canPurchase && !itemInCart && !canRemoveFromCart && (
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
                This item is still in DRAFT status and has not been committed to
                stock.
              </p>
            )}
          </div>
        </div>
      </GlassModal>

    </div>
  );
}
