
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { AssetSuggestion } from '../types';
import { executeLaneCall, SUGGESTION_POOL, runWithModelFallback, SUGGESTION_MODELS } from './retryUtils';

const CACHE_KEY = 'greyquant_asset_suggestions';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

export async function fetchAssetSuggestions(profitMode: boolean): Promise<AssetSuggestion[]> {
    return await executeLaneCall<AssetSuggestion[]>(async (apiKey) => {
        const ai = new GoogleGenAI({ apiKey });
        
        const prompt = `
        **CRITICAL INSTRUCTION:** You are a financial analyst engine. You MUST use the provided Google Search tool to fetch REAL-TIME market data.
        
        **TASK:**
        1. Scan latest price action and news for Major Forex pairs, Gold (XAUUSD), Indices (US30/NAS100), and Crypto (BTC).
        2. Identify 4 actionable trading setups.
        ${profitMode ? "STRICT MODE: Only return A+ setups (High confluence)." : "Standard Mode: High-volatility movers."}
        
        **REQUIRED JSON OUTPUT:**
        [
          { 
            "symbol": "string", 
            "type": "Major" | "Minor" | "Commodity" | "Index" | "Crypto", 
            "reason": "string", 
            "volatilityWarning": boolean 
          }
        ]
        `;

        const response = await runWithModelFallback<GenerateContentResponse>(SUGGESTION_MODELS, (modelId) => 
            ai.models.generateContent({
                model: modelId,
                contents: prompt,
                config: { tools: [{googleSearch: {}}], temperature: 0.2 },
            })
        );

        let text = response.text || '[]';
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        // Robust JSON extraction
        const start = text.indexOf('[');
        const end = text.lastIndexOf(']');
        
        if (start === -1 || end === -1) {
             console.error("Malformed AI response for suggestions:", text);
             throw new Error("Invalid JSON format from AI");
        }
        
        try {
            return JSON.parse(text.substring(start, end + 1));
        } catch (e) {
            console.error("JSON parse error:", e);
            throw new Error("Failed to parse suggestion data");
        }
    }, SUGGESTION_POOL);
}

export async function getOrRefreshSuggestions(profitMode: boolean = false) {
    const now = Date.now();
    const cached = localStorage.getItem(CACHE_KEY);
    
    if (cached) {
        try {
            const { timestamp, mode, data } = JSON.parse(cached);
            // Return cache if fresh (less than 30 mins old) AND mode matches AND data is valid
            if (now - timestamp < CACHE_DURATION && mode === profitMode && Array.isArray(data) && data.length > 0) {
                return { suggestions: data, nextUpdate: timestamp + CACHE_DURATION };
            }
        } catch (e) {
            localStorage.removeItem(CACHE_KEY);
        }
    }

    try {
        const suggestions = await fetchAssetSuggestions(profitMode);
        if (suggestions && suggestions.length > 0) {
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                timestamp: now,
                mode: profitMode,
                data: suggestions
            }));
            return { suggestions, nextUpdate: now + CACHE_DURATION };
        }
    } catch (error) {
        console.error("Suggestion fetch failed, attempting to use stale cache...", error);
    }

    // Fallback: Return stale data if available (better than empty state in UI)
    if (cached) {
        try {
            const { data } = JSON.parse(cached);
            if (Array.isArray(data) && data.length > 0) {
                 return { suggestions: data, nextUpdate: now + 60000 }; // Retry again soon
            }
        } catch (e) { /* ignore */ }
    }

    return { suggestions: [], nextUpdate: now + 10000 }; // Retry very soon
}
