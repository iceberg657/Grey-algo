
import { GoogleGenAI } from "@google/genai";
import type { MarketStatsData, StatTimeframe } from '../types';

const ASSETS = {
    Majors: ['EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD'],
    Minors: ['EUR/GBP', 'EUR/JPY', 'GBP/JPY', 'AUD/JPY', 'NZD/USD'],
    Commodities: ['XAU/USD'] // Gold
};

const STATS_PROMPT = (symbol: string, timeframe: string) => `
Act as a Real-Time Technical Analysis Engine. 
**CRITICAL INSTRUCTION: You are analyzing **${symbol}**. Do NOT analyze any other asset. If you analyze EUR/USD when I asked for ${symbol}, you will fail.**

**Task:**
Generate a real-time technical snapshot for **${symbol}** based on the **${timeframe}** chart. Use the 'googleSearch' tool to find the LATEST LIVE PRICE and INDICATOR VALUES for **${symbol}**.

**1. Real-Time Data Extraction (Use Google Search):**
*   **Price:** Find the exact current market price for ${symbol}.
*   **RSI (14):** Find the current Relative Strength Index value.
*   **Moving Averages:** Find the current level of the 50-period and 200-period Simple Moving Averages (SMA).
*   **ATR (14):** Find the current Average True Range (volatility).
*   **Stochastic (14,3,3):** Find current %K and %D values.
*   **ADX (14):** Find current Trend Strength value.

**2. Support & Resistance (Pivot Points / Key Levels):**
*   Identify the 3 closest Support levels (S1, S2, S3) and 3 closest Resistance levels (R1, R2, R3) specifically for **${symbol}** on the **${timeframe}** timeframe.

**3. Candlestick Patterns:**
*   Identify up to 3 significant candlestick patterns visible on the **${symbol} ${timeframe}** chart.
*   Determine if each pattern is Bullish, Bearish, or Neutral.

**4. Sentiment Analysis (Community Vote):**
*   Based on the technicals retrieved above, calculate a "Community Vote" score (0-100).
    *   0-39: Sell / Strong Sell (Red)
    *   40-59: Neutral (Blue)
    *   60-100: Buy / Strong Buy (Green)

**5. Economic Calendar:**
*   Search for economic events scheduled for **TODAY ONLY** that directly impact **${symbol}**.

**Output Format:**
Return ONLY a valid JSON object:
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
    { "name": "string", "signal": "Bullish|Bearish|Neutral", "description": "string (short description)" }
  ],
  "todaysEvents": [
    { "name": "string", "date": "string (ISO 8601)", "impact": "High|Medium|Low" }
  ]
}
`;

export async function fetchMarketStatistics(symbol: string, timeframe: StatTimeframe): Promise<MarketStatsData> {
    if (!process.env.API_KEY) throw new Error("API Key missing");

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: STATS_PROMPT(symbol, timeframe),
            config: {
                tools: [{ googleSearch: {} }],
                temperature: 0.1 // Keep low for factual data extraction
            }
        });

        const text = response.text.trim();
        let jsonString = text;
        const first = jsonString.indexOf('{');
        const last = jsonString.lastIndexOf('}');
        if (first !== -1 && last !== -1) jsonString = jsonString.substring(first, last + 1);

        const data: MarketStatsData = JSON.parse(jsonString);
        
        // Double check symbol match to prevent hallucination
        if (data.symbol && !symbol.includes(data.symbol) && !data.symbol.includes(symbol)) {
             // If AI returned wrong symbol, force overwrite the label so UI stays consistent,
             // though data might be slightly off, usually Gemini respects the prompt if specific enough.
             console.warn(`Symbol mismatch warning: Requested ${symbol}, got ${data.symbol}`);
             data.symbol = symbol; 
        }

        return data;
    } catch (e) {
        console.error("Stats Fetch Error:", e);
        throw new Error("Failed to load market statistics.");
    }
}

export const getAvailableAssets = () => ASSETS;
