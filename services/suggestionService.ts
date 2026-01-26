
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { AssetSuggestion } from '../types';
import { executeLaneCall, SERVICE_POOL, runWithModelFallback, LANE_2_MODELS } from './retryUtils';

export async function fetchAssetSuggestions(profitMode: boolean): Promise<AssetSuggestion[]> {
    return await executeLaneCall<AssetSuggestion[]>(async (apiKey) => {
        const ai = new GoogleGenAI({ apiKey });
        
        // LANE 2 CASCADE: 2.5 Lite -> 2.0 Flash
        const response = await runWithModelFallback<GenerateContentResponse>(LANE_2_MODELS, (modelId) => 
            ai.models.generateContent({
                model: modelId,
                contents: `Identify 3 high-probability setups. ProfitMode: ${profitMode}. JSON output.`,
                config: { tools: [{googleSearch: {}}], temperature: 0.1 },
            })
        );

        const text = response.text || '[]';
        const start = text.indexOf('[');
        const end = text.lastIndexOf(']') + 1;
        if (start === -1) return [];
        return JSON.parse(text.substring(start, end));
    }, SERVICE_POOL);
}

export async function getOrRefreshSuggestions(profitMode: boolean = false) {
    const suggestions = await fetchAssetSuggestions(profitMode);
    return { suggestions, nextUpdate: Date.now() + 1800000 };
}
