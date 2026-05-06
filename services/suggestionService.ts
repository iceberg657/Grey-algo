import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

import { executeLaneCall, getSuggestionPool, runWithModelFallback, SUGGESTION_MODELS } from './retryUtils';
import type { MomentumAsset } from '../types';

const CACHE_KEY = 'greyquant_asset_suggestions_v5';
const CACHE_DURATION = 60 * 60 * 1000; // 1-hour refresh cycle

const ALLOWED_ASSETS = `
1. MAJOR FX: EURUSD, USDJPY, GBPUSD, USDCHF, AUDUSD
2. MINOR FX: EURGBP, GBPJPY, AUDJPY, EURCHF
3. US INDICES: S&P 500 (SPX500), Dow Jones (US30), Nasdaq (NAS100), Russell 2000 (US2000)
4. UK INDICES: FTSE 100, FTSE 250, FTSE 350
5. CRYPTO: BTCUSD, ETHUSD
`;

export async function fetchAssetSuggestions(): Promise<{ bullish: MomentumAsset[], bearish: MomentumAsset[] }> {
    // 1. Pre-fetch real-time prices for the allowed pool to avoid hallucinations
    const allowedSymbols = "EURUSD,USDJPY,GBPUSD,USDCHF,AUDUSD,EURGBP,GBPJPY,AUDJPY,EURCHF,SPX500,US30,NAS100,US2000,BTCUSD,ETHUSD";
    const prices: Record<string, string> = {};
    try {
        const res = await fetch(`/api/market-data-proxy?symbol=${allowedSymbols}&interval=4h`);
        if (res.ok) {
            const data = await res.json();
            Object.keys(data).forEach(s => {
                if (data[s]?.close) prices[s] = data[s].close;
            });
        }
    } catch (e) {
        console.warn("[SuggestionService] Pre-fetch failed, model will use internal knowledge.", e);
    }

    return await executeLaneCall<{ bullish: MomentumAsset[], bearish: MomentumAsset[] }>(async (apiKey) => {
        const ai = new GoogleGenAI({ apiKey });
        
        const priceContext = Object.keys(prices).length > 0 
            ? `\n**CURRENT MARKET PRICES (TRUTH LAYER):**\n${Object.entries(prices).map(([s, p]) => `${s}: ${p}`).join(', ')}\n`
            : "";

        const prompt = `
        **TASK:** You are an Elite Institutional Market Analyst. Identify the top 4 bullish and top 4 bearish high-liquidity assets from the allowed pool that present the strongest trading setups right now.
        **IMPORTANT:** You MUST analyze the market specifically on the **4-Hour (H4) Timeframe**. All supply and demand zones MUST be derived from H4 structure and relative to the current prices provided below.
        ${priceContext}
        **ALLOWED ASSET POOL:**
        ${ALLOWED_ASSETS}

        **ANALYSIS REQUIREMENTS:**
        1. **MOMENTUM:** Bullish or Bearish only.
        2. **H4 INSTITUTIONAL ZONES:** Supply/Demand ranges based on 4-Hour order blocks and liquidity pools.
        3. **DECISIVE ACTION:** "Ready to trade" or "Wait (Wait for sweep)".
        4. **REASONING:** One-sentence quant insight from H4 perspective.
        5. **PRICE PROXIMITY:** Ensure suggested demand/supply zones are reasonably close to the current price (within 1-3% for FX, 3-5% for Indices/Crypto). Do NOT provide distant levels from months ago.

        **MANDATORY JSON OUTPUT FORMAT:**
        {
          "bullish": [{ "symbol": "string", "momentum": "Bullish", "reason": "string", "action": "string", "supplyZone": "string", "demandZone": "string", "newsRisk": "Low/Medium/High" }],
          "bearish": [{ "symbol": "string", "momentum": "Bearish", "reason": "string", "action": "string", "supplyZone": "string", "demandZone": "string", "newsRisk": "Low/Medium/High" }]
        }
        `;

        const response = await runWithModelFallback<any>(SUGGESTION_MODELS, async (modelId) => {
            const res = await ai.models.generateContent({
                model: modelId,
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                config: { temperature: 0.2, responseMimeType: "application/json" }
            });
            return res;
        });

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

async function enrichWithTwelveData(assets: MomentumAsset[]): Promise<MomentumAsset[]> {
    if (assets.length === 0) return assets;
    
    try {
        const symbols = assets.map(a => a.symbol).join(',');
        
        // Extract local key if available
        const storedSettings = localStorage.getItem('greyquant_user_settings');
        const userSettings = storedSettings ? JSON.parse(storedSettings) : null;
        const localKey = userSettings?.twelveDataApiKey;
        const localDerivToken = userSettings?.derivApiToken || userSettings?.derivToken;
        
        let url = `/api/quantum-stream?symbol=${encodeURIComponent(symbols)}`;
        if (localKey) url += `&apikey=${localKey}`;
        if (localDerivToken) url += `&token=${localDerivToken}`;
        
        try {
            const res = await fetch(url);
            if (!res.ok) {
                // Secondary fallback attempt
                let fallbackUrl = `/api/marketFetcher?symbol=${encodeURIComponent(symbols)}`;
                if (localDerivToken) fallbackUrl += `&token=${localDerivToken}`;
                
                const fallbackRes = await fetch(fallbackUrl);
                if (!fallbackRes.ok) return assets;
                const data = await fallbackRes.json();
                return updateAssetsWithData(assets, data);
            }
            const data = await res.json();
            return updateAssetsWithData(assets, data);
        } catch (fetchErr) {
            console.warn('[SuggestionService] fetch failed, trying secondary endpoint...', fetchErr);
            const fallbackRes = await fetch(`/api/marketFetcher?symbol=${encodeURIComponent(symbols)}`);
            if (fallbackRes.ok) {
                const data = await fallbackRes.json();
                return updateAssetsWithData(assets, data);
            }
            return assets;
        }
    } catch (e) {
        console.warn('[SuggestionService] Twelve Data enrichment failed:', e);
        return assets;
    }
}

function updateAssetsWithData(assets: MomentumAsset[], data: any): MomentumAsset[] {
    const mapping = (s: string) => {
        let m = s.toUpperCase().trim();
        if (m.includes(':')) m = m.split(':')[1];
        if (m === 'GOLD' || m === 'XAUUSD') return 'XAU/USD';
        if (m === 'US30' || m === 'DJI') return 'DJI';
        if (m === 'NAS100' || m === 'NDX') return 'NDX';
        if (m === 'SPX500' || m === 'SPX') return 'SPX';
        if (m.length === 6 && !m.includes('/')) return `${m.slice(0, 3)}/${m.slice(3)}`;
        return m;
    };

    return assets.map(asset => {
        const mappedSymbol = mapping(asset.symbol);
        const quote = (data && typeof data === 'object') ? (data[mappedSymbol] || data[asset.symbol] || data) : null;
        if (!quote || quote.status === 'error') return asset;
        
        return {
            ...asset,
            price: quote.close || quote.price || '0.00',
            change: parseFloat(quote.change || '0'),
            changePercent: parseFloat(quote.percent_change || '0'),
            volume: quote.volume || 'N/A',
            rsi: quote.rsi,
            sma: quote.sma,
            adx: quote.adx,
            dataSource: quote.dataSource || 'Market Data'
        };
    });
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

    // 2. Check if cache is valid (reduce duration to 30 mins to keep data fresher)
    const REFRESH_THRESHOLD = 30 * 60 * 1000;
    const isValid = cachedData && 
                    (now - cachedData.timestamp < REFRESH_THRESHOLD) && 
                    cachedData.data && 
                    Array.isArray(cachedData.data.bullish) && 
                    Array.isArray(cachedData.data.bearish);

    if (!force && isValid) {
        return { bullish: cachedData.data.bullish || [], bearish: cachedData.data.bearish || [], nextUpdate: cachedData.timestamp + CACHE_DURATION };
    }

    // 3. Attempt Refresh
    try {
        const { bullish, bearish } = await fetchAssetSuggestions();
        
        // Grab token to enrich with Deriv
        let derivToken = '';
        const userSettingsRaw = localStorage.getItem('greyquant_user_settings');
        if (userSettingsRaw) {
            try {
                derivToken = JSON.parse(userSettingsRaw).derivApiToken || '';
            } catch (e) {}
        }
        
        // Enrichment pipeline
        let enrichedBullish = await enrichWithDerivTrends(bullish, derivToken);
        let enrichedBearish = await enrichWithDerivTrends(bearish, derivToken);
        
        // Add Real-time values via Twelve Data
        enrichedBullish = await enrichWithTwelveData(enrichedBullish);
        enrichedBearish = await enrichWithTwelveData(enrichedBearish);

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
