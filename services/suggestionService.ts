import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

import { executeLaneCall, getSuggestionPool, runWithModelFallback, SUGGESTION_MODELS } from './retryUtils';
import type { MomentumAsset } from '../types';

const CACHE_KEY = 'greyquant_asset_suggestions_v3';
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
        **TASK:** You are a specialized Market Scanner. Identify the top 4 bullish and top 4 bearish currency pairs from the allowed list that are being most actively traded at the start of the current trading day.

        **ALLOWED ASSET POOL:**
        ${ALLOWED_ASSETS}

        **CRITERIA:**
        - Use Google Search to analyze the most recent price action and volume (last 1-4 hours).
        - Focus on assets with the highest trading volume and activity at the start of the day.
        - **BULLISH:** Identify pairs showing strong upward momentum or high-volume buying pressure.
        - **BEARISH:** Identify pairs showing strong downward momentum or high-volume selling pressure.
        - Provide a concise, one-sentence reason for each selection.
        - Analyze and determine the trend specifically on the 1-hour (trend1Hr) and 4-hour (trend4Hr) timeframes.

        **JSON OUTPUT FORMAT:**
        {
          "bullish": [
            { "symbol": "string", "momentum": "Bullish", "reason": "string" }
          ],
          "bearish": [
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
    }, getSuggestionPool);
}

async function enrichWithDerivTrends(assets: MomentumAsset[], token: string): Promise<MomentumAsset[]> {
    const enriched = await Promise.all(assets.map(async (asset) => {
        try {
            const symbol = asset.symbol;
            let baseUrl = `/api/derivData?symbol=${symbol}&history=true`;
            let tokenStr = token ? `&token=${encodeURIComponent(token)}` : '';
            
            const res1h = await fetch(`${baseUrl}&granularity=3600${tokenStr}`);
            let data1h = await res1h.json();
            
            const getTrend = (data: any) => {
                if (!data || !data.candles || data.candles.length < 5) return undefined;
                const closePrices = data.candles.slice(-5).map((c: any) => c.close);
                const first = closePrices[0];
                const last = closePrices[closePrices.length - 1];
                if (last > first) return 'Bullish';
                if (last < first) return 'Bearish';
                return 'Neutral';
            };
            
            const trend1HrDeriv = getTrend(data1h);
            const trend4HrDeriv = asset.momentum; // Ensure 4Hr trend always matches momentum as requested
            
            return {
                ...asset,
                trend1Hr: trend1HrDeriv || asset.trend1Hr || 'Neutral',
                trend4Hr: trend4HrDeriv,
            };
        } catch (e) {
            console.warn(`Failed to enrich ${asset.symbol} via Deriv:`, e);
            return {
                ...asset,
                trend1Hr: asset.trend1Hr || 'Neutral',
                trend4Hr: asset.momentum
            };
        }
    }));
    return enriched;
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
                    Array.isArray(cachedData.data.bearish) &&
                    (cachedData.data.bullish.length === 0 || cachedData.data.bullish[0].trend1Hr !== undefined);

    if (!force && isValid) {
        return { bullish: cachedData.data.bullish || [], bearish: cachedData.data.bearish || [], nextUpdate: cachedData.timestamp + CACHE_DURATION };
    }

    // 3. Attempt Refresh
    try {
        const { bullish, bearish } = await fetchAssetSuggestions();
        
        // Grab token to enrich
        let token = '';
        const userSettingsRaw = localStorage.getItem('greyquant_user_settings');
        if (userSettingsRaw) {
            try {
                token = JSON.parse(userSettingsRaw).derivApiToken || '';
            } catch (e) {}
        }
        
        const enrichedBullish = await enrichWithDerivTrends(bullish, token);
        const enrichedBearish = await enrichWithDerivTrends(bearish, token);

        if (enrichedBullish.length > 0 || enrichedBearish.length > 0) {
            // SUCCESS: Update Cache
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                timestamp: now,
                data: { bullish: enrichedBullish, bearish: enrichedBearish }
            }));
            return { bullish: enrichedBullish, bearish: enrichedBearish, nextUpdate: now + CACHE_DURATION };
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
