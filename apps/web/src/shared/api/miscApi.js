import apiClient from '@shared/api/client';

export const miscApi = {
  subscribeNewsletter: (email) => apiClient('/newsletter', { method: 'POST', body: { email } }),
  notifyMe: (productId, email) => apiClient('/notify-me', { method: 'POST', body: { productId, email } })
};

export default miscApi;
