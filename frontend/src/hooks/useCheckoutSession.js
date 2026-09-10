import { useState, useCallback, useRef } from 'react';
import { posService } from '../api/apiCalls';

/**
 * Hook for POS checkout session management.
 * Endpoints:
 *  POST   /api/checkout/sessions/{sessionId}/items   — scan/lock a barcode
 *  GET    /api/checkout/sessions/{sessionId}/items    — list staged cart items
 *  POST   /api/checkout/sessions/{sessionId}/complete — finalize sale
 *  DELETE /api/checkout/sessions/{sessionId}/items/{serial} — remove item
 */
export function useCheckoutSession(sessionId) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [completing, setCompleting] = useState(false);
  const sessionRef = useRef(sessionId);

  const fetchItems = useCallback(async () => {
    if (!sessionRef.current) return;
    setLoading(true);
    setError(null);
    try {
      const response = await posService.getCartItems(sessionRef.current);
      const data = response.data || response;
      setItems(Array.isArray(data) ? data : data.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const scanItem = useCallback(async (serial) => {
    if (!sessionRef.current || !serial) return null;
    setLoading(true);
    setError(null);
    try {
      const data = await posService.scanItem(sessionRef.current, serial);
      await fetchItems();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchItems]);

  const removeItem = useCallback(async (serial) => {
    if (!sessionRef.current || !serial) return;
    setLoading(true);
    setError(null);
    try {
      await posService.removeItem(sessionRef.current, serial);
      await fetchItems();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchItems]);

  const completeCheckout = useCallback(async () => {
    if (!sessionRef.current) return null;
    setCompleting(true);
    setError(null);
    try {
      const data = await posService.completeCheckout(sessionRef.current);
      setItems([]);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setCompleting(false);
    }
  }, []);

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
