import { apiService } from './api';

export interface BottleAnalysisResult {
  name: string;
  brand: string;
  category: string;
  product_type?: string;  // Specific class/type (e.g. Tennessee Whiskey, Blended Scotch Whisky)
  liquidLevel: number;
  confidence: number;
  levelReadable?: boolean;
}

export async function analyzeBottleImage(
  imageBase64: string
): Promise<BottleAnalysisResult | null> {
  try {
    const response = await apiService.analyzeBottleImage(imageBase64);

    if (!response || !response.name) {
      return null;
    }

    return {
      ...response,
      name: response.name,
      brand: response.brand ?? '',
      category: response.category ?? 'other',
      liquidLevel: response.liquidLevel ?? 0,
      confidence: response.confidence ?? 0,
      levelReadable: response.levelReadable !== false && (response.confidence ?? 0) > 0.6,
    };
  } catch (error: any) {
    console.error('Bottle analysis error:', error);
    // Re-throw with details so UI can show proper error
    if (error.response) {
      // API returned error response
      throw new Error(`API Error: ${error.response.status} - ${error.response.data?.message || error.response.data?.error || 'Unknown error'}`);
    } else if (error.request) {
      // Request made but no response (network issue)
      throw new Error('Network error: Cannot reach server. Check connection.');
    } else {
      // Something else
      throw new Error(`Error: ${error.message || 'Unknown error'}`);
    }
  }
}
