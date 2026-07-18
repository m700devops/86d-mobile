// API Configuration
export const API_BASE_URL = 'https://eight6d-api.onrender.com';
export const API_VERSION = '/v1';
export const API_URL = `${API_BASE_URL}${API_VERSION}`;

// Crash/error reporting — a Sentry DSN is meant to be public (write-only
// ingestion endpoint), safe to commit. Leave empty to skip Sentry entirely;
// create a free project at sentry.io (React Native platform) and paste the
// DSN here to turn it on.
export const SENTRY_DSN = '';

// Storage keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: '@86d_access_token',
  REFRESH_TOKEN: '@86d_refresh_token',
  USER_DATA: '@86d_user_data',
} as const;
