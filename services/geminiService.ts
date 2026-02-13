
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { AnalysisRequest, SignalData, UserSettings } from '../types';
import { runWithModelFallback, executeLaneCall, ANALYSIS_POOL, ANALYSIS_MODELS } from './retryUtils';

// --- PROTOCOL 1: SINGLE CHART ANALYSIS ---
const SINGLE_CHART_PROTOCOL = `
(Institutional Trend-Following + Micro-Structure Logic)

🔥 CORE DIRECTIVE: "TREND-LOCK" (ABSOLUTE DIRECTION)
1. **Identify the Dominant Flow:**
   - Scan the last 50-100 candles.
   - If price is making **Lower Lows & Lower Highs** -> **BIAS IS BEARISH**.
   - If price is making **Higher Highs & Higher Lows** -> **BIAS IS BULLISH**.
   - **STRICT RULE:** You are FORBIDDEN from predicting reversals. If the trend is down, you ONLY SELL. If up, you ONLY BUY.

🎯 ENTRY PRECISION (M5/M15 FOCUS)
- Ignore macro fundamentals. Focus purely on the visible Price Action.
- **Trigger:** Look for a specific "Trigger Candle" on the smallest visible scale (e.g., M5/M15 Engulfing, Pinbar, or strong Displacement).
- **Location:** Entry must be at a logical key level (Order Block, Breaker, or EMA retest). Do not chase price in the middle of nowhere.

🛡️ RISK PROTOCOL
- **Stop Loss:** Must be technical. Place SL exactly behind the invalidation structure (Swing High/Low).
- **TP:** Target the next opposing Liquidity Pool (Swing High/Low).

📌 OUTPUT DECISION
- If the trend is unclear or choppy -> Signal "NEUTRAL".
- If the R:R is less than 1:2 -> Signal "NEUTRAL".
`;

// --- PROTOCOL 2: MULTI-CHART MASTER PROMPT ---
const MULTI_CHART_PROTOCOL = `
🔥 AI TRADING SYSTEM MASTER PROMPT (Trend Continuation Specialist)

📌 SYSTEM ROLE
You are an Intraday Trend Follower. Your goal is consistent "Bread & Butter" setups, not hero calls.
We are NOT trying to catch the bottom or top. We are catching the meat of the move.

🌊 FLOW ANALYSIS (MULTI-TIMEFRAME)
1. **Higher Timeframe (HTF):** Determine the directional bias.
   - If HTF is Red/Down -> **ONLY LOOK FOR SELLS** on LTF.
   - If HTF is Green/Up -> **ONLY LOOK FOR BUYS** on LTF.
   - **VETO:** If HTF and LTF disagree, the signal is **NEUTRAL**.

🎯 EXECUTION LOGIC (SMALLER TIMEFRAMES)
- **Entry:** Calculate specific price levels based on M5/M15 structure.
- **Logic:** "Wait for price to pull back to value, then show rejection."
- **Exit:** Purely based on Liquidity Pools (TP). We do not use time-based exits.

🛑 STOP LOSS RULES
- **Tight & Technical:** SL must be behind the "Invalidation Candle".
- **Risk:** Calculate SL to be protected by structure, but tight enough to allow high R:R.

✅ SUCCESS CRITERIA
- Signal is valid ONLY if the setup offers at least 1:2 Risk-to-Reward.
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
    
    **CRITICAL - ENTRY POINT LOGIC (PRECISION):**
    - **entryPoints**: Provide 3 precision levels.
      - Index 0: **Sniper** (Ideal limit order entry).
      - Index 1: **Market** (Current price/Momentum entry).
      - Index 2: **Backup** (Deeper discount level).
    - **entryType**: "Market Execution" (if high momentum) or "Limit Order" (if ranging).

    **DURATION FIELD:**
    - Fill "expectedDuration" with "Intraday" or "Scalp". Do not calculate specific hours.

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
      "expectedDuration": "string", 
      "outlook30Min": "string",
      "reasoning": ["Paragraph 1", "Paragraph 2", "etc"],
      "checklist": ["Confirmation 1", "Confirmation 2", "etc"],
      "invalidationScenario": "Specific price level that kills the setup.",
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

        return {
            asset: data.asset || "Unknown Asset",
            timeframe: data.timeframe || "N/A",
            signal: safeSignal,
            confidence: data.confidence || 75,
            entryPoints: data.entryPoints || [0, 0, 0],
            entryType: data.entryType || "Limit Order",
            stopLoss: data.stopLoss || 0,
            takeProfits: data.takeProfits || [0, 0, 0],
            expectedDuration: data.expectedDuration || "Intraday",
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
