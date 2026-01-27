
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { AssetSuggestion } from '../types';
import { executeLaneCall, SUGGESTION_STRUCTURE_POOL, runWithModelFallback, LANE_2_MODELS } from './retryUtils';

export async function fetchAssetSuggestions(profitMode: boolean): Promise<AssetSuggestion[]> {
    return await executeLaneCall<AssetSuggestion[]>(async (apiKey) => {
        const ai = new GoogleGenAI({ apiKey });
        
        const prompt = `
        **CRITICAL INSTRUCTION:** You are a financial analyst engine. You MUST use the provided Google Search tool to fetch REAL-TIME market data for this analysis. Do NOT answer from internal knowledge.

        **TASK:**
        1. Use Google Search to scan the latest charts, news, and price action for Major Forex pairs, Gold (XAUUSD), Indices (US30/NAS100), and Bitcoin (BTC) for the CURRENT trading session.
        2. Identify 4 actionable trading setups based on this live data.
        ${profitMode ? "STRICT MODE: Only return A+ setups where technicals and fundamentals align perfectly." : "Standard Mode: Return high-volatility movers."}
        
        **REQUIRED JSON OUTPUT FORMAT:**
        [
          { 
            "symbol": "string (e.g. GBP/USD)", 
            "type": "Major" | "Minor" | "Commodity" | "Index" | "Crypto", 
            "reason": "Concise technical reason (e.g., 'Breaking 1.2500 resistance on high volume')", 
            "volatilityWarning": boolean 
          }
        ]
        Return ONLY valid JSON. No markdown, no conversational text.
        `;

        // LANE 2 CASCADE: 3.0 Flash -> 2.5
        const response = await runWithModelFallback<GenerateContentResponse>(LANE_2_MODELS, (modelId) => 
            ai.models.generateContent({
                model: modelId,
                contents: prompt,
                config: { tools: [{googleSearch: {}}], temperature: 0.2 },
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
