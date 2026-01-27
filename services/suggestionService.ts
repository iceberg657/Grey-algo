
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { AssetSuggestion } from '../types';
import { executeLaneCall, SUGGESTION_STRUCTURE_POOL, runWithModelFallback, LANE_2_MODELS } from './retryUtils';

export async function fetchAssetSuggestions(profitMode: boolean): Promise<AssetSuggestion[]> {
    return await executeLaneCall<AssetSuggestion[]>(async (apiKey) => {
        const ai = new GoogleGenAI({ apiKey });
        
        const prompt = `
        Scan the current market (Forex, Crypto, Indices).
        Identify 4 high-probability trading setups for the current session.
        ${profitMode ? "STRICT MODE: Only return A+ setups matching institutional order flow." : "Standard Mode: Return high-potential movers."}
        
        **REQUIRED JSON OUTPUT FORMAT:**
        [
          { 
            "symbol": "string (e.g. GBP/USD)", 
            "type": "Major" | "Minor" | "Commodity" | "Index" | "Crypto", 
            "reason": "short explanation", 
            "volatilityWarning": boolean 
          }
        ]
        Return ONLY valid JSON.
        `;

        // LANE 2 CASCADE: 3.0 Flash -> 2.5
        const response = await runWithModelFallback<GenerateContentResponse>(LANE_2_MODELS, (modelId) => 
            ai.models.generateContent({
                model: modelId,
                contents: prompt,
                config: { tools: [{googleSearch: {}}], temperature: 0.3 },
            })
        );

        let text = response.text || '[]';
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const start = text.indexOf('[');
        const end = text.lastIndexOf(']') + 1;
        if (start === -1) return [];
        
        return JSON.parse(text.substring(start, end));
    }, SUGGESTION_STRUCTURE_POOL);
}

export async function getOrRefreshSuggestions(profitMode: boolean = false) {
    const suggestions = await fetchAssetSuggestions(profitMode);
    return { suggestions, nextUpdate: Date.now() + 1800000 };
}
