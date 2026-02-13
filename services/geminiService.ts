
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { AnalysisRequest, SignalData, UserSettings } from '../types';
import { runWithModelFallback, executeLaneCall, ANALYSIS_POOL, ANALYSIS_MODELS } from './retryUtils';

// --- PROTOCOL 1: SINGLE CHART ANALYSIS ---
const SINGLE_CHART_PROTOCOL = `
(Institutional Orderflow + Micro-Structure Logic)

🔥 CORE RULE: "TREND-LOCK" (NO COUNTER-TREND TRADING)
1. **Identify Flow:** Look at the last 50 candles.
   - Series of Lower Lows (LL) & Lower Highs (LH)? -> **BIAS IS BEARISH.** (ONLY SELL).
   - Series of Higher Highs (HH) & Higher Lows (HL)? -> **BIAS IS BULLISH.** (ONLY BUY).
   - **CRITICAL:** Do NOT confuse a pullback with a reversal. If price is falling, a green candle is a SELL entry (Premium), NOT a Buy signal.

⏱️ TIMEFRAME FOCUS: M5 / M15 PRECISION
- Ignore macro fundamentals. Focus purely on the visible Price Action.
- **Entry Trigger:** We need a specific "Trigger Candle" on the smallest visible scale (e.g., Engulfing, Pinbar, Displacement).

🛡️ RISK PROTOCOL
- **Stop Loss:** Must be structural (above LH for Sells, below HL for Buys).
- **Wick Safety:** Add 2-3 pips/points buffer beyond the wick to prevent liquidity grabs.

📌 STEP 3 — EXECUTION MODEL
Select ONE based on current Micro-Structure:

🚀 MODEL A: CONTINUATION (Trend is Healthy)
- Condition: Price broke structure and is pulling back.
- Entry: 0.50 - 0.618 Fib retracement of the impulse leg.
- Logic: "Join the trend at a discount."

⚡ MODEL B: MOMENTUM BREAKOUT (Trend is Fast)
- Condition: Price is consolidating near a key level (Flag/Pennant).
- Entry: Break of the consolidation range.
- Logic: "Catch the expansion."
`;

