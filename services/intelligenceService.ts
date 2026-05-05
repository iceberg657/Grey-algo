
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { executeLaneCall, getAnalysisPool, runWithModelFallback, ANALYSIS_MODELS } from './retryUtils';
import type { IntelligenceReport } from '../types';

const ALLOWED_ASSETS = `
1. MAJOR FX: EURUSD, USDJPY, GBPUSD, USDCHF, AUDUSD
2. MINOR FX: EURGBP, GBPJPY, AUDJPY, EURCHF
3. INDICES: US100 (Nasdaq), US30 (Dow Jones), US500 (S&P 500), UK100 (FTSE 100)
4. CRYPTO: BTCUSD, ETHUSD
5. COMMODITIES: XAUUSD (Gold), WTI (Oil)
`;

export async function fetchMarketIntelligence(): Promise<IntelligenceReport[]> {
    return await executeLaneCall<IntelligenceReport[]>(async (apiKey) => {
        const ai = new GoogleGenAI({ apiKey });
        
        const prompt = `
        **TASK:** You are an Apex Quantitative Intelligence Engine. Perform a deep, multi-timeframe analysis of the global financial markets.
        **ALLOWED ASSETS:** ${ALLOWED_ASSETS}

        **INSTRUCTIONS:**
        1. Select the top 15 most relevant/active assets from the list.
        2. For each asset, use Google Search to fetch real-time price action (1H/4H), market structure, and upcoming high-impact news.
        3. **QUANT ENGINE ANALYSIS:** 
           - Identify Trend Direction (1H + 4H).
           - Identify POI Zones (Supply/Demand, Order Blocks).
           - Assess News Risk Level (Low/Medium/High).
           - Grade the Setup Quality (0-100) based on institutional confluence (Liquidity sweep, BOS, Displacement).
        4. **DECISIVE ACTION:** Determine if the asset is "Ready to trade" or "Wait".
        5. Compile everything into a comprehensive Intelligence Report.

        **JSON OUTPUT FORMAT (ARRAY OF OBJECTS):**
        [{
          "asset": "string",
          "trend": { "h1": "Bullish|Bearish|Neutral", "h4": "Bullish|Bearish|Neutral" },
          "poiZones": [
            { "type": "demand|supply", "priceRange": { "upper": number, "lower": number }, "confirmed": true, "strength": "strong" }
          ],
          "newsRisk": "Low|Medium|High",
          "setupQuality": number,
          "action": "Ready to trade|Wait",
          "summary": "One sentence intelligence summary.",
          "timestamp": number,
          "metrics": { "rsi": number, "adx": number, "atr": number }
        }]
        
        **CRITICAL:** Return ONLY the raw JSON array.
        `;

        const response = await runWithModelFallback<GenerateContentResponse>(ANALYSIS_MODELS, (modelId) => 
            ai.models.generateContent({ 
                model: modelId,
                contents: prompt,
                config: { tools: [{googleSearch: {}}], temperature: 0.1, responseMimeType: "application/json" },
            })
        );

        let text = response.text || '[]';
        return JSON.parse(text);
    }, getAnalysisPool);
}
