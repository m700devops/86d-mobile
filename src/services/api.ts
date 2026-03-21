import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, STORAGE_KEYS } from '../config/api';
import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User,
  Product,
  ProductListResponse,
  ProductSearchResponse,
  Location,
  ParLevel,
  InventorySession,
  InventorySessionDetail,
  Scan,
  ScanResponse,
  Distributor,
  ProductDistributorAssignment,
  ApiError
} from '../types';

class ApiService {
  private client: AxiosInstance;
  private refreshPromise: Promise<string> | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      timeout: 90000, // 90s — accounts for Render cold start (30s) + image upload + Claude API
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor - add auth token
    this.client.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        const token = await this.getAccessToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<ApiError>) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newToken = await this.refreshAccessToken();
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            return this.client(originalRequest);
          } catch (refreshError) {
            // Refresh failed, logout user
            await this.logout();
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Token management
  async getAccessToken(): Promise<string | null> {
    return AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  }

  async getRefreshToken(): Promise<string | null> {
    return AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  }

  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
  }

  async clearTokens(): Promise<void> {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.ACCESS_TOKEN,
      STORAGE_KEYS.REFRESH_TOKEN,
      STORAGE_KEYS.USER_DATA,
    ]);
  }

  async getUserData(): Promise<User | null> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
    return data ? JSON.parse(data) : null;
  }

  async setUserData(user: User): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
  }

  // Auth methods
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/auth/register', data);
    const { access_token, refresh_token, user } = response.data;
    await this.setTokens(access_token, refresh_token);
    await this.setUserData(user);
    return response.data;
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/auth/login', data);
    const { access_token, refresh_token, user } = response.data;
    await this.setTokens(access_token, refresh_token);
    await this.setUserData(user);
    return response.data;
  }

  async refreshAccessToken(): Promise<string> {
    // Prevent multiple simultaneous refresh requests
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const refreshToken = await this.getRefreshToken();
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await axios.post<{ access_token: string; expires_in: number }>(
          `${API_URL}/auth/refresh`,
          { refresh_token: refreshToken }
        );

        const { access_token } = response.data;
        await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, access_token);
        return access_token;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  async logout(): Promise<void> {
    await this.clearTokens();
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.client.get<User>('/users/me');
    await this.setUserData(response.data);
    return response.data;
  }

  // Product methods
  async getProducts(category?: string, limit = 50, offset = 0): Promise<ProductListResponse> {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());
    
    const response = await this.client.get<ProductListResponse>(`/products?${params}`);
    return response.data;
  }

  async searchProducts(query: string, limit = 20): Promise<ProductSearchResponse> {
    const response = await this.client.get<ProductSearchResponse>(
      `/products/search?q=${encodeURIComponent(query)}&limit=${limit}`
    );
    return response.data;
  }

  async getProductByBarcode(upc: string): Promise<Product | null> {
    try {
      const response = await this.client.get<{ product: Product }>(`/products/barcode/${upc}`);
      return response.data.product;
    } catch (error) {
      if ((error as AxiosError).response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  // Location methods
  async getLocations(): Promise<Location[]> {
    const response = await this.client.get<{ locations: Location[] }>('/locations');
    return response.data.locations;
  }

  async createLocation(name: string, address?: string, timezone = 'America/New_York'): Promise<Location> {
    const response = await this.client.post<{ location: Location }>('/locations', {
      name,
      address,
      timezone,
    });
    return response.data.location;
  }

  async getParLevels(locationId: string): Promise<ParLevel[]> {
    const response = await this.client.get<{ par_levels: ParLevel[] }>(
      `/locations/${locationId}/par-levels`
    );
    return response.data.par_levels;
  }

  // Inventory session methods
  async startInventory(locationId: string, deviceId?: string, appVersion?: string): Promise<InventorySession> {
    const response = await this.client.post<{ session: InventorySession }>('/inventory/start', {
      location_id: locationId,
      device_id: deviceId,
      app_version: appVersion,
    });
    return response.data.session;
  }

  async getInventorySession(sessionId: string): Promise<InventorySessionDetail> {
    const response = await this.client.get<InventorySessionDetail>(`/inventory/${sessionId}`);
    return response.data;
  }

  async addScan(sessionId: string, scan: Scan): Promise<ScanResponse> {
    const response = await this.client.post<{ scan: ScanResponse; session_total: number }>(
      `/inventory/${sessionId}/scan`,
      scan
    );
    return response.data.scan;
  }

  async addScansBulk(sessionId: string, scans: Scan[]): Promise<ScanResponse[]> {
    const response = await this.client.post<{ scans: ScanResponse[] }>(
      `/inventory/${sessionId}/scan/bulk`,
      { scans }
    );
    return response.data.scans;
  }

  async completeInventory(sessionId: string): Promise<{ session: InventorySession; order: any }> {
    const response = await this.client.post(`/inventory/${sessionId}/complete`);
    return response.data;
  }

  async cancelInventory(sessionId: string): Promise<InventorySession> {
    const response = await this.client.post<{ session: InventorySession }>(`/inventory/${sessionId}/cancel`);
    return response.data.session;
  }

  // Distributor methods
  async getDistributors(): Promise<Distributor[]> {
    const response = await this.client.get<{ distributors: Distributor[] }>('/distributors');
    return response.data.distributors;
  }

  async createDistributor(name: string, email?: string, phone?: string, repName?: string): Promise<Distributor> {
    const response = await this.client.post<{ distributor: Distributor }>('/distributors', {
      name,
      email,
      phone,
      rep_name: repName,
    });
    return response.data.distributor;
  }

  // Product-distributor assignment methods
  async getProductDistributors(locationId: string): Promise<ProductDistributorAssignment[]> {
    const response = await this.client.get<{ assignments: ProductDistributorAssignment[] }>(
      `/locations/${locationId}/product-distributors`
    );
    return response.data.assignments;
  }

  async assignProductDistributor(locationId: string, productId: string, distributorId: string): Promise<any> {
    const response = await this.client.post(
      `/locations/${locationId}/product-distributors`,
      { product_id: productId, distributor_id: distributorId }
    );
    return response.data;
  }

  // Bottle analysis via backend (calls Gemini)
  async analyzeBottleImage(imageBase64: string): Promise<{
    name: string;
    brand: string;
    category: string;
    liquidLevel: number;
    confidence: number;
    levelReadable?: boolean;
    matched_product_id?: string;
  }> {
    const response = await this.client.post('/scans/analyze', {
      image: imageBase64,
      mode: 'bottle',
    });
    return response.data;
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(`${API_URL.replace('/v1', '')}/health`);
      return response.data.status === 'healthy';
    } catch {
      return false;
    }
  }
}

export const apiService = new ApiService();
