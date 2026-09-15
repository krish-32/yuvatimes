import { useState, useCallback } from 'react';
import { posService } from '../api/apiCalls';
import { usePosStore } from '../store/usePosStore';

/**
 * Hook for POS checkout session management integrating with Zustand multi-session store.
 */
export function useCheckoutSession(sessionId) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [completing, setCompleting] = useState(false);

  // Grab the sync actions from our store
  const syncItems = usePosStore((state) => state.syncItems);
  const clearSessionItems = usePosStore((state) => state.clearSessionItems);
  
  // Grab the items for THIS specific session
  const items = usePosStore(
    (state) => state.sessions.find((s) => s.id === sessionId)?.items || []
  );

  const fetchItems = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await posService.getCartItems(sessionId);
      const data = response.data || response;
      const fetchedItems = Array.isArray(data) ? data : data.items || [];
      syncItems(sessionId, fetchedItems);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sessionId, syncItems]);

  const scanItem = useCallback(async (serial) => {
    if (!sessionId || !serial) return null;
    setLoading(true);
    setError(null);
    try {
      const data = await posService.scanItem(sessionId, serial);
      await fetchItems();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [sessionId, fetchItems]);

  const removeItem = useCallback(async (serial) => {
    if (!sessionId || !serial) return;
    setLoading(true);
    setError(null);
    try {
      await posService.removeItem(sessionId, serial);
      await fetchItems();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [sessionId, fetchItems]);

  const completeCheckout = useCallback(async () => {
    if (!sessionId) return null;
    setCompleting(true);
    setError(null);
    try {
      const data = await posService.completeCheckout(sessionId);
      clearSessionItems(sessionId);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setCompleting(false);
    }
  }, [sessionId, clearSessionItems]);

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
