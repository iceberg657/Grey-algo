
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { AssetSuggestion } from '../types';
import { executeLaneCall, SUGGESTION_POOL, runWithModelFallback, SUGGESTION_MODELS } from './retryUtils';

const CACHE_KEY = 'greyquant_asset_suggestions';
const CACHE_DURATION = 30 * 60 * 1000; // Standard 30-minute refresh cycle

const ALLOWED_ASSETS = `
1. MAJOR FX: EURUSD, USDJPY, GBPUSD, USDCHF, AUDUSD
2. MINOR FX: EURGBP, GBPJPY, AUDJPY, EURCHF
3. US INDICES: S&P 500 (SPX500), Dow Jones (US30), Nasdaq (NAS100), Russell 2000 (US2000)
4. UK INDICES: FTSE 100, FTSE 250, FTSE 350
5. CRYPTO: BTCUSD, ETHUSD
`;

export async function fetchAssetSuggestions(profitMode: boolean): Promise<AssetSuggestion[]> {
    return await executeLaneCall<AssetSuggestion[]>(async (apiKey) => {
        const ai = new GoogleGenAI({ apiKey });
        
        const prompt = `
        **TASK:** You are a specialized Market Scanner. Select exactly 4 high-probability trading assets ONLY from the allowed list below.
        
        **ALLOWED ASSET POOL:**
        ${ALLOWED_ASSETS}
        
        **CRITERIA:**
        - Use Google Search to check real-time volume and volatility.
        - ${profitMode ? "STRICT ALPHA: Select assets nearing key Institutional Order Blocks or Liquidity pools." : "HIGH MOMENTUM: Select assets with the highest percentage change in the last hour."}
        - DIVERSITY: Try to mix Asset Classes (e.g., 1 FX, 1 Index, 1 Crypto).
        
        **JSON OUTPUT FORMAT:**
        [
          { 
            "symbol": "string (Use standard ticker, e.g., GBPJPY)", 
            "type": "Major" | "Minor" | "Index" | "Crypto", 
            "reason": "One concise sentence on why this asset is valid right now.", 
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
        
        const start = text.indexOf('[');
        const end = text.lastIndexOf(']');
        
        if (start === -1 || end === -1) throw new Error("Neural Queue Desync.");
        
        return JSON.parse(text.substring(start, end + 1));
    }, SUGGESTION_POOL);
}

export async function getOrRefreshSuggestions(profitMode: boolean = false, force: boolean = false) {
    const now = Date.now();
    let cachedData: any = null;
    
    // 1. Retrieve cache first
    const cachedStr = localStorage.getItem(CACHE_KEY);
    if (cachedStr) {
        try {
            cachedData = JSON.parse(cachedStr);
        } catch (e) {
            localStorage.removeItem(CACHE_KEY);
        }
    }

    // 2. Check if cache is valid
    const isValid = cachedData && 
                    (now - cachedData.timestamp < CACHE_DURATION) && 
                    cachedData.mode === profitMode && 
                    Array.isArray(cachedData.data) && 
                    cachedData.data.length > 0;

    if (!force && isValid) {
        return { suggestions: cachedData.data, nextUpdate: cachedData.timestamp + CACHE_DURATION };
    }

    // 3. Attempt Refresh
    try {
        const suggestions = await fetchAssetSuggestions(profitMode);
        
        if (suggestions && suggestions.length > 0) {
            // SUCCESS: Update Cache
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                timestamp: now,
                mode: profitMode,
                data: suggestions
            }));
            return { suggestions, nextUpdate: now + CACHE_DURATION };
        }
    } catch (error) {
        console.error("Queue sync failure, falling back to cache:", error);
    }

    // 4. FAIL-SAFE: Return stale cache if API failed
    // This prevents the "disappearing content" issue after 30 mins
    if (cachedData && Array.isArray(cachedData.data) && cachedData.data.length > 0) {
        console.warn("Serving stale suggestion data due to API failure.");
        // Extend the stale cache lifetime slightly to prevent hammering the API immediately again
        return { suggestions: cachedData.data, nextUpdate: now + 60000 }; 
    }

    // 5. Absolute Failure (No cache, API down)
    return { suggestions: [], nextUpdate: now + 5000 };
}
