
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { AnalysisRequest, SignalData, UserSettings } from '../types';
import { runWithModelFallback, executeLaneCall, ANALYSIS_POOL, ANALYSIS_MODELS } from './retryUtils';

// --- PROTOCOL: Three-Level Top-Down Analysis (SMC Sniper) ---
const AI_TRADING_PLAN = (rrRatio: string) => `
🔥 **CORE OBJECTIVE: Professional SMC Executioner**
You are a disciplined, rule-based quantitative analyst. Your goal is to grow accounts steadily by being highly selective and risk-controlled. No gambling. No random entries. You must pass prop firm rules.

🧠 **MANDATORY WORKFLOW: Three-Level Top-Down Analysis**

**1. HIGHER TIMEFRAME (HTF) – DIRECTIONAL BIAS:**
   - **Task:** Define the dominant market context and direction.
   - **Analyze:**
     - Major Market Structure (BOS, CHoCH).
     - Institutional "Golden Zones" (Major Support/Resistance, Supply/Demand).
     - Overall trend (Bullish, Bearish, Ranging).
     - Major chart patterns and high-impact candlesticks.
   - **Output:** Establish a clear directional bias. No trade can oppose this bias unless a confirmed structural reversal (CHoCH) is identified.

**2. PRIMARY TIMEFRAME – SETUP CONFIRMATION:**
   - **Task:** Refine the HTF bias and validate the trade setup.
   - **Analyze:**
     - Confirm price is reacting correctly at the HTF zone.
     - Identify internal structure shifts that align with the HTF bias.
     - Validate pullbacks into key zones. Detect inducement or liquidity grabs.
   - **Output:** Confirm that a high-probability setup is forming. If the setup is unclear, you MUST return "NEUTRAL".

**3. ENTRY TIMEFRAME – SNIPER EXECUTION:**
   - **Task:** Pinpoint the exact entry trigger with precision.
   - **Analyze:**
     - Identify the M1 Order Block (OB) or Fair Value Gap (FVG) that originated the most recent valid Break of Structure (BOS).
     - Confirm micro-structure alignment (e.g., an M1 CHoCH for entry).
     - Identify rejection wicks or entry patterns at the Point of Interest (POI).
   - **Output:** Define the precise "Sniper Entry" coordinates.

🎯 **SNIPER ENTRY & RISK MANAGEMENT PROTOCOL:**
- **Entry Type:** Your primary entry MUST be a "Limit Order". You must not chase the market. Your role is to tell the user where to wait for the price to come to them.
- **Entry Point:** The "Sniper Entry" Limit Order is set at the edge of the M1 Order Block or 50% of the FVG.
- **Stop Loss (SL):** Placed logically 1-2 ticks behind the structural point that invalidates the setup (e.g., behind the OB low/high).
- **Take Profit (TP):**
    - The final TP is mathematically calculated using a "${rrRatio}" Risk-to-Reward ratio.
    - **CRITICAL REVERSAL CHECK:** You MUST look ahead for the next major opposing HTF zone (Support/Resistance/Supply/Demand). If your calculated TP is beyond this zone, you MUST adjust the TP to be 2-3 pips BEFORE that zone to secure profits.
    - If this TP adjustment results in an R:R of less than 1:2, the trade is invalid. Return "NEUTRAL".

⏳ **TRADE HORIZON (HOLD TIME):**
- Analyze current momentum, volatility (ATR), and distance to TP.
- Provide a specific estimated hold time, e.g., "Scalp (15-30m)", "Hold 1-2 Hours", or "Intraday (3-5 Hours)".

🚨 **STRICT FILTRATION RULES:**
- **Alignment:** If all three timeframes (HTF Bias, Primary Confirmation, Entry Trigger) do not align perfectly, you MUST return "NEUTRAL".
- **Clarity:** If the signal is not "A+ Grade" (high probability, clean structure), you MUST return "NEUTRAL".
- **News:** Use Google Search to check for high-impact news (FOMC, NFP, CPI) in the next 4 hours. If found, you MUST return "NEUTRAL".

---
**FINAL JSON OUTPUT (NO MARKDOWN, RAW ONLY):**
{
  "signal": "BUY" | "SELL" | "NEUTRAL",
  "confidence": number (1-100),
  "asset": "string",
  "timeframe": "M1 Execution",
  "entryPoints": [Sniper_Limit_Order, Market_Price_If_Close, Safe_Reentry],
  "entryType": "Limit Order",
  "stopLoss": number,
  "takeProfits": [TP1_for_BE, TP2_Mid, TP3_Final_Adjusted],
  "expectedDuration": "Specific hold time (e.g., 'Hold 1-2 Hours')",
  "predictedPath": "SVG path string for a 1000x500 viewbox, showing the expected pullback to entry and move to TP.",
  "reasoning": [
    "HTF BIAS: Detailed analysis of the higher timeframe context and directional bias.",
    "PRIMARY CONFIRMATION: Explanation of how the setup is validated on the primary chart.",
    "SNIPER EXECUTION: Pinpoint logic for the M1 entry trigger at the specified OB/FVG.",
    "RISK PROTOCOL: Explanation of SL placement and the TP adjustment based on the 'Reversal Check'."
  ],
  "checklist": [
    "HTF Bias Confirmed",
    "Primary TF Setup Validated",
    "Entry TF Trigger Identified",
    "All Timeframes Aligned",
    "No High-Impact News"
  ],
  "invalidationScenario": "If price closes below [level] on M5, the setup is invalidated. Close the trade immediately.",
  "sentiment": { "score": 0-100, "summary": "Punchy professional summary." },
  "economicEvents": [{ "name": "Event", "date": "ISO", "impact": "High" }],
  "sources": [{ "uri": "https://...", "title": "Market Data Source" }]
}
`;


