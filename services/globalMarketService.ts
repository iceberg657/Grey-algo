
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { GlobalMarketAnalysis } from '../types';
import { runWithModelFallback, executeLiteGeminiCall } from './retryUtils';

const STORAGE_KEY = 'greyquant_global_analysis';
const UPDATE_INTERVAL = 3600000; // 1 hour

const MODELS = ['gemini-flash-lite-latest'];

const GLOBAL_MARKET_PROMPT = `
Act as a chief market strategist. Perform a high-level, real-time analysis of market structure.
1. US Equities (SPX). 2. Forex (DXY/EURUSD). 3. Commodities (Gold). 4. Crypto (BTC).
Return ONLY a valid JSON object matching this structure:
{
  "sectors": [
    { "name": "string", "asset": "string", "bias": "Bullish|Bearish|Neutral", "reason": "string" }
  ],
  "globalSummary": "string"
}
`;

export async function fetchGlobalMarketAnalysis(): Promise<GlobalMarketAnalysis> {
    try {
        const response = await executeLiteGeminiCall<GenerateContentResponse>(async (apiKey) => {
            const ai = new GoogleGenAI({ apiKey });
            
            return await runWithModelFallback<GenerateContentResponse>(MODELS, (modelId) => ai.models.generateContent({
                model: modelId,
                contents: GLOBAL_MARKET_PROMPT,
                config: {
                    tools: [{googleSearch: {}}],
                    temperature: 0.1,
                },
            }));
        });

        const responseText = response.text?.trim();
        if (!responseText) throw new Error("Empty response");

        let jsonString = responseText;
        const firstBrace = jsonString.indexOf('{');
        const lastBrace = jsonString.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) jsonString = jsonString.substring(firstBrace, lastBrace + 1);

        const data = JSON.parse(jsonString);
        const analysis: GlobalMarketAnalysis = {
            timestamp: Date.now(),
            sectors: data.sectors,
            globalSummary: data.globalSummary
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(analysis));
        return analysis;
    } catch (error) {
        console.error("Failed to fetch global analysis:", error);
        throw error;
    }
}

export function getStoredGlobalAnalysis(): GlobalMarketAnalysis | null {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : null;
    } catch { return null; }
}

export async function getOrRefreshGlobalAnalysis(): Promise<GlobalMarketAnalysis> {
    const stored = getStoredGlobalAnalysis();
    if (stored && (Date.now() - stored.timestamp < UPDATE_INTERVAL)) return stored;
    return fetchGlobalMarketAnalysis();
}
