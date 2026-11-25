import apiClient from '@shared/api/client';

export const authApi = {
  register: (payload) => apiClient('/auth/register', { method: 'POST', body: payload }),
  login: (payload) => apiClient('/auth/login', { method: 'POST', body: payload }),
  logout: () => apiClient('/auth/logout', { method: 'POST' }),
  getMe: () => apiClient('/auth/me'),
  updateProfile: (payload) => apiClient('/auth/me', { method: 'PATCH', body: payload })
};

export default authApi;
