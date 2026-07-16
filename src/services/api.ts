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
  ApiError,
  Order,
  OrderDetail
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

        // A 401 from login/register/refresh is a definitive failure — a token
        // refresh can't fix it and only delays the error reaching the UI.
        const isAuthRoute = /\/auth\/(login|register|refresh)/.test(originalRequest?.url ?? '');

        if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
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
  async register(data: RegisterRequest, signal?: AbortSignal): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/auth/register', data, { signal });
    const { access_token, refresh_token, user } = response.data;
    await this.setTokens(access_token, refresh_token);
    await this.setUserData(user);
    return response.data;
  }

  async login(data: LoginRequest, signal?: AbortSignal): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/auth/login', data, { signal });
    const { access_token, refresh_token, user } = response.data;
    await this.setTokens(access_token, refresh_token);
    await this.setUserData(user);
    return response.data;
  }

  async forgotPassword(email: string): Promise<void> {
    await this.client.post('/auth/forgot-password', { email });
  }

  async resetPassword(email: string, token: string, newPassword: string): Promise<void> {
    await this.client.post('/auth/reset-password', { email, token, new_password: newPassword });
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

  async updateProfile(updates: { business_name?: string; manager_name?: string }): Promise<User> {
    const response = await this.client.patch<User>('/users/me', updates);
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

  // Registers a product the barcode scanner couldn't find in the catalog.
  // A 409 means someone else registered the same UPC in the meantime (or
  // the earlier lookup raced with a create) — the backend hands back the
  // existing row instead of erroring twice, so callers can just use it.
  async createProduct(product: { name: string; brand?: string; category: string; upc?: string }): Promise<Product> {
    try {
      const response = await this.client.post<{ product: Product }>('/products', product);
      return response.data.product;
    } catch (error) {
      const axiosError = error as AxiosError<{ detail?: { error?: string; existing_product?: Product } }>;
      if (axiosError.response?.status === 409 && axiosError.response.data?.detail?.existing_product) {
        return axiosError.response.data.detail.existing_product;
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

  async updateProductStock(
    locationId: string,
    productId: string,
    updates: { full?: number; current_stock?: number; par?: number }
  ): Promise<{ location_id: string; product_id: string; full: number; current_stock: number; par: number | null; updated_at: string }> {
    const response = await this.client.patch(
      `/locations/${locationId}/products/${productId}`,
      updates
    );
    return response.data;
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

  // Server-side backup of the in-progress scan draft, on top of local AsyncStorage —
  // protects against a lost/reinstalled device, not just an app-kill mid-shift.
  async saveInventoryDraft(locationId: string, bottles: unknown[]): Promise<void> {
    await this.client.put('/inventory/draft', { location_id: locationId, bottles });
  }

  async getInventoryDraft(locationId: string): Promise<{ bottles: any[] | null; updated_at: string | null }> {
    const response = await this.client.get(`/inventory/draft?location_id=${encodeURIComponent(locationId)}`);
    return response.data;
  }

  async deleteInventoryDraft(locationId: string): Promise<void> {
    await this.client.delete(`/inventory/draft?location_id=${encodeURIComponent(locationId)}`);
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

  // Send order emails to distributors (backend delivers via Resend)
  async sendOrderEmails(payload: {
    location_id: string;
    location_name: string;
    staff_name?: string;
    orders: {
      distributor_id: string;
      items: { name: string; quantity: number; size?: string; price?: number }[];
    }[];
  }): Promise<{
    order_id: string;
    results: {
      distributor_id: string;
      distributor_name: string | null;
      email: string | null;
      status: 'sent' | 'failed' | 'no_email';
      error: string | null;
    }[];
    sent: number;
    failed: number;
  }> {
    const response = await this.client.post('/orders/email', payload);
    return response.data;
  }

  // Order history
  async getOrders(options: {
    locationId?: string;
    limit?: number;
    offset?: number;
    q?: string;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<{ orders: Order[]; total: number }> {
    const { locationId, limit = 20, offset = 0, q, startDate, endDate } = options;
    const params = new URLSearchParams();
    if (locationId) params.append('location_id', locationId);
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());
    if (q) params.append('q', q);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const response = await this.client.get<{ orders: Order[]; total: number }>(`/orders?${params}`);
    return response.data;
  }

  async getOrder(orderId: string): Promise<OrderDetail> {
    const response = await this.client.get<{ order: OrderDetail }>(`/orders/${orderId}`);
    return response.data.order;
  }

  // Pre-warm the backend's AI connection so the first scan is as fast as the
  // rest. Fire-and-forget — errors are irrelevant.
  warmScanPath(): void {
    this.client.post('/scans/warm', {}).catch(() => {});
  }

  // Bottle analysis via backend (calls Gemini)
  async analyzeBottleImage(imageBase64: string): Promise<{
    name: string;
    brand: string;
    category: string;
    product_type?: string;
    liquidLevel: number;
    confidence: number;
    levelReadable?: boolean;
    matched_product_id?: string | null;
    is_new_product?: boolean;
    match_method?: string;
  } | null> {
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
