import apiClient from '@shared/api/client';

export const addressesApi = {
  getAddresses: () => apiClient('/addresses'),
  createAddress: (payload) => apiClient('/addresses', { method: 'POST', body: payload }),
  setDefaultAddress: (id) => apiClient(`/addresses/${id}/default`, { method: 'PATCH' }),
  deleteAddress: (id) => apiClient(`/addresses/${id}`, { method: 'DELETE' })
};

export default addressesApi;
