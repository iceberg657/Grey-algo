
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { AnalysisRequest, SignalData, UserSettings } from '../types';
import { runWithModelFallback, executeLaneCall, ANALYSIS_POOL, ANALYSIS_MODELS } from './retryUtils';

// --- PROTOCOL 1: SINGLE CHART ANALYSIS ---
const SINGLE_CHART_PROTOCOL = (rrRatio: string) => `
(Institutional Trend-Following + Micro-Structure Logic)

🔥 CORE DIRECTIVE: "Institutional Quantitative Analyst & Precision Executioner" (TARGET: 80% Win Rate)

**PRIMARY LOGIC: MULTI-TIMEFRAME ANALYSIS (MTA)**
1.  **CONTEXT (Macro View):** From the overall chart, identify the DOMINANT TREND, major chart patterns (Head & Shoulders, Wedges, etc.), and key Higher Timeframe (HTF) Support/Resistance zones. This determines your BIAS (BUY or SELL only).
2.  **EXECUTION (Micro View):** All numerical coordinates (Entry, SL, TP) MUST be derived from the most recent price action on the lowest visible timeframe (M1/M5).

**🎯 SNIPER ENTRY PROTOCOL (PULLBACKS):**
- **Definition:** The "Sniper Entry" is a high-precision limit order placed at an M1/M5 Order Block (OB) or Fair Value Gap (FVG) where a pullback is expected to reverse.
- **CALCULATION:**
    1. Identify the most recent Break of Structure (BOS) on the M1/M5 chart.
    2. Locate the last opposing candle BEFORE that BOS. This is your Point of Interest (POI) or Order Block.
    3. The "Sniper" level in \`entryPoints\` must be the open or 50% level of that specific OB candle.
- **Do not guess.** Calculate this level with precision.

**🛡️ TRADE MANAGEMENT & RISK PROTOCOL:**
- **Stop Loss:** Place SL tightly behind the M1/M5 invalidation structure (the swing high/low protecting your POI).
- **Take Profits:**
    1. Calculate the final TP (TP3) mathematically using the user's selected Risk:Reward of "${rrRatio}".
    2. **SAFETY CHECK:** Identify the next major HTF zone. If your calculated TP3 is BEYOND this zone, you MUST adjust TP3 to be just BEFORE it.
    3. If this adjustment makes the trade less than 1:2 R:R, the signal MUST be **NEUTRAL**. We take high-probability trades, not force them.
- **Trade Duration:** Analyze momentum and distance to the next HTF zone. Set \`expectedDuration\` to one of: 'Scalp (1-15m)', 'Intraday (1-4h)', 'Short Term (4-24h)'.

📌 **OUTPUT DECISION (QUALITY FILTER):**
- **The "80% Rule":** Ask yourself: "Is this setup so clear that it should work 8 out of 10 times?" If not, it's NEUTRAL.
- **CONFLICTS:** If HTF/LTF are misaligned, chart patterns are unclear, or price is in choppy consolidation -> Signal is **NEUTRAL**.
- **PROACTIVE CHECK:** Your Google Search must check for high-impact news related to the asset in the NEXT 3 HOURS. Mention any findings in your reasoning.
`;

// --- PROTOCOL 2: MULTI-CHART MASTER PROMPT ---
const MULTI_CHART_PROTOCOL = (rrRatio: string) => `
🔥 AI TRADING SYSTEM MASTER PROMPT (Institutional Quantitative Analyst)

📌 **SYSTEM ROLE:** Your mandate is to maintain a 70-80% win rate by executing only A+ grade setups based on a strict multi-timeframe analysis protocol.

🌊 **MULTI-TIMEFRAME ANALYSIS (MTA) PROTOCOL:**
1.  **HTF (Strategic View):** Use this image for CONTEXT. Identify the dominant trend, major Support/Resistance zones, and any visible chart patterns. This sets your BIAS. You are FORBIDDEN from taking a trade against the HTF bias.
2.  **LTF (Execution View):** Use THIS image for ALL numerical calculations.

🎯 **EXECUTION LOGIC (M1 MICRO-STRUCTURE):**
- **Sniper Entry:** This is a Limit Order. Find the M1 Order Block or FVG that caused the most recent Break of Structure. Your \`entryPoints\` Sniper level MUST be calculated from this specific Point of Interest.
- **Trade Duration:** Analyze momentum on the LTF and the distance to the next HTF key level from the HTF chart. Set \`expectedDuration\` to 'Scalp (1-15m)', 'Intraday (1-4h)', or 'Short Term (4-24h)'.

🛑 **RISK & TP MANAGEMENT:**
- **Stop Loss:** Place SL tightly behind the M1 invalidation point.
- **Take Profit (TP3):** Calculate TP3 using the user's selected R:R of "${rrRatio}".
- **SAFETY OVERRIDE:** If your calculated TP3 is beyond the next major HTF zone visible on the Strategic View, adjust it to be just before that zone. If the R:R becomes invalid (< 1:2), you MUST return a "NEUTRAL" signal.

✅ **QUALITY FILTER & FINAL CHECK:**
- **Clarity:** If the structure is not perfectly clear on both timeframes, the signal is **NEUTRAL**.
- **Proactive:** Your Google Search must check for high-impact news in the next 3 hours. Acknowledge this in your reasoning.
- **The "80% Rule":** Only output a BUY/SELL signal if you have extremely high conviction.
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
    - Fill "expectedDuration" with 'Scalp (1-15m)', 'Intraday (1-4h)', or 'Short Term (4-24h)'.

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