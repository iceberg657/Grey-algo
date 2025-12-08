
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { MarketStatsData, StatTimeframe } from '../types';
import { runWithRetry } from './retryUtils';

const ASSETS = {
    Majors: ['EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD'],
    Minors: ['EUR/GBP', 'EUR/JPY', 'GBP/JPY', 'AUD/JPY', 'NZD/USD'],
    Commodities: ['XAU/USD', 'XAG/USD', 'USOIL', 'UKOIL'],
    Indices: ['US30', 'NAS100', 'SPX500', 'GER40', 'UK100'],
    Crypto: ['BTC/USD', 'ETH/USD', 'SOL/USD', 'XRP/USD', 'BNB/USD']
};

const STATS_PROMPT = (symbol: string, timeframe: string) => `
Act as a Real-Time Technical Analysis Engine. 
**CRITICAL INSTRUCTION: You are analyzing **${symbol}**. Do NOT analyze any other asset.**

**Task:**
Generate a real-time technical snapshot for **${symbol}** based on the **${timeframe}** chart. Use Google Search for LIVE PRICE and INDICATORS.

**Output Format (JSON Only):**
{
  "symbol": "${symbol}",
  "timeframe": "${timeframe}",
  "price": number,
  "sentimentScore": number,
  "sentimentLabel": "Strong Sell|Sell|Neutral|Buy|Strong Buy",
  "indicators": {
    "ma50": { "value": number, "signal": "Buy|Sell|Neutral" },
    "ma200": { "value": number, "signal": "Buy|Sell|Neutral" },
    "stochastic": { "k": number, "d": number, "signal": "Overbought|Oversold|Neutral" },
    "atr": number,
    "adx": { "value": number, "trend": "Strong|Weak|Ranging" },
    "rsi": number
  },
  "supportResistance": {
    "s1": number, "s2": number, "s3": number,
    "r1": number, "r2": number, "r3": number
  },
  "patterns": [
    { "name": "string", "signal": "Bullish|Bearish|Neutral", "description": "string" }
  ],
  "todaysEvents": [
    { "name": "string", "date": "string (ISO 8601)", "impact": "High|Medium|Low" }
  ],
  "orderBook": {
    "bids": [{ "price": number, "volume": number }],
    "asks": [{ "price": number, "volume": number }]
  }
}
`;

export async function fetchMarketStatistics(symbol: string, timeframe: StatTimeframe): Promise<MarketStatsData> {
    if (!process.env.API_KEY) throw new Error("API Key missing");

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    try {
        // Using Pro model for accurate technical extraction
        const response = await runWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: STATS_PROMPT(symbol, timeframe),
            config: {
                tools: [{ googleSearch: {} }],
                temperature: 0.1 
            }
        }));

        const text = response.text?.trim();
        if (!text) throw new Error("Empty response");

        let jsonString = text;
        const first = jsonString.indexOf('{');
        const last = jsonString.lastIndexOf('}');
        if (first !== -1 && last !== -1) jsonString = jsonString.substring(first, last + 1);

        const data: MarketStatsData = JSON.parse(jsonString);
        data.symbol = symbol; // Enforce symbol match

        return data;
    } catch (e) {
        console.error("Stats Fetch Error:", e);
        throw new Error("Failed to load market statistics.");
    }
}

export const getAvailableAssets = () => ASSETS;
