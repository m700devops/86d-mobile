// Type definitions for 86'd API and Mobile App

// API Types
export interface User {
  id: string;
  email: string;
  name: string | null;
  subscription_status: string;
  subscription_tier: string;
  trial_ends_at: string | null;
  terms_accepted_at: string | null;
  privacy_accepted_at: string | null;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
  terms_accepted: boolean;
}

export interface Product {
  id: string;
  name: string;
  brand: string | null;
  category: string;
  size: string | null;
  upc: string | null;
  price: number | null;
  image_url: string | null;
  scan_count: number;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductListResponse {
  products: Product[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export interface ProductSearchResponse {
  products: Product[];
  query: string;
  total: number;
}

export interface Scan {
  product_id: string;
  level: 'almost_full' | '3/4' | 'half' | '1/4' | 'empty';
  quantity?: number;
  detection_method: 'auto' | 'barcode' | 'manual';
  confidence?: number;
  photo_url?: string;
  shelf_location?: string;
  notes?: string;
  idempotency_key?: string;
}

export interface ScanResponse extends Scan {
  id: string;
  session_id: string;
  level_decimal: number;
  product?: Product;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ParLevel {
  id: string;
  location_id: string;
  product_id: string;
  product?: Product;
  par_quantity: number;
  updated_at: string;
}

export interface InventorySession {
  id: string;
  location_id: string;
  user_id: string;
  started_at: string;
  completed_at: string | null;
  total_bottles: number;
  duration_seconds: number | null;
  status: 'in_progress' | 'completed' | 'cancelled';
  device_id: string | null;
  app_version: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventorySessionDetail {
  session: InventorySession;
  scans: ScanResponse[];
  voice_notes: VoiceNote[];
}

export interface VoiceNote {
  id: string;
  session_id: string;
  audio_url: string | null;
  transcript: string | null;
  linked_product_id: string | null;
  duration_seconds: number | null;
  processed: boolean;
  created_at: string;
}

export interface ApiError {
  error: string;
  message: string;
  details?: Record<string, any>;
}

// Mobile App Types
export interface Bottle {
  id: string;
  name: string;
  brand: string;
  category: string;
  size: string;
  currentLevel: number;
  parLevel: number;
  distributorId?: string;
  upc?: string;
  imageUrl?: string;
  level?: LiquidLevel;
  currentStock?: number;
  price?: number;
  productId?: string;
}

export interface ProductDistributorAssignment {
  product_id: string;
  distributor_id: string;
  distributor: { id: string; name: string; email?: string };
  product: { id: string; name: string; brand?: string; size?: string };
}

export interface Location {
  id: string;
  name: string;
  address?: string;
  isCurrent?: boolean;
}

export interface Distributor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  repName?: string;
  initials?: string;
}

export interface OrderItem {
  bottleId: string;
  bottleName: string;
  quantity: number;
  distributorId?: string;
  name?: string;
  price?: number;
  category?: string;
  urgency?: 'critical' | 'normal';
}

export type LiquidLevel = 'full' | 'almost_full' | '3/4' | 'half' | '1/4' | 'empty';

export type AppScreen =
  | 'onboarding'
  | 'camera'
  | 'review'
  | 'order'
  | 'settings';
