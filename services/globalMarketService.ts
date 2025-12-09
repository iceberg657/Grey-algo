
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { GlobalMarketAnalysis } from '../types';
import { runWithModelFallback } from './retryUtils';

const STORAGE_KEY = 'greyquant_global_analysis';
const UPDATE_INTERVAL = 3600000; // 1 hour in milliseconds

// Fallback chain: Flash Lite -> 2.5 Flash
const MODELS = ['gemini-flash-lite-latest', 'gemini-2.5-flash'];

const GLOBAL_MARKET_PROMPT = `
Act as a chief market strategist. Your task is to perform a high-level, real-time analysis of the current global market structure to determine the prevailing bias.

**Instructions:**
1.  **Scan Key Assets:** Use Google Search to analyze the current price action, news, and sentiment for these 4 key sectors:
    *   **US Equities:** Focus on S&P 500 (SPX).
    *   **Forex:** Focus on the US Dollar Index (DXY) and EUR/USD.
    *   **Commodities:** Focus on Gold (XAU/USD).
    *   **Crypto:** Focus on Bitcoin (BTC/USD).

2.  **Determine Bias:** For each sector, declare the immediate market structure as **'Bullish'**, **'Bearish'**, or **'Neutral'**.
3.  **Provide Rationale:** For each sector, provide a very short, punchy, one-sentence reason (e.g., "Breaking above 5200 resistance," or "Rejected at key supply zone").
4.  **Synthesize Global Summary:** Write a concise 1-2 sentence summary of the overall global risk sentiment (e.g., Risk-On, Risk-Off, or Mixed/Indecisive).

**Output Format:**
Return ONLY a valid JSON object matching this structure:
{
  "sectors": [
    { "name": "US Equities", "asset": "SPX", "bias": "Bullish|Bearish|Neutral", "reason": "string" },
    { "name": "Forex", "asset": "DXY", "bias": "Bullish|Bearish|Neutral", "reason": "string" },
    { "name": "Commodities", "asset": "Gold", "bias": "Bullish|Bearish|Neutral", "reason": "string" },
    { "name": "Crypto", "asset": "BTC", "bias": "Bullish|Bearish|Neutral", "reason": "string" }
  ],
  "globalSummary": "string"
}
`;

export async function fetchGlobalMarketAnalysis(): Promise<GlobalMarketAnalysis> {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY not set");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    try {
        const response = await runWithModelFallback<GenerateContentResponse>(MODELS, (modelId) => ai.models.generateContent({
            model: modelId,
            contents: GLOBAL_MARKET_PROMPT,
            config: {
                tools: [{googleSearch: {}}],
                temperature: 0.1,
            },
        }));

        const responseText = response.text?.trim();
        if (!responseText) throw new Error("Empty response from AI");

        let jsonString = responseText;
        const firstBrace = jsonString.indexOf('{');
        const lastBrace = jsonString.lastIndexOf('}');

        if (firstBrace !== -1 && lastBrace !== -1) {
            jsonString = jsonString.substring(firstBrace, lastBrace + 1);
        }

        const data = JSON.parse(jsonString);
        
        const analysis: GlobalMarketAnalysis = {
            timestamp: Date.now(),
            sectors: data.sectors,
            globalSummary: data.globalSummary
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(analysis));
        
        return analysis;

    } catch (error) {
        console.error("Failed to fetch global market analysis:", error);
        throw error;
    }
}

export function getStoredGlobalAnalysis(): GlobalMarketAnalysis | null {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return null;
        
        const analysis: GlobalMarketAnalysis = JSON.parse(stored);
        return analysis;
    } catch (e) {
        console.error("Error reading global analysis from storage", e);
        return null;
    }
}

export async function getOrRefreshGlobalAnalysis(): Promise<GlobalMarketAnalysis> {
    const stored = getStoredGlobalAnalysis();
    
    if (stored) {
        const age = Date.now() - stored.timestamp;
        if (age < UPDATE_INTERVAL) {
            return stored;
        }
    }
    
    return fetchGlobalMarketAnalysis();
}
