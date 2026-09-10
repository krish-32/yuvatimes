import api from './api';

// ==========================================
// INVENTORY & BARCODE MANAGEMENT
// ==========================================
export const inventoryService = {
  getProducts: () => api.get('/api/inventory/products'),
  getDraftBatches: () => api.get('/api/inventory/barcode-batches/drafts'),
  generateBatch: (payload) => api.post('/api/inventory/barcode-batches', payload),
  printZpl: (payload) => api.post('/api/v1/barcodes/print-zpl', payload),
  commitBatch: (batchId) => api.post(`/api/inventory/barcode-batches/${batchId}/commit`, {}, { headers: { 'Idempotency-Key': crypto.randomUUID() } }),
  revertBatch: (batchId) => api.post(`/api/inventory/barcode-batches/${batchId}/revert`),
};

// ==========================================
// POS / CHECKOUT SESSIONS
// ==========================================
export const posService = {
  getCartItems: (sessionId) => api.get(`/api/checkout/sessions/${sessionId}/items`),
  scanItem: (sessionId, serial) => api.post(`/api/checkout/sessions/${sessionId}/items`, { barcode: serial }, { headers: { 'Idempotency-Key': crypto.randomUUID() } }),
  removeItem: (sessionId, serial) => api.delete(`/api/checkout/sessions/${sessionId}/items/${serial}`),
  completeCheckout: (sessionId) => api.post(`/api/checkout/sessions/${sessionId}/complete`, {}, { headers: { 'Idempotency-Key': crypto.randomUUID() } }),
};