const PROMPT = (riskRewardRatio: string, tradingStyle: string, isMultiDimensional: boolean, profitMode: boolean, globalContext?: string, learnedStrategies: string[] = [], userSettings?: UserSettings) => {
    return AI_TRADING_PLAN(riskRewardRatio);
};

async function callGeminiDirectly(request: AnalysisRequest): Promise<Omit<SignalData, 'id' | 'timestamp'>> {
    return await executeLaneCall<Omit<SignalData, 'id' | 'timestamp'>>(async (apiKey) => {
        const ai = new GoogleGenAI({ apiKey });
        
        const promptText = PROMPT(request.riskRewardRatio, request.tradingStyle, request.isMultiDimensional, request.profitMode, request.globalContext, request.learnedStrategies, request.userSettings);
        const promptParts: any[] = [{ text: promptText }];
        
        // Per the 3-level analysis, HTF is first, Primary is second, Entry is last.
        if (request.isMultiDimensional && request.images.higher) promptParts.push({ text: "--- 1. HTF CHART (BIAS) ---" }, { inlineData: { data: request.images.higher.data, mimeType: request.images.higher.mimeType } });
        promptParts.push({ text: "--- 2. PRIMARY CHART (SETUP) ---" }, { inlineData: { data: request.images.primary.data, mimeType: request.images.primary.mimeType } });
        if (request.isMultiDimensional && request.images.entry) promptParts.push({ text: "--- 3. ENTRY CHART (EXECUTION) ---" }, { inlineData: { data: request.images.entry.data, mimeType: request.images.entry.mimeType } });


        const response = await runWithModelFallback<GenerateContentResponse>(ANALYSIS_MODELS, (modelId) => 
            ai.models.generateContent({
                model: modelId,
                contents: [{ parts: promptParts }],
                config: { 
                    tools: [{googleSearch: {}}], 
                    temperature: 0.1, // Near-zero temperature for consistent, rule-based logic
                },
            })
        );

        let text = response.text || '';
        text = text.replace(/```\w*\n?/g, '').replace(/```/g, '').trim();

        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        
        if (start === -1 || end === -1) {
            throw new Error("Neural output misaligned. Analysis corrupted.");
        }
        
        let data;
        try {
            data = JSON.parse(text.substring(start, end + 1));
        } catch (e) {
            throw new Error("Failed to parse neural data. Retrying...");
        }
        
        return {
            asset: data.asset || "Unknown Asset",
            timeframe: data.timeframe || "N/A",
            signal: data.signal || 'NEUTRAL',
            confidence: data.confidence || 0,
            entryPoints: data.entryPoints || [0, 0, 0],
            entryType: data.entryType || "Limit Order",
            stopLoss: data.stopLoss || 0,
            takeProfits: data.takeProfits || [0, 0, 0],
            expectedDuration: data.expectedDuration || "Unknown",
            predictedPath: data.predictedPath || undefined,
            reasoning: data.reasoning || ["Analysis incomplete."],
            checklist: data.checklist || [],
            invalidationScenario: data.invalidationScenario || "Price violates structure.",
            sentiment: data.sentiment || { score: 50, summary: "Neutral" },
            economicEvents: data.economicEvents || [],
            sources: data.sources || []
        };
    }, ANALYSIS_POOL);
}

export async function generateTradingSignal(request: AnalysisRequest): Promise<Omit<SignalData, 'id' | 'timestamp'>> {
    return callGeminiDirectly(request);
}
