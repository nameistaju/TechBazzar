import apiClient from './client';

export const ordersApi = {
  createOrder: (payload) => apiClient('/orders', { method: 'POST', body: payload }),
  trackOrder: ({ orderNumber, contact, trackingToken }) => 
    apiClient('/orders/track', { method: 'POST', body: { orderNumber, contact, trackingToken } }),
  getMyOrders: () => apiClient('/orders/my')
};

export default ordersApi;
