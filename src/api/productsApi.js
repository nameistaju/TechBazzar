import apiClient from './client';

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

  getBrands: () => apiClient('/products/brands')
};

export default productsApi;
