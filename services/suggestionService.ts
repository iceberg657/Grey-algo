
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

import { executeLaneCall, getSuggestionPool, runWithModelFallback, SUGGESTION_MODELS } from './retryUtils';
import type { MomentumAsset } from '../types';

const CACHE_KEY = 'greyquant_asset_suggestions';
const CACHE_DURATION = 60 * 60 * 1000; // 1-hour refresh cycle

const ALLOWED_ASSETS = `
1. MAJOR FX: EURUSD, USDJPY, GBPUSD, USDCHF, AUDUSD
2. MINOR FX: EURGBP, GBPJPY, AUDJPY, EURCHF
3. US INDICES: S&P 500 (SPX500), Dow Jones (US30), Nasdaq (NAS100), Russell 2000 (US2000)
4. UK INDICES: FTSE 100, FTSE 250, FTSE 350
5. CRYPTO: BTCUSD, ETHUSD
`;

export async function fetchAssetSuggestions(): Promise<{ bullish: MomentumAsset[], bearish: MomentumAsset[] }> {
    return await executeLaneCall<{ bullish: MomentumAsset[], bearish: MomentumAsset[] }>(async (apiKey) => {
        const ai = new GoogleGenAI({ apiKey });
        
        const prompt = `
        **TASK:** You are a specialized Market Scanner. Identify the top 3 bullish and top 3 bearish currency pairs from the allowed list that are being most actively traded at the start of the current trading day.

        **ALLOWED ASSET POOL:**
        ${ALLOWED_ASSETS}

        **CRITERIA:**
        - Use Google Search to analyze the most recent price action and volume (last 1-4 hours).
        - Focus on assets with the highest trading volume and activity at the start of the day.
        - **BULLISH:** Identify pairs showing strong upward momentum or high-volume buying pressure.
        - **BEARISH:** Identify pairs showing strong downward momentum or high-volume selling pressure.
        - Provide a concise, one-sentence reason for each selection.

        **JSON OUTPUT FORMAT:**
        {
          "bullish": [
            { "symbol": "string", "momentum": "Bullish", "reason": "string" },
            { "symbol": "string", "momentum": "Bullish", "reason": "string" },
            { "symbol": "string", "momentum": "Bullish", "reason": "string" }
          ],
          "bearish": [
            { "symbol": "string", "momentum": "Bearish", "reason": "string" },
            { "symbol": "string", "momentum": "Bearish", "reason": "string" },
            { "symbol": "string", "momentum": "Bearish", "reason": "string" }
          ]
        }
        `;

        const response = await runWithModelFallback<GenerateContentResponse>(SUGGESTION_MODELS, (modelId) => 
            ai.models.generateContent({
                model: modelId,
                contents: prompt,
                config: { tools: [{googleSearch: {}}], temperature: 0.2 },
            })
        );

        let text = response.text || '{}';
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        
        if (start === -1 || end === -1) throw new Error("Neural Queue Desync.");
        
        return JSON.parse(text.substring(start, end + 1));
    }, getSuggestionPool());
}

export async function getOrRefreshSuggestions(force: boolean = false) {
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
 
                    cachedData.data && 
                    Array.isArray(cachedData.data.bullish) && 
                    Array.isArray(cachedData.data.bearish);

    if (!force && isValid) {
        return { bullish: cachedData.data.bullish || [], bearish: cachedData.data.bearish || [], nextUpdate: cachedData.timestamp + CACHE_DURATION };
    }

    // 3. Attempt Refresh
    try {
        const { bullish, bearish } = await fetchAssetSuggestions();
        
        if (bullish.length > 0 || bearish.length > 0) {
            // SUCCESS: Update Cache
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                timestamp: now,
                data: { bullish, bearish }
            }));
            return { bullish, bearish, nextUpdate: now + CACHE_DURATION };
        }
    } catch (error) {
        console.error("Queue sync failure, falling back to cache:", error);
    }

    // 4. FAIL-SAFE: Return stale cache if API failed
    // This prevents the "disappearing content" issue after 30 mins
    if (cachedData && cachedData.data && Array.isArray(cachedData.data.bullish) && Array.isArray(cachedData.data.bearish)) {
        console.warn("Serving stale suggestion data due to API failure.");
        // Extend the stale cache lifetime slightly to prevent hammering the API immediately again
        return { bullish: cachedData.data.bullish, bearish: cachedData.data.bearish, nextUpdate: now + 60000 }; 
    }

    // 5. Absolute Failure (No cache, API down)
    return { bullish: [], bearish: [], nextUpdate: now + 5000 };
}
