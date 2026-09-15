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

// ==========================================
// SALES HISTORY
// ==========================================
export const salesService = {
  getSales: async (limit = 50, offset = 0) => {
    const response = await api.get(`/api/sales?limit=${limit}&offset=${offset}`);
    return response;
  },
  exportAndPurgeSales: async () => {
    // Download as a Blob
    const response = await api.post(`/api/sales/export`, null, {
      responseType: 'blob',
    });
    
    // Create a temporary link to force browser download
    const url = window.URL.createObjectURL(new Blob([response]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sales_export.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
    
    return true;
  }
};
