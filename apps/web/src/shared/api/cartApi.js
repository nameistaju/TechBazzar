import apiClient from '@shared/api/client';

export const cartApi = {
  validateCart: (items) => apiClient('/cart/validate', { method: 'POST', body: { items } }),
  getCart: () => apiClient('/cart'),
  syncCart: (items) => apiClient('/cart/sync', { method: 'POST', body: { items } }),
  getWishlist: () => apiClient('/cart/wishlist'),
  syncWishlist: (productIds) => apiClient('/cart/wishlist/sync', { method: 'POST', body: { productIds } })
};

export default cartApi;
