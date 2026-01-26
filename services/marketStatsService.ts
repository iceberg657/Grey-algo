
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { MarketStatsData, StatTimeframe } from '../types';
import { runWithModelFallback, executeLiteGeminiCall } from './retryUtils';

const ASSETS = {
    Majors: ['EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD'],
    Minors: ['EUR/GBP', 'EUR/JPY', 'GBP/JPY', 'AUD/JPY', 'NZD/USD'],
    Commodities: ['XAU/USD', 'XAG/USD', 'USOIL', 'UKOIL'],
    Indices: ['US30', 'NAS100', 'SPX500', 'GER40', 'UK100'],
    Crypto: ['BTC/USD', 'ETH/USD', 'SOL/USD', 'XRP/USD', 'BNB/USD']
};

const MODELS = ['gemini-flash-lite-latest'];

const STATS_PROMPT = (symbol: string, timeframe: string) => `
Act as a Real-Time Technical Engine. Analyzing **${symbol}** on **${timeframe}**.
Return a snapshot including Price, Sentiment Score (0-100), SMA 50/200, RSI, Support/Resistance Levels, Candlestick Patterns, and a simplified Order Book.
Output strictly as JSON.
`;

export async function fetchMarketStatistics(symbol: string, timeframe: StatTimeframe): Promise<MarketStatsData> {
    try {
        const response = await executeLiteGeminiCall<GenerateContentResponse>(async (apiKey) => {
            const ai = new GoogleGenAI({ apiKey });
            return await runWithModelFallback<GenerateContentResponse>(MODELS, (modelId) => ai.models.generateContent({
                model: modelId,
                contents: STATS_PROMPT(symbol, timeframe),
                config: { tools: [{ googleSearch: {} }], temperature: 0.1 }
            }));
        });
        const text = response.text?.trim();
        if (!text) throw new Error("Empty response");
        let jsonString = text;
        const first = jsonString.indexOf('{');
        const last = jsonString.lastIndexOf('}');
        if (first !== -1 && last !== -1) jsonString = jsonString.substring(first, last + 1);
        const data: MarketStatsData = JSON.parse(jsonString);
        data.symbol = symbol;
        return data;
    } catch (e) {
        console.error("Stats Error:", e);
        throw new Error("Failed to load stats.");
    }
}

export const getAvailableAssets = () => ASSETS;
