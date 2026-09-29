import api from './api';

const generateUUID = () => {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
};
// ==========================================
// INVENTORY & BARCODE MANAGEMENT
// ==========================================
export const inventoryService = {
  getProducts: () => api.get('/api/inventory/products'),
  getDraftBatches: () => api.get('/api/inventory/barcode-batches/drafts'),
  generateBatch: (payload) => api.post('/api/inventory/barcode-batches', payload),
  printZpl: (payload) => api.post('/api/v1/barcodes/print-zpl', payload),
  commitBatch: (batchId) => api.post(`/api/inventory/barcode-batches/${batchId}/commit`, {}, { headers: { 'Idempotency-Key': generateUUID() } }),
  revertBatch: (batchId) => api.post(`/api/inventory/barcode-batches/${batchId}/revert`),
};

// ==========================================
// POS / CHECKOUT SESSIONS
// ==========================================
export const posService = {
  getCartItems: (sessionId) => api.get(`/api/checkout/sessions/${sessionId}/items?_t=${Date.now()}`),
  scanItem: (sessionId, serial) => api.post(`/api/checkout/sessions/${sessionId}/items`, { barcode: serial }, { headers: { 'Idempotency-Key': generateUUID() } }),
  removeItem: (sessionId, serial) => api.delete(`/api/checkout/sessions/${sessionId}/items/${serial}`),
  completeCheckout: (sessionId, discountAmount = 0) => api.post(`/api/checkout/sessions/${sessionId}/complete`, { discountAmount }, { headers: { 'Idempotency-Key': generateUUID() } }),
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
