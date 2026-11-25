/**
 * Central API Client for TechBazaar
 * Automatically handles credentials, JSON parsing, and consistent { data, error } responses.
 */

const BASE_URL = '/api';

export async function apiClient(endpoint, { method = 'GET', body, headers = {}, ...options } = {}) {
  const config = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    credentials: 'include',
    ...options
  };

  if (body !== undefined) {
    config.body = JSON.stringify(body);
  }

  try {
    const url = endpoint.startsWith('/') ? `${BASE_URL}${endpoint}` : `${BASE_URL}/${endpoint}`;
    const response = await fetch(url, config);

    let json;
    try {
      json = await response.json();
    } catch {
      json = { data: null, error: response.statusText || 'Unknown server response' };
    }

    if (!response.ok) {
      return {
        data: null,
        error: json.error || `Request failed with status ${response.status}`,
        status: response.status
      };
    }

    return {
      data: json.data,
      error: null,
      status: response.status
    };
  } catch {
    return {
      data: null,
      error: 'Can\'t reach the server. Please check your connection and retry.',
      status: 0
    };
  }
}

export default apiClient;
