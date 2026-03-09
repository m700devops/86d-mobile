import * as FileSystem from 'expo-file-system';
import { apiService } from './api';

export interface BottleAnalysisResult {
  name: string;
  brand: string;
  category: string;
  liquidLevel: number;
  confidence: number;
}

export async function analyzeBottleImage(imageUri: string): Promise<BottleAnalysisResult | null> {
  try {
    // Read image as base64
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Send to backend for analysis
    const response = await apiService.analyzeBottleImage(base64);
    
    if (response.confidence > 0.7) {
      return response;
    }
    
    return null;
  } catch (error) {
    console.error('Bottle analysis error:', error);
    return null;
  }
}
