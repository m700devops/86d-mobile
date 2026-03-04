// API Configuration
export const API_BASE_URL = 'https://eight6d-api.onrender.com';
export const API_VERSION = '/v1';
export const API_URL = `${API_BASE_URL}${API_VERSION}`;

// Storage keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: '@86d_access_token',
  REFRESH_TOKEN: '@86d_refresh_token',
  USER_DATA: '@86d_user_data',
} as const;
