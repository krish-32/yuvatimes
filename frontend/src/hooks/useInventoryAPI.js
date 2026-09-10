import { useState, useCallback } from 'react';
import api from '../api/api';

/**
 * Hook for inventory & barcode management API calls.
 * Endpoints:
 *  GET  /api/inventory/products
 *  POST /api/inventory/barcode-batches
 *  POST /api/v1/barcodes/print-zpl
 *  POST /api/inventory/barcode-batches/{batchId}/commit
 *  POST /api/inventory/barcode-batches/{batchId}/revert
 */
export function useInventoryAPI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const wrap = useCallback(async (fn) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fn();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getProducts = useCallback(() => wrap(() => api.get('/api/inventory/products')), [wrap]);

  const generateBatch = useCallback(
    (payload) => wrap(() => api.post('/api/inventory/barcode-batches', payload)),
    [wrap]
  );

  const printZpl = useCallback(
    (serials) => wrap(() => api.post('/api/v1/barcodes/print-zpl', { serials })),
    [wrap]
  );

  const commitBatch = useCallback(
    (batchId) => wrap(() => api.post(`/api/inventory/barcode-batches/${batchId}/commit`)),
    [wrap]
  );

  const revertBatch = useCallback(
    (batchId) => wrap(() => api.post(`/api/inventory/barcode-batches/${batchId}/revert`)),
    [wrap]
  );

  return {
    loading,
    error,
    getProducts,
    generateBatch,
    printZpl,
    commitBatch,
    revertBatch,
  };
}
