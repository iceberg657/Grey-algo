
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
        1. Select 8 high-impact assets from the list (prioritize Gold, BTC, and Major FX pairs).
        2. For each asset, use Google Search to fetch real-time price action (1H/4H), market structure, and upcoming news.
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

        const config = { tools: [{googleSearch: {}}], temperature: 0.1, responseMimeType: "application/json" };

        const response = await runWithModelFallback<GenerateContentResponse>(ANALYSIS_MODELS, async (modelId) => {
            try {
                // Try proxy first to avoid regional blocks
                const proxyRes = await fetch('/api/gemini/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: modelId,
                        contents: [{ role: 'user', parts: [{ text: prompt }] }],
                        config,
                        apiKey
                    })
                });

                if (proxyRes.ok) {
                    const data = await proxyRes.json();
                    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    if (text) return { text } as any;
                }
            } catch (e) {
                console.warn(`[IntelligenceService] Proxy failed for ${modelId}, falling back to direct SDK...`);
            }

            // Fallback to direct SDK
            return await ai.models.generateContent({ 
                model: modelId,
                contents: prompt,
                config,
            });
        });

        let text = response.text || '[]';
        // Clean markdown if present
        if (text.includes('```json')) {
            text = text.split('```json')[1].split('```')[0].trim();
        } else if (text.includes('```')) {
            text = text.split('```')[1].split('```')[0].trim();
        }
        
        return JSON.parse(text);
    }, getAnalysisPool);
}
