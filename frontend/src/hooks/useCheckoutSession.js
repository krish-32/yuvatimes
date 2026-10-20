import { useState, useCallback, useEffect } from "react";
import { posService } from "../api/apiCalls";
import { usePosStore } from "../store/usePosStore";
import { useCartStore } from "../store/useCartStore";
import { useToastStore } from "../store/useToastStore";
import { queryClient, inventoryKeys, dashboardKeys } from "../lib/queryClient";

/**
 * Hook for POS checkout session management integrating with Zustand multi-session store.
 * Enhanced with optimistic UI updates and automated rollback on failure.
 */
export function useCheckoutSession(sessionId) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [completing, setCompleting] = useState(false);

  // Grab the sync actions from our store
  const syncItems = usePosStore((state) => state.syncItems);
  const clearSessionItems = usePosStore((state) => state.clearSessionItems);

  // Cart awareness store
  const addSerial = useCartStore((state) => state.addSerial);
  const removeSerialFromCart = useCartStore((state) => state.removeSerial);
  const syncSerials = useCartStore((state) => state.syncSerials);

  // Toast notifications
  const addToast = useToastStore((state) => state.addToast);

  // Grab the items for THIS specific session
  const items = usePosStore(
    (state) => state.sessions.find((s) => s.id === sessionId)?.items || [],
  );

  // Sync cart store whenever POS session items change
  useEffect(() => {
    const allSessions = usePosStore.getState().sessions;
    const allSerials = allSessions.flatMap((s) =>
      s.items.map((item) => item.serial || item.barcode),
    ).filter(Boolean);
    syncSerials(allSerials);
  }, [items, syncSerials]);

  const fetchItems = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await posService.getCartItems(sessionId);
      const data = response.data || response;
      const fetchedItems = Array.isArray(data) ? data : data.items || [];
      const flattenedItems = fetchedItems.map((item) => ({
        ...item,
        ...(item.product || {}),
      }));
      syncItems(sessionId, flattenedItems);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sessionId, syncItems]);

  // Read the LATEST items for a session directly from the store.
  // Avoids stale-closure races when rapid add/remove actions are issued
  // before React re-renders with the updated items array.
  const getCurrentItems = useCallback(
    () =>
      usePosStore
        .getState()
        .sessions.find((s) => s.id === sessionId)?.items || [],
    [sessionId],
  );

  const scanItem = useCallback(
    async (serial) => {
      if (!sessionId || !serial) return null;
      setLoading(true);
      setError(null);

      const currentItems = getCurrentItems();

      // ── Optimistic Update: immediately track serial in cart ──
      addSerial(serial);
      // Optimistically add a placeholder item to the session so the floating
      // cart bar and cart list update instantly (replaced by fetchItems on success).
      const optimisticItems = [
        ...currentItems,
        { serial, barcode: serial, status: "STAGED" },
      ];
      syncItems(sessionId, optimisticItems);

      try {
        const data = await posService.scanItem(sessionId, serial);
        addToast("success", "Item added to cart");
        // Fire-and-forget: refresh cart + invalidate caches in background for faster perceived performance.
        Promise.all([
          fetchItems(),
          queryClient.invalidateQueries({ queryKey: inventoryKeys.all }),
          queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
        ]).catch(() => {});
        return data;
      } catch (err) {
        // ── Rollback: remove the optimistically added serial & restore items ──
        removeSerialFromCart(serial);
        syncItems(sessionId, currentItems);
        setLoading(false);
        setError(err.message);
        addToast("error", `Failed to add to cart: ${err.message}`);
        throw err;
      }
    },
    [sessionId, getCurrentItems, fetchItems, addSerial, removeSerialFromCart, syncItems, addToast],
  );

  const removeItem = useCallback(
    async (serial) => {
      if (!sessionId || !serial) return;
      setLoading(true);
      setError(null);

      // ── Optimistic Update: capture previous state & remove serial ──
      const currentItems = getCurrentItems();
      const previousItems = [...currentItems];
      removeSerialFromCart(serial);

      // Optimistically remove item from the local store
      const optimisticItems = currentItems.filter(
        (item) => (item.serial || item.barcode) !== serial,
      );
      syncItems(sessionId, optimisticItems);

      try {
        await posService.removeItem(sessionId, serial);
        // Run cart refresh + cache invalidations in parallel
        await Promise.all([
          fetchItems(),
          queryClient.invalidateQueries({ queryKey: inventoryKeys.all }),
          queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
        ]);
      } catch (err) {
        // ── Rollback: restore previous items and cart state ──
        syncItems(sessionId, previousItems);
        addSerial(serial);
        setError(err.message);
        addToast("error", `Failed to remove from cart: ${err.message}`);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [sessionId, getCurrentItems, fetchItems, syncItems, addSerial, removeSerialFromCart, addToast],
  );

  const completeCheckout = useCallback(
    async (discountAmount = 0) => {
      if (!sessionId) return null;
      setCompleting(true);
      setError(null);
      try {
        const data = await posService.completeCheckout(
          sessionId,
          discountAmount,
        );
        clearSessionItems(sessionId);
        // Invalidate all related caches in parallel
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: inventoryKeys.all }),
          queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
          queryClient.resetQueries({ queryKey: ["sales"] }),
        ]);
        addToast("success", "Sale completed successfully!");
        return data;
      } catch (err) {
        setError(err.message);
        addToast("error", `Checkout failed: ${err.message}`);
        throw err;
      } finally {
        setCompleting(false);
      }
    },
    [sessionId, clearSessionItems, addToast],
  );

  return {
    items,
    loading,
    error,
    completing,
    fetchItems,
    scanItem,
    removeItem,
    completeCheckout,
  };
}
