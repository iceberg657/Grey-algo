
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { AnalysisRequest, SignalData, UserSettings } from '../types';
import { runWithModelFallback, executeLaneCall, ANALYSIS_POOL, ANALYSIS_MODELS } from './retryUtils';

const PROMPT = (riskRewardRatio: string, tradingStyle: string, isMultiDimensional: boolean, profitMode: boolean, globalContext?: string, learnedStrategies: string[] = [], userSettings?: UserSettings) => {
    
    let userContext = '';
    if (userSettings) {
        userContext = `
    **USER ACCOUNT CONTEXT:**
    - Balance: $${userSettings.accountBalance.toLocaleString()}
    - Risk Profile: ${userSettings.dailyDrawdown}% Daily Limit
    - Trading Style: ${tradingStyle}
    - Target R:R: ${riskRewardRatio}
        `;
    }
    
    return `
    You are 'GreyAlpha-QX', an elite quantitative execution engine. Your objective is not just to analyze, but to provide a hyper-accurate, low-drawdown entry blueprint.

    **QX-TACTICAL PROTOCOLS (STRICT ENFORCEMENT):**
    
    1. **PRECISION ZONE VALIDATION:**
       - Do not guess Support/Resistance levels. Strictly identify zones by locating where significant volume was traded OR where sharp price rejections previously occurred.
       - These validated zones must be referenced in your analysis reasoning.

    2. **DIRECTIONAL DELTA LOGIC:** 
       - Even in messy markets, calculate the "Probability Delta". If Buy probability is 65% and Sell is 35%, do NOT simply stay Neutral.
       - Select the higher probability side but APPLY A WAIT PROTOCOL.
       - **Immediate Market Execution:** ONLY for setups where the price is currently at the extreme tip of a Liquidity Sweep or an active impulsive expansion. Use this ONLY if you predict 0% drawdown.
       - **Wait for Pullback:** Use when the trend is valid but price is overextended. Specify the exact retrace level in Entry Points.
       - **Wait for Reversal:** Use for counter-trend setups or when price is approaching a major S/R flip.

    3. **CALCULATED TIME WINDOWS:**
       - Do NOT give generic hold times.
       - Calculate duration based on the distance between Entry and TP1/TP3 relative to the asset's current volatility (ATR).
       - If a trade hasn't hit target within this window, it is considered "Time-Invalidated".

    4. **SMART MONEY CONCEPTS (SMC) FUSION:**
       - Use Google Search to verify if any "Black Swan" events or high-impact news (NFP, CPI) are within 2 hours of the current window.
       - If news is imminent, the Wait Protocol is MANDATORY.

    **REQUIRED OUTPUT FORMAT RULES:**
    
    - **Intelligence Sources:** EXACTLY 5 distinct URL sources. One source MUST inform a 30-minute outlook.
    - **Confluence Matrix:** EXACTLY 5 specific technical confirmations.
    - **Analysis Logic:** 5-8 reasoning paragraphs detailing the "Why" and "When", referencing validated zones.
    - **Sentiment Score:** 0-100 (No negatives). 0-40: Bearish, 45-55: Neutral, 60-100: Bullish.
    - **30-MINUTE TACTICAL OUTLOOK:** Provide a brief, one-sentence tactical outlook for the next 30 minutes, derived directly from one of your intelligence sources.
    - **FORMAT:** RETURN ONLY RAW JSON. NO MARKDOWN. NO CODE BLOCKS.

    **CONTEXT:**
    - Risk/Reward: ${riskRewardRatio}
    - Style: ${tradingStyle}
    - Mode: ${profitMode ? "STRICT ALPHA (MAX PRECISION)" : "Standard"}
    ${userContext}

    **REQUIRED JSON OUTPUT:**
    {
      "signal": "BUY" | "SELL" | "NEUTRAL",
      "confidence": number (70-98), 
      "asset": "string",
      "timeframe": "string",
      "entryPoints": [number, number, number],
      "entryType": "Market Execution" | "Wait for Pullback" | "Wait for Reversal",
      "stopLoss": number,
      "takeProfits": [number, number, number],
      "expectedDuration": "string (e.g., '45m', '2h 15m' - MUST be calculated)", 
      "outlook30Min": "string (e.g., 'Expecting short-term pullback to 1.0850 before rally continues.')",
      "reasoning": ["Paragraph 1", "Paragraph 2", "etc"],
      "checklist": ["Confirmation 1", "Confirmation 2", "etc"],
      "invalidationScenario": "Specific price or time event that kills the setup.",
      "sentiment": {
        "score": number,
        "summary": "One sentence tactical summary."
      },
      "sources": [
        { "uri": "https://...", "title": "Source 1" },
        { "uri": "https://...", "title": "Source 2" },
        { "uri": "https://...", "title": "Source 3" },
        { "uri": "https://...", "title": "Source 4" },
        { "uri": "https://...", "title": "Source 5" }
      ]
    }
    `;
};

