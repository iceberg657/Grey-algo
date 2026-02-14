
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { AnalysisRequest, SignalData, UserSettings } from '../types';
import { runWithModelFallback, executeLaneCall, ANALYSIS_POOL, ANALYSIS_MODELS } from './retryUtils';

// --- PROTOCOL 1: SINGLE CHART ANALYSIS ---
const SINGLE_CHART_PROTOCOL = (rrRatio: string) => `
(Institutional Trend-Following + Micro-Structure Logic)

🔥 CORE DIRECTIVE: "HIGH PRECISION SCALPER" (TARGET: 80% WIN RATE)
1. **Identify the Dominant Flow:**
   - Scan the macro trend first.
   - If price is making **Lower Lows & Lower Highs** -> **BIAS IS BEARISH**.
   - If price is making **Higher Highs & Higher Lows** -> **BIAS IS BULLISH**.
   - **STRICT RULE:** You are FORBIDDEN from predicting reversals. If the trend is down, you ONLY SELL. If up, you ONLY BUY.

🎯 ENTRY & EXIT PRECISION (M1 / LOWEST TIMEFRAME MANDATE)
- **CRITICAL:** You must calculate Entry, Stop Loss, and Take Profits based **strictly on the 1-Minute (M1) or lowest visible timeframe structure**.
- **Do not use H1/H4 levels for Entry/SL.** Use them only for bias.
- **Trigger:** Look for specific M1 candle formations (e.g., M1 Engulfing, M1 Pinbar, M1 FVG).
- **Location:** Entry must be at the precise M1 key level.

🛡️ RISK PROTOCOL (STRICT MATHEMATICAL ENFORCEMENT)
- **Stop Loss:** Place SL exactly behind the immediate M1 invalidation structure (M1 Swing High/Low). This ensures a tight risk.
- **CRITICAL:** You MUST calculate the **Risk Distance** = |Entry - Stop Loss|.
- **Take Profit 3 (Final Target):**
  - Extract the multiplier from the user selected R:R of "${rrRatio}". (e.g., "1:3" -> Multiplier 3).
  - **CALCULATION:** 
    - Reward Distance = Risk Distance * Multiplier.
    - TP3 = Entry +/- Reward Distance (Add for Buy, Subtract for Sell).
  - **MANDATORY:** The "takeProfits" array must contain 3 values. The LAST value (Index 2) MUST be exactly this calculated TP3.

📌 OUTPUT DECISION (FILTERING FOR QUALITY)
- **The "80% Rule":** Ask yourself: "Is this setup clear enough that 8 out of 10 times it works?"
- If the M1 structure is unclear, range-bound, or choppy -> Signal "NEUTRAL".
- If a major Support/Resistance level blocks the path to TP1 -> Signal "NEUTRAL".
- **Better to be NEUTRAL than to force a losing trade.**
`;

// --- PROTOCOL 2: MULTI-CHART MASTER PROMPT ---
const MULTI_CHART_PROTOCOL = (rrRatio: string) => `
🔥 AI TRADING SYSTEM MASTER PROMPT (Trend Continuation Specialist)

📌 SYSTEM ROLE
You are an Elite Intraday Scalper. Your mandate is to maintain a **70-80% Win Rate**.

🌊 FLOW ANALYSIS (MULTI-TIMEFRAME)
1. **Higher Timeframe (HTF):** Determine the directional bias.
   - If HTF is Red/Down -> **ONLY LOOK FOR SELLS** on LTF.
   - If HTF is Green/Up -> **ONLY LOOK FOR BUYS** on LTF.
   - **VETO:** If HTF and LTF disagree, the signal is **NEUTRAL**.

🎯 EXECUTION LOGIC (M1 MICRO-STRUCTURE)
- **Data Source:** Use the provided "Entry View" (Lowest Timeframe) image for ALL numerical calculations.
- **Entry:** Calculate specific price levels based on M1/M5 structure.
- **Logic:** "Wait for price to pull back to value on M1, then show rejection."
- **Exit:** Strictly calculated based on the requested **${rrRatio}** Risk:Reward Ratio using M1 stops.

🛑 STOP LOSS RULES
- **Tight & Technical:** SL must be behind the "M1 Invalidation Candle".
- **Risk:** Calculate SL to be protected by M1 structure to allow for high R:R with small moves.

✅ SUCCESS CRITERIA & MATH CHECK
- **Selected R:R:** ${rrRatio}
- **Task:** Calculate the exact price for TP3.
  - Formula: Price + (Direction * (Entry - SL) * Multiplier).
  - Ensure the output JSON "takeProfits" array reflects this exact calculation for the final target.
  - **Quality Filter:** If the setup is not perfect (A+ Grade), return "NEUTRAL".
`;

const PROMPT = (riskRewardRatio: string, tradingStyle: string, isMultiDimensional: boolean, profitMode: boolean, globalContext?: string, learnedStrategies: string[] = [], userSettings?: UserSettings) => {
    
    let userContext = '';
    if (userSettings) {
        userContext = `
    **USER ACCOUNT CONTEXT:**
    - Balance: $${userSettings.accountBalance.toLocaleString()}
    - Risk Profile: ${userSettings.riskPerTrade}% Risk Per Trade (Calculate lots accordingly if asked, but focus on price levels here)
    - Trading Style: ${tradingStyle}
    - Target R:R: ${riskRewardRatio}
        `;
    }

    // Select the specific protocol based on the mode, injecting the R:R constraint
    const SELECTED_PROTOCOL = isMultiDimensional ? MULTI_CHART_PROTOCOL(riskRewardRatio) : SINGLE_CHART_PROTOCOL(riskRewardRatio);
    
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
      - Index 0: **Sniper** (Ideal limit order entry on M1).
      - Index 1: **Market** (Current M1 price).
      - Index 2: **Backup** (Deeper discount level on M1).
    - **entryType**: "Market Execution" (if high momentum) or "Limit Order" (if ranging).

    **CRITICAL - RISK & REWARD MATH:**
    - **User Selected R:R:** ${riskRewardRatio}
    - **Instruction:** You must mathematically verify the R:R.
    - **takeProfits Array:**
      - [0]: 1:1 R:R (Safe partial)
      - [1]: Mid-way target
      - [2]: **MUST BE EXACTLY ${riskRewardRatio} R:R.** (e.g. if Risk is 10pts and 1:3 selected, TP3 is 30pts away).

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
