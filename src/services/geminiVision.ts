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

export interface PenAnalysisResult {
  liquidLevel: number;
  confidence: number;
}

// First pass: Analyze bottle and detect if level is readable
export async function analyzeBottleImage(
  imageBase64: string,
  usePen: boolean = false
): Promise<BottleAnalysisResult | null> {
  try {
    // base64 is now passed directly, no FileSystem read needed

    if (usePen) {
      // Second pass: Use pen detection
      const result = await apiService.analyzeBottleWithPen(imageBase64);
      return {
        name: '', // Not used in pen mode
        brand: '',
        category: 'Spirits',
        liquidLevel: result.liquidLevel,
        confidence: result.confidence,
        levelReadable: true,
      };
    }

    // First pass: Standard bottle analysis
    const response = await apiService.analyzeBottleImage(imageBase64);

    return {
      ...response,
      levelReadable: response.levelReadable !== false && response.confidence > 0.6,
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
