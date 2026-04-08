
import { GoogleGenAI } from "@google/genai";

const KEYS = [
    process.env.API_KEY_4,
    process.env.API_KEY_5,
    process.env.API_KEY_6,
    process.env.API_KEY
].filter(key => !!key && key.trim() !== '');

const TWELVE_DATA_KEY = process.env.TWELVE_DATA_API_KEY || 
                        process.env.VITE_TWELVE_DATA_API_KEY || 
                        process.env.TWELVEDATA_API_KEY || 
                        process.env.VITE_TWELVEDATA_API_KEY;

let marketDataCache = { timestamp: null, data: [] };
const CACHE_DURATION = 15 * 60 * 1000; // Increased to 15 minutes

const SYMBOLS = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'XAU/USD', 'BTC/USD', 'ETH/USD', 'DJI', 'NDX'];

export async function fetchFromTwelveData() {
    if (!TWELVE_DATA_KEY) return null;
    try {
        const symbols = SYMBOLS.join(',');
        const response = await fetch(`https://api.twelvedata.com/quote?symbol=${symbols}&apikey=${TWELVE_DATA_KEY}`);
        const data = await response.json();
        
        if (data.status === 'error') return null;

        // Handle both single and multiple symbol responses
        const results = SYMBOLS.map(s => {
            const item = data[s] || data;
            if (!item || !item.close) return null;
            return {
                symbol: s,
                price: parseFloat(item.close),
                change: parseFloat(item.change || 0),
                changePercent: parseFloat(item.percent_change || 0)
            };
        }).filter(Boolean);

        if (results.length > 0) {
            marketDataCache = { timestamp: Date.now(), data: results };
            return results;
        }
    } catch (e) {
        console.error('[MarketData] Twelve Data fetch failed:', e);
    }
    return null;
}

export async function fetchFromGemini() {
    for (const apiKey of KEYS) {
        try {
            const ai = new GoogleGenAI({ apiKey });
            // Use a lighter model and NO google search for background ticker to save quota
            const response = await ai.models.generateContent({
                model: 'gemini-1.5-flash',
                contents: `Current approximate price & 24h % change for: ${SYMBOLS.join(', ')}. Return JSON array of objects with symbol, price, change, changePercent.`
            });

            const text = response.text;
            const start = text.indexOf('[');
            const end = text.lastIndexOf(']') + 1;
            if (start !== -1 && end !== -1) {
                const data = JSON.parse(text.substring(start, end));
                marketDataCache = { timestamp: Date.now(), data };
                return data;
            }
        } catch (e) { 
            console.warn(`[MarketData] Gemini fetch failed for key ...${apiKey.slice(-4)}:`, e.message);
            continue; 
        }
    }
    return marketDataCache.data;
}

export default async (req, res) => {
    const isStale = !marketDataCache.timestamp || (Date.now() - marketDataCache.timestamp > CACHE_DURATION);
    if (isStale) {
        // Try Twelve Data first as it's more reliable and doesn't hit Gemini quota
        let data = await fetchFromTwelveData();
        if (!data) {
            console.log('[MarketData] Falling back to Gemini for ticker...');
            data = await fetchFromGemini();
        }
        res.status(200).json(data || []);
    } else {
        res.status(200).json(marketDataCache.data);
    }
};
