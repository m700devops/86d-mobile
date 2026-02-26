// API client for 86'd backend
const API_URL = 'https://eight6d-api.onrender.com';

export interface Product {
  id: number;
  name: string;
  brand: string;
  category: string;
  upc: string;
  size_ml: number;
  abv: number;
  scan_count: number;
}

export interface Scan {
  product_id: number;
  level: string;
  detection_method: string;
  photo_url?: string;
}

export interface InventorySession {
  session_id: number;
  location_id: number;
  status: string;
}

class ApiClient {
  async getProducts(category?: string): Promise<Product[]> {
    const url = category 
      ? `${API_URL}/products?category=${category}`
      : `${API_URL}/products`;
    const response = await fetch(url);
    const data = await response.json();
    return data.products;
  }

  async searchProducts(query: string): Promise<Product[]> {
    const response = await fetch(`${API_URL}/products/search?q=${encodeURIComponent(query)}`);
    const data = await response.json();
    return data.products;
  }

  async getProductByBarcode(upc: string): Promise<Product | null> {
    try {
      const response = await fetch(`${API_URL}/products/barcode/${upc}`);
      if (response.status === 404) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  async startInventory(locationId: number): Promise<InventorySession> {
    const response = await fetch(`${API_URL}/inventory/start?location_id=${locationId}`, {
      method: 'POST',
    });
    return await response.json();
  }

  async addScan(sessionId: number, scan: Scan): Promise<any> {
    const response = await fetch(`${API_URL}/inventory/${sessionId}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scan),
    });
    return await response.json();
  }

  async completeInventory(sessionId: number): Promise<any> {
    const response = await fetch(`${API_URL}/inventory/${sessionId}/complete`, {
      method: 'POST',
    });
    return await response.json();
  }

  async generateOrder(sessionId: number): Promise<any> {
    const response = await fetch(`${API_URL}/inventory/${sessionId}/generate-order`, {
      method: 'POST',
    });
    return await response.json();
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/health`);
      const data = await response.json();
      return data.status === 'healthy';
    } catch {
      return false;
    }
  }
}

export const api = new ApiClient();
