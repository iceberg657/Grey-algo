
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { AnalysisRequest, SignalData, UserSettings } from '../types';
import { runWithModelFallback, executeLaneCall, ANALYSIS_POOL, ANALYSIS_MODELS } from './retryUtils';

// --- PROTOCOL 1: SINGLE CHART ANALYSIS ---
const SINGLE_CHART_PROTOCOL = `
(Liquidity + Market Structure + Price Action Model)
🔥 ROLE
You are an institutional trading AI optimized for HIGH STRIKE RATE and ADAPTIVE ENTRY.
Analyze the provided chart screenshot using:
• Market Structure (BOS / CHOCH)
• Liquidity Pools (BSL / SSL)
• Momentum & Displacement (CRITICAL)
• Order Blocks & FVG

📌 PROFITABILITY RULE #1: MOMENTUM VS. PULLBACK (THE "MISSING TRADE" FIX)
- **Analyze Candle Velocity:** Are the candles large, full-bodied, and moving fast with little overlap?
- **IF YES (Runaway Trend):** DO NOT suggest waiting for a deep pullback (e.g., to an OB). You will miss the trade. Suggest **MARKET EXECUTION** or a shallow retest of the previous candle high/low.
- **IF NO (Healthy Trend):** If price is chopping or moving at a 45-degree angle, THEN wait for a discount (0.5 Fib) or Order Block entry.

📌 PROFITABILITY RULE #2: CONSERVATIVE TARGETING
- TP1 must be the NEAREST opposing structure (guaranteed profit).
- Ensure the Risk:Reward to TP1 is at least 1:1.5.

📌 STEP 1 — IDENTIFY CONTEXT
From the screenshot:
• Identify overall trend (Bullish/Bearish).
• Detect Break of Structure (BOS) or Change of Character (CHOCH).

💧 STEP 2 — MARK LIQUIDITY ZONES
• Identify Equal Highs/Lows and Swing points.

🎯 STEP 3 — ENTRY SCENARIO SELECTION
Select the BEST approach based on current momentum:

🚀 OPTION A: MOMENTUM EXECUTION (Price is running away)
• Condition: Strong displacement, no wicks.
• Entry: Market Execution or Break of current candle.
• Stop: Tight, below previous candle.

🔁 OPTION B: STANDARD PULLBACK (Price is stable)
• Condition: Normal trend structure.
• Entry: Retracement to FVG or Order Block.
`;

// --- PROTOCOL 2: MULTI-CHART MASTER PROMPT ---
const MULTI_CHART_PROTOCOL = `
🔥 AI TRADING SYSTEM MASTER PROMPT
(Liquidity + Price Action + Structure Model)

📌 SYSTEM ROLE
You are an institutional-style trading AI.
Your objective is to trade using Smart Money Concepts (SMC) with ADAPTIVE ENTRY LOGIC.

🧠 CORE MARKET LOGIC
1️⃣ Determine Higher Timeframe Bias
• HTF Bias (H4/Daily) dictates direction.
• LTF (M15/M5) dictates entry type.

💧 LIQUIDITY & DISPLACEMENT RULES
Mark the following:
• Liquidity Pools (BSL / SSL)
• Displacement Candles (Large body, small wicks) -> THIS INDICATES INSTITUTIONAL SPONSORSHIP.

🔥 CRITICAL: THE "NO-RETRACEMENT" PROTOCOL
**Problem:** Often price breaks out and never returns to the Order Block, causing missed trades.
**Solution:** Analyze the *Aggression* of the move.
- **Scenario 1: High Aggression (Runaway)**
  - Huge candles, gaps (FVG) created but NOT filled immediately.
  - **ACTION:** Suggest **MARKET EXECUTION** or entering on the "Breaker Block" (the failed supply/demand zone) rather than the extreme Order Block.
- **Scenario 2: Low Aggression (Grind)**
  - Overlapping candles, wicks.
  - **ACTION:** Wait for deep pullback to Premium/Discount > 50%.

🧱 ORDER BLOCK & FVG RULES
• Bullish OB: Last bearish candle before strong move up.
• Bearish OB: Last bullish candle before strong move down.
• FVG: Gap between candle 1 and 3.

🎯 ENTRY MODEL SELECTION

🚀 TYPE 1: BREAKOUT / MOMENTUM (For Fast Markets)
• Conditions: Liquidity swept + Violent Displacement.
• Entry: **Market Execution** or retest of the *Breaker*.
• Stop Loss: Below the displacement candle (aggressive).
• Logic: "Get in before the train leaves."

🔄 TYPE 2: STANDARD REVERSAL (For Normal Markets)
• Conditions: CHOCH + Gradual return.
• Entry: Limit order at Extreme Order Block or 0.618 Fib.
• Stop Loss: Protected behind the swing high/low.
• Logic: "Buy cheap, Sell expensive."

🧮 PREMIUM / DISCOUNT FILTER
• Only use strict 50% rule if the market is SLOW.
• If market is FAST, disregard deep discount and enter on momentum.

📊 TRADE FILTERS
• Confirm trend with HTF.
• Ensure clear invalidation point.
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
    
    **CRITICAL - ENTRY POINT LOGIC:**
    - **entryPoints**: Must provide an array of 3 levels to capture the move regardless of retracement depth.
      - Index 0: **Aggressive/Market** (Current price or shallow pullback).
      - Index 1: **Standard** (Breaker block or 0.382 Fib).
      - Index 2: **Deep** (Order block or 0.618 Fib).
    - **entryType**: Explicitly state "Market Execution" if momentum is strong, or "Wait for Pullback" if weak.

    **CRITICAL - TIME DURATION FORMAT:**
    - The "expectedDuration" field MUST be a SINGLE, SPECIFIC time value (e.g., "2h 15m").

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
      "expectedDuration": "string (e.g., '2h 15m')", 
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
                    temperature: 0.1,
                    // responseMimeType: 'application/json' // Removed: Incompatible with googleSearch tool
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

        // Sanitization for Duration to ensure single value
        let cleanDuration = data.expectedDuration || "1h";
        // Attempt to clean up ranges if the AI still slips up (e.g. "2-3h" -> "2h 30m")
        if (cleanDuration.includes('-') || cleanDuration.toLowerCase().includes('to')) {
             cleanDuration = cleanDuration.split('-')[0].split('to')[0].trim();
        }

        return {
            asset: data.asset || "Unknown Asset",
            timeframe: data.timeframe || "N/A",
            signal: safeSignal,
            confidence: data.confidence || 75,
            entryPoints: data.entryPoints || [0, 0, 0],
            entryType: data.entryType || "Wait for Pullback",
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