// --- PROTOCOL 2: MULTI-CHART MASTER PROMPT ---
const MULTI_CHART_PROTOCOL = `
🔥 AI TRADING SYSTEM MASTER PROMPT (Trend-Following Specialist)

📌 SYSTEM ROLE
You are an Intraday Scalper Algo. Your priority is STRIKE RATE and MOMENTUM. 
You DO NOT predict reversals. You ride the established wave.

🌊 FLOW ANALYSIS (MULTI-TIMEFRAME)
1. **Higher Timeframe (HTF):** Is the Daily/H4 candle Bullish or Bearish?
   - If H4 is Red -> **ONLY LOOK FOR SELLS** on M15.
   - If H4 is Green -> **ONLY LOOK FOR BUYS** on M15.
   - **VETO RULE:** If M5 structure contradicts H4 structure, **ABORT SIGNAL (NEUTRAL)**.

🎯 PRECISION ENTRY LOGIC (THE "SNIPER" FIX)
Do not suggest "zones". Suggest specific PRICE LEVELS.
- **Entry Calculation:** 
  - Find the "Decision Point" (The candle that caused the break of structure).
  - Entry is the OPEN or 50% of that candle.
- **Exit Calculation:**
  - TP1: The nearest opposing Liquidity Pool (recent Swing High/Low). **Take 70% off here.**
  - TP2: The external range liquidity (1:3 R:R).

🛑 STOP LOSS RULES
- **Tight & Technical:** SL must be behind the "Invalidation Candle".
- If the SL is hit, the trade idea was WRONG. Do not use wide stops to "give room". Ideally < 20 pips for FX, < 50 points for Indices.

⏳ DURATION LOGIC
- **Intraday Only:** We are not holding overnight.
- **Target:** 15 minutes to 2 hours maximum.
`;

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

    // Select the specific protocol based on the mode
    const SELECTED_PROTOCOL = isMultiDimensional ? MULTI_CHART_PROTOCOL : SINGLE_CHART_PROTOCOL;
    
    return `
    ${SELECTED_PROTOCOL}

    **ADDITIONAL INSTRUCTION - NEWS INTELLIGENCE:**
    - **Mandatory Search:** Use Google Search to query "MyFXBook economic calendar [asset]" and "Investing.com economic calendar [asset]" for high-impact events occurring in the next 24 hours.
    - **Validation:** Ensure the "sources" array contains the direct links to these calendar pages or news articles found.

    **REQUIRED OUTPUT FORMAT RULES (STRICT JSON):**
    
    - **Intelligence Sources:** EXACTLY 5 distinct URL sources. Include MyFXBook or Investing.com links if used for news.
    - **Confluence Matrix:** EXACTLY 5 specific technical confirmations.
    - **Analysis Logic:** 5-8 reasoning paragraphs detailing the "Why" and "When".
    - **Sentiment Score:** 0-100.
    
    **CRITICAL - ENTRY POINT LOGIC (M5/M15 PRECISION):**
    - **entryPoints**: Provide 3 precision levels based on LTF wicks/bodies.
      - Index 0: **Sniper** (The ideal FVG/OB fill).
      - Index 1: **Market/Momentum** (Current price if moving fast).
      - Index 2: **Safety** (Deeper discount for limit orders).
    - **entryType**: "Market Execution" (if high momentum) or "Limit Order" (if ranging).

    **CRITICAL - TIME DURATION FORMAT:**
    - The "expectedDuration" field MUST be a SINGLE, SPECIFIC time value.
    - **STRICT CONSTRAINT:** The duration MUST be between **15m and 3h** (Intraday/Scalp Focus).
    - **LOGIC:** 
      - Cap at "3h" maximum.
      - Floor at "15m".
      - Output example: "45m" or "1h 30m".

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
      "entryType": "Market Execution" | "Limit Order",
      "stopLoss": number,
      "takeProfits": [number, number, number],
      "expectedDuration": "string (e.g., '45m')", 
      "outlook30Min": "string",
      "reasoning": ["Paragraph 1", "Paragraph 2", "etc"],
      "checklist": ["Confirmation 1", "Confirmation 2", "etc"],
      "invalidationScenario": "Specific price or time event that kills the setup.",
      "sentiment": {
        "score": number,
        "summary": "One sentence tactical summary."
      },
      "economicEvents": [
        { "name": "Event Name", "date": "Time/Date", "impact": "High" | "Medium" | "Low" }
      ],
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
                    temperature: 0.1, // Reduced temperature for strict logic adherence
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

        // Sanitization for Duration to ensure single value and range
        let cleanDuration = data.expectedDuration || "45m";
        if (cleanDuration.includes('-') || cleanDuration.toLowerCase().includes('to')) {
             cleanDuration = cleanDuration.split('-')[0].split('to')[0].trim();
        }

        return {
            asset: data.asset || "Unknown Asset",
            timeframe: data.timeframe || "N/A",
            signal: safeSignal,
            confidence: data.confidence || 75,
            entryPoints: data.entryPoints || [0, 0, 0],
            entryType: data.entryType || "Limit Order",
            stopLoss: data.stopLoss || 0,
            takeProfits: data.takeProfits || [0, 0, 0],
            expectedDuration: cleanDuration,
            outlook30Min: data.outlook30Min || "Awaiting market action.",
            reasoning: data.reasoning || ["Analysis incomplete."],
            checklist: data.checklist || [],
            invalidationScenario: data.invalidationScenario || "Price violates structure.",
            sentiment: { 
                score: rawScore, 
                summary: data.sentiment?.summary || "Neutral" 
            },
            economicEvents: data.economicEvents || [],
            sources: data.sources || []
        };
    }, ANALYSIS_POOL);
}

export async function generateTradingSignal(request: AnalysisRequest): Promise<Omit<SignalData, 'id' | 'timestamp'>> {
    return callGeminiDirectly(request);
}
