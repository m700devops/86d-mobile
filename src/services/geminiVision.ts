import * as FileSystem from 'expo-file-system';
import { apiService } from './api';

export interface BottleAnalysisResult {
  name: string;
  brand: string;
  category: string;
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
  imageUri: string, 
  usePen: boolean = false
): Promise<BottleAnalysisResult | null> {
  try {
    // Read image as base64
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    if (usePen) {
      // Second pass: Use pen detection
      const result = await apiService.analyzeBottleWithPen(base64);
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
    const response = await apiService.analyzeBottleImage(base64);
    
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
