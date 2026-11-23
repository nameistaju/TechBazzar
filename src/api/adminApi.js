// src/api/adminApi.js
// Client API layer for TechBazaar Single-Owner Business Back-Office

import apiClient from './client';

export const adminApi = {
  // 1. Account & Security
  getAdminMe: () => apiClient('/admin/me'),
  updateProfile: (payload) => apiClient('/admin/profile', { method: 'PATCH', body: payload }),
  changePassword: (payload) => apiClient('/admin/change-password', { method: 'POST', body: payload }),
  forgotPassword: (payload) => apiClient('/admin/forgot-password', { method: 'POST', body: payload }),

  // 2. Dashboard
  getStats: (range = '30d') => apiClient(`/admin/stats?range=${range}`),

  // 3. Products
  getProducts: (params = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, val);
      }
    });
    const qs = searchParams.toString();
    return apiClient(`/admin/products${qs ? `?${qs}` : ''}`);
  },
  getProduct: (id) => apiClient(`/admin/products/${id}`),
  getImages: () => apiClient('/admin/products/images'),
  createProduct: (payload) => apiClient('/admin/products', { method: 'POST', body: payload }),
  updateProduct: (id, payload) => apiClient(`/admin/products/${id}`, { method: 'PATCH', body: payload }),
  duplicateProduct: (id) => apiClient(`/admin/products/${id}/duplicate`, { method: 'POST' }),
  deleteProduct: (id) => apiClient(`/admin/products/${id}`, { method: 'DELETE' }),
  restoreProduct: (id) => apiClient(`/admin/products/${id}/restore`, { method: 'POST' }),
  bulkAction: (payload) => apiClient('/admin/products/bulk', { method: 'POST', body: payload }),
  getExportProductsUrl: () => '/api/admin/products/export/csv',

  // 4. Inventory
  getInventory: (params = {}) => {
    const sp = new URLSearchParams(params).toString();
    return apiClient(`/admin/inventory${sp ? `?${sp}` : ''}`);
  },
  adjustStock: (payload) => apiClient('/admin/inventory/adjust', { method: 'POST', body: payload }),
  getMovements: (params = {}) => {
    const sp = new URLSearchParams(params).toString();
    return apiClient(`/admin/inventory/movements${sp ? `?${sp}` : ''}`);
  },

  // 5. Orders
  getOrders: (params = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, val);
      }
    });
    const qs = searchParams.toString();
    return apiClient(`/admin/orders${qs ? `?${qs}` : ''}`);
  },
  getOrder: (id) => apiClient(`/admin/orders/${id}`),
  updateOrder: (id, payload) => apiClient(`/admin/orders/${id}`, { method: 'PATCH', body: payload }),
  createInvoiceFromOrder: (id) => apiClient(`/admin/orders/${id}/create-invoice`, { method: 'POST' }),
  createManualOrder: (payload) => apiClient('/admin/orders/manual', { method: 'POST', body: payload }),

  // 6. Discounts
  getDiscounts: () => apiClient('/admin/discounts'),
  createDiscount: (payload) => apiClient('/admin/discounts', { method: 'POST', body: payload }),
  updateDiscount: (id, payload) => apiClient(`/admin/discounts/${id}`, { method: 'PATCH', body: payload }),
  deleteDiscount: (id) => apiClient(`/admin/discounts/${id}`, { method: 'DELETE' }),
  simulateDiscount: (payload) => apiClient('/admin/discounts/simulate', { method: 'POST', body: payload }),

  // 7. Estimates
  getEstimates: (params = {}) => {
    const sp = new URLSearchParams(params).toString();
    return apiClient(`/admin/estimates${sp ? `?${sp}` : ''}`);
  },
  getEstimate: (id) => apiClient(`/admin/estimates/${id}`),
  createEstimate: (payload) => apiClient('/admin/estimates', { method: 'POST', body: payload }),
  convertEstimateToInvoice: (id) => apiClient(`/admin/estimates/${id}/convert-to-invoice`, { method: 'POST' }),
  getEstimatePdfUrl: (id) => `/api/admin/estimates/${id}/pdf`,

  // 8. Invoices
  getInvoices: (params = {}) => {
    const sp = new URLSearchParams(params).toString();
    return apiClient(`/admin/invoices${sp ? `?${sp}` : ''}`);
  },
  getInvoice: (id) => apiClient(`/admin/invoices/${id}`),
  createInvoice: (payload) => apiClient('/admin/invoices', { method: 'POST', body: payload }),
  recordPayment: (id, payload) => apiClient(`/admin/invoices/${id}/payments`, { method: 'POST', body: payload }),
  voidInvoice: (id, payload) => apiClient(`/admin/invoices/${id}/void`, { method: 'POST', body: payload }),
  getInvoicePdfUrl: (id) => `/api/admin/invoices/${id}/pdf`,

  // 9. Customers
  getCustomers: (params = {}) => {
    const sp = new URLSearchParams(params).toString();
    return apiClient(`/admin/customers${sp ? `?${sp}` : ''}`);
  },
  getCustomer: (id) => apiClient(`/admin/customers/${id}`),
  createCustomer: (payload) => apiClient('/admin/customers', { method: 'POST', body: payload }),
  mergeCustomers: (payload) => apiClient('/admin/customers/merge', { method: 'POST', body: payload }),

  // 10. Reports
  getSalesReport: (params = {}) => {
    const sp = new URLSearchParams(params).toString();
    return apiClient(`/admin/reports/sales${sp ? `?${sp}` : ''}`);
  },
  getProductsReport: () => apiClient('/admin/reports/products'),
  getCategoriesReport: () => apiClient('/admin/reports/categories'),
  getDiscountsReport: () => apiClient('/admin/reports/discounts'),
  getTaxReport: () => apiClient('/admin/reports/tax'),
  getStockValuationReport: () => apiClient('/admin/reports/stock-valuation'),

  // 11. Settings
  getSettings: () => apiClient('/admin/settings'),
  saveSettings: (payload) => apiClient('/admin/settings', { method: 'POST', body: payload }),
  getBackupUrl: () => '/api/admin/settings/backup',
  purgeLogs: () => apiClient('/admin/settings/purge-logs', { method: 'POST' }),

  // 12. Activity Log
  getActivityLog: (params = {}) => {
    const sp = new URLSearchParams(params).toString();
    return apiClient(`/admin/activity-log${sp ? `?${sp}` : ''}`);
  },
  undoActivity: (id) => apiClient(`/admin/activity-log/${id}/undo`, { method: 'POST' })
};

export default adminApi;
