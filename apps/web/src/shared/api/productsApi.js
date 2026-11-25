import apiClient from '@shared/api/client';

export const productsApi = {
  getProducts: (params = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, val);
      }
    });
    const queryString = searchParams.toString();
    return apiClient(`/products${queryString ? `?${queryString}` : ''}`);
  },

  getProductById: (id) => apiClient(`/products/${id}`),

  searchProducts: (query) => apiClient(`/products/search?q=${encodeURIComponent(query)}`),

  getCategories: () => apiClient('/products/categories'),

  getBrands: () => apiClient('/products/brands'),

  checkDuplicate: ({ name, brand, excludeId }) => {
    const params = new URLSearchParams();
    if (name) params.append('name', name);
    if (brand) params.append('brand', brand);
    if (excludeId) params.append('excludeId', excludeId);
    return apiClient(`/products/check-duplicate?${params.toString()}`);
  },

  getSuggestions: ({ q, mode = 'retail', limit = 50 } = {}) => {
    const params = new URLSearchParams();
    if (q) params.append('q', q);
    if (mode) params.append('mode', mode);
    if (limit) params.append('limit', limit);
    return apiClient(`/products/suggest?${params.toString()}`);
  }
};

export default productsApi;
