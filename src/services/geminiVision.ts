import * as FileSystem from 'expo-file-system';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY || '');

export async function analyzeBottleImage(imageUri: string): Promise<{
  name: string;
  brand: string;
  category: string;
  liquidLevel: number;
  confidence: number;
} | null> {
  try {
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64,
        },
      },
      {
        text: `Analyze this image of a liquor bottle. Look for a pen or marker indicating the liquid level.

Return ONLY a JSON object with these fields:
{
  "name": "Full product name",
  "brand": "Brand name only",
  "category": "Spirits|Beer|Wine|Other",
  "liquidLevel": 0.75,
  "confidence": 0.95
}

liquidLevel should be a decimal from 0.0 (empty) to 1.0 (full).
If you see a pen marking the liquid line, use that as the level indicator.
If no bottle is detected, return null.
Return ONLY valid JSON, no markdown or explanation.`,
      },
    ]);

    const text = result.response.text().trim();
    const json = JSON.parse(text.replace(/```json\n?|\n?```/g, ''));
    return json;
  } catch (error) {
    console.error('Gemini Vision error:', error);
    return null;
  }
}
