
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { executeLaneCall, getAnalysisPool, runWithModelFallback, ANALYSIS_MODELS } from './retryUtils';
import { getMarketData } from './marketDataService';
import type { IntelligenceReport } from '../types';

const TARGET_ASSETS = ['XAU/USD', 'BTC/USD', 'EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'ETH/USD', 'US100'];

export async function fetchMarketIntelligence(): Promise<IntelligenceReport[]> {
    // Stage 1: Fast Price Retrieval (The Backbone)
    let freshMarketData = "";
    try {
        const storedSettings = localStorage.getItem('greyquant_user_settings');
        const userSettings = storedSettings ? JSON.parse(storedSettings) : null;
        const derivToken = userSettings?.derivApiToken;
        
        const marketItems = await getMarketData(derivToken);
        const filtered = marketItems.filter(item => {
            const sym = item.symbol.replace('/', '').toUpperCase();
            return TARGET_ASSETS.some(t => t.replace('/', '').toUpperCase() === sym);
        });

        freshMarketData = filtered.map(item => 
            `[${item.symbol}] PRICE: ${item.price} (${item.changePercent}%)`
        ).join("\n");
        
        console.log("[IntelligenceService] Injected Fresh Market Data from Neural Backbone.");
    } catch (e) {
        console.warn("[IntelligenceService] Failed to pre-fetch market data, AI will use search fallback.");
    }

    return await executeLaneCall<IntelligenceReport[]>(async (apiKey) => {
        const ai = new GoogleGenAI({ apiKey });
        
        const prompt = `
        **SYSTEM ROLE:** You are the "Market Intelligence Agent" (MIA), part of the GreyAlpha Agentic Trading System.
        
        **TASK:** Perform a deep-scan fundamental and technical reconnaissance for 8 high-impact assets.
        
        **FRESH MARKET DATA (PRE-SCANNED):**
        ${freshMarketData || "No pre-scanned data available. Use your search tools for current prices."}

        **GROUNDING PROTOCOL:**
        1. Use Google Search to find institutional sentiment for the current session.
        2. Identify any "Black Swan" risks or high-impact news (inflation, interest rates, geo-politics).
        3. Search for specific institutional order flow patterns (e.g., "Where are the liquidity pools for XAUUSD today?").
        
        **CONSENSUS RECONNAISSANCE:**
        - Decide the "Structural Bias" (HTF).
        - Identify the "Institutional ROI Zone" (POI).
        - Determine the "Alpha Confidence" (0-100).
        
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
          "summary": "MIA agent consensus summary.",
          "timestamp": number,
          "metrics": { "rsi": number, "adx": number, "atr": number }
        }]
        
        **CRITICAL:** Return ONLY raw JSON.
        `;

        const config = { 
            tools: [{googleSearch: {}}], 
            temperature: 0, 
            responseMimeType: "application/json",
            systemInstruction: "You are an autonomous market intelligence agent. Be extremely thorough with your search grounding." 
        };

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
                } else if (proxyRes.status === 429) {
                    throw new Error("429: Quota exhausted on proxy lane.");
                }
            } catch (e: any) {
                if (e.message?.includes('429')) throw e;
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