async function callGeminiDirectly(request: AnalysisRequest): Promise<Omit<SignalData, 'id' | 'timestamp'>> {
    return await executeLaneCall<Omit<SignalData, 'id' | 'timestamp'>>(async (apiKey) => {
        const ai = new GoogleGenAI({ apiKey });
        
        const promptText = PROMPT(request.riskRewardRatio, request.tradingStyle, request.isMultiDimensional, request.profitMode, request.globalContext, request.learnedStrategies, request.userSettings);
        const promptParts: any[] = [{ text: promptText }];
        
        if (request.isMultiDimensional && request.images.higher) promptParts.push({ inlineData: { data: request.images.higher.data, mimeType: request.images.higher.mimeType } });
        promptParts.push({ inlineData: { data: request.images.primary.data, mimeType: request.images.primary.mimeType } });
        if (request.isMultiDimensional && request.images.entry) promptParts.push({ inlineData: { data: request.images.entry.data, mimeType: request.images.entry.mimeType } });

        const response = await runWithModelFallback<GenerateContentResponse>(ANALYSIS_MODELS, (modelId) => 
            ai.models.generateContent({
                model: modelId,
                contents: [{ parts: promptParts }],
                config: { 
                    tools: [{googleSearch: {}}], 
                    temperature: 0.1,
                    responseMimeType: 'application/json' 
                },
            })
        );

        let text = response.text || '';
        // Improved regex to strip markdown code blocks of any language or plain ticks
        text = text.replace(/```\w*\n?/g, '').replace(/```/g, '').trim();

        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        
        if (start === -1 || end === -1) {
            console.error("Neural output misaligned. Raw response:", text);
            throw new Error("Neural output misaligned. Please retry analysis.");
        }
        
        let data;
        try {
            data = JSON.parse(text.substring(start, end + 1));
        } catch (e) {
            console.error("JSON Parse Error:", e, "Raw Text:", text);
            throw new Error("Neural output corruption. Please retry.");
        }
        
        // Final sanity check and sanitization
        const safeSignal = (data.signal === 'BUY' || data.signal === 'SELL' || data.signal === 'NEUTRAL') ? data.signal : 'NEUTRAL';
        let rawScore = data.sentiment?.score || 50;
        if (rawScore < 0) rawScore = 20; 
        rawScore = Math.min(100, Math.max(0, rawScore));

        return {
            asset: data.asset || "Unknown Asset",
            timeframe: data.timeframe || "N/A",
            signal: safeSignal,
            confidence: data.confidence || 75,
            entryPoints: data.entryPoints || [0, 0, 0],
            entryType: data.entryType || "Wait for Pullback",
            stopLoss: data.stopLoss || 0,
            takeProfits: data.takeProfits || [0, 0, 0],
            expectedDuration: data.expectedDuration || "1h",
            outlook30Min: data.outlook30Min || "Awaiting market action.",
            reasoning: data.reasoning || ["Analysis incomplete."],
            checklist: data.checklist || [],
            invalidationScenario: data.invalidationScenario || "Price violates structure.",
            sentiment: { 
                score: rawScore, 
                summary: data.sentiment?.summary || "Neutral" 
            },
            sources: data.sources || []
        };
    }, ANALYSIS_POOL);
}

export async function generateTradingSignal(request: AnalysisRequest): Promise<Omit<SignalData, 'id' | 'timestamp'>> {
    return callGeminiDirectly(request);
}
