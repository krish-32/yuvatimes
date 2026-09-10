import api from './api';

// ==========================================
// INVENTORY & BARCODE MANAGEMENT
// ==========================================
export const inventoryService = {
  getProducts: () => api.get('/api/inventory/products'),
  generateBatch: (payload) => api.post('/api/inventory/barcode-batches', payload),
  printZpl: (serials) => api.post('/api/v1/barcodes/print-zpl', { serials }),
  commitBatch: (batchId) => api.post(`/api/inventory/barcode-batches/${batchId}/commit`),
  revertBatch: (batchId) => api.post(`/api/inventory/barcode-batches/${batchId}/revert`),
};

// ==========================================
// POS / CHECKOUT SESSIONS
// ==========================================
export const posService = {
  getCartItems: (sessionId) => api.get(`/api/checkout/sessions/${sessionId}/items`),
  scanItem: (sessionId, serial) => api.post(`/api/checkout/sessions/${sessionId}/items`, { serial }),
  removeItem: (sessionId, serial) => api.delete(`/api/checkout/sessions/${sessionId}/items/${serial}`),
  completeCheckout: (sessionId) => api.post(`/api/checkout/sessions/${sessionId}/complete`),
};
