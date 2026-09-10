import { useState, useCallback, useRef } from 'react';
import api from '../api/api';

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
      const data = await api.get(`/api/checkout/sessions/${sessionRef.current}/items`);
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
      const data = await api.post(
        `/api/checkout/sessions/${sessionRef.current}/items`,
        { serial }
      );
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
      await api.delete(`/api/checkout/sessions/${sessionRef.current}/items/${serial}`);
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
      const data = await api.post(`/api/checkout/sessions/${sessionRef.current}/complete`);
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
