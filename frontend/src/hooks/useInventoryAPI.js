import { useState, useCallback } from 'react';
import { inventoryService } from '../api/apiCalls';

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

  const getProducts = useCallback(() => wrap(() => inventoryService.getProducts()), [wrap]);

  const generateBatch = useCallback(
    (payload) => wrap(() => inventoryService.generateBatch(payload)),
    [wrap]
  );

  const printZpl = useCallback(
    (payload) => wrap(() => inventoryService.printZpl(payload)),
    [wrap]
  );

  const commitBatch = useCallback(
    (batchId) => wrap(() => inventoryService.commitBatch(batchId)),
    [wrap]
  );

  const revertBatch = useCallback(
    (batchId) => wrap(() => inventoryService.revertBatch(batchId)),
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
