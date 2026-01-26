
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { AssetSuggestion } from '../types';
import { executeLaneCall, SERVICE_POOL } from './retryUtils';

export async function fetchAssetSuggestions(profitMode: boolean): Promise<AssetSuggestion[]> {
    return await executeLaneCall<AssetSuggestion[]>(async (apiKey) => {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: `Identify 3 high-probability setups. ProfitMode: ${profitMode}. JSON output.`,
            config: { tools: [{googleSearch: {}}], temperature: 0.1 },
        });
        const text = response.text || '[]';
        return JSON.parse(text.substring(text.indexOf('['), text.lastIndexOf(']') + 1));
    }, SERVICE_POOL);
}

export async function getOrRefreshSuggestions(profitMode: boolean = false) {
    const suggestions = await fetchAssetSuggestions(profitMode);
    return { suggestions, nextUpdate: Date.now() + 1800000 };
}
