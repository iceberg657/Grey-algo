
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { AnalysisRequest, SignalData, UserSettings } from '../types';
import { runWithModelFallback, executeLaneCall, ANALYSIS_POOL, ANALYSIS_MODELS } from './retryUtils';

// --- PROTOCOL 1: SINGLE CHART ANALYSIS ---
const SINGLE_CHART_PROTOCOL = (rrRatio: string) => `
(Institutional Quantitative Analysis - Alpha Protocol)

🔥 CORE DIRECTIVE: "Professional SMC Executioner" (TARGET: 85% Strike Rate)

1. **MACRO BIAS & CONTEXT:**
   - Scan the entire chart for dominant market structure.
   - Identify the "Golden Zones": Major Higher Timeframe (HTF) Support/Resistance, Supply/Demand zones, and Swing Highs/Lows.
   - Bias is strictly trend-following. No reversal trades unless a clear "Change of Character" (CHoCH) is confirmed with high volume.

2. **MICRO EXECUTION (M1 SNIPER ENTRY):**
   - Locate the most recent impulsive move that broke structure (BOS).
   - Find the "POI" (Point of Interest): The M1 Order Block (OB) or Fair Value Gap (FVG) that originated that move.
   - Your "Sniper Entry" must be a Limit Order set at the proximal edge of this M1 POI.
   - **DO NOT** suggest market execution if price is far from the POI. Tell the user to WAIT for the pullback.

3. **QUANTITATIVE RISK MANAGEMENT:**
   - **Stop Loss:** Must be 1-2 ticks behind the M1 structural invalidation level (the low/high protecting the OB).
   - **Take Profit (TP):** 
     - TP1: 1:1 R:R (Risk reduction level).
     - TP3 (Final): Calculated mathematically using "${rrRatio}" R:R.
     - **REVERSAL CHECK:** Look ahead for the next major HTF Resistance/Support. If your TP3 is BEYOND this level, you MUST pull the TP3 back to 2-3 pips BEFORE that major level to ensure it hits before the market reverses.
     - If this reduces the R:R to less than 1:2, return "NEUTRAL".

4. **TRADE HORIZON (HOLD TIME):**
   - Analyze current ATR and momentum. Determine exactly how many minutes/hours the trade needs to reach the target.
   - Format: "Hold for [X] hours" or "Scalp (15-30m)".
`;

// --- PROTOCOL 2: MULTI-CHART MASTER PROMPT ---
const MULTI_CHART_PROTOCOL = (rrRatio: string) => `
🔥 AI QUANTITATIVE SYSTEM MASTER PROMPT (SMC Specialist)

📌 **SYSTEM ROLE:** You are a Quantitative Analyst managing institutional capital. Precision is your only metric.

🌊 **MULTI-DIMENSIONAL WORKFLOW:**
1. **Strategic View (HTF):** Map out the "Battlefield". Identify major Liquidity Pools (Equal Highs/Lows) and Supply/Demand zones. Establish the 4-hour/1-hour bias.
2. **Tactical View (Medium TF):** Identify the current cycle. Are we in an expansion, retracement, or consolidation phase?
3. **Execution View (LTF - M1):** Find the "Sniper" trigger. Look for a Liquidity Sweep followed by a Break of Structure. 

🎯 **SNIPER ENTRY LOGIC:**
- Entry: Limit Order at the 50% (Mean Threshold) of the M1 Order Block.
- Stop Loss: Hard stop behind the structural low/high that swept liquidity.
- Take Profit: Mathematically derived from "${rrRatio}" but adjusted for "The Next Wall" (HTF S/R). We exit BEFORE the reversal.

✅ **STRICT FILTRATION:**
- If the HTF bias and M1 entry do not align, return "NEUTRAL".
- If the "Path to Profit" is blocked by a major news event or dense consolidation, return "NEUTRAL".
- If the win probability is not "A+ Grade" (8/10 confidence), return "NEUTRAL". We grow accounts through patience, not gambling.
`;

const PROMPT = (riskRewardRatio: string, tradingStyle: string, isMultiDimensional: boolean, profitMode: boolean, globalContext?: string, learnedStrategies: string[] = [], userSettings?: UserSettings) => {
    
    let userContext = '';
    if (userSettings) {
        userContext = `
    **USER ACCOUNT CONTEXT:**
    - Balance: $${userSettings.accountBalance.toLocaleString()}
    - Account Type: ${userSettings.accountType}
    - Objective: Growth while respecting ${userSettings.maxDrawdown}% Max Drawdown.
    - Style: ${tradingStyle}
        `;
    }

    const SELECTED_PROTOCOL = isMultiDimensional ? MULTI_CHART_PROTOCOL(riskRewardRatio) : SINGLE_CHART_PROTOCOL(riskRewardRatio);
    
    return `
    ${SELECTED_PROTOCOL}

    **PREDICTIVE PATH:** Based on your analysis, provide a likely future price trajectory as an SVG path string for a 1000x500 viewbox. The path should start at the most recent candle. This path should visually represent your reasoning (e.g., show a pullback, then an impulse move towards a target).

    **INTELLIGENCE PROTOCOL:**
    - Use Google Search to verify if there is any high-impact "RED FOLDER" news (CPI, FOMC, NFP) for this asset in the next 4 hours. 
    - If news is imminent, recommend staying FLAT (Neutral) or suggest a very wide Stop Loss if the bias is extreme.

    **REQUIRED JSON OUTPUT (NO MARKDOWN, RAW ONLY):**
    {
      "signal": "BUY" | "SELL" | "NEUTRAL",
      "confidence": number (1-100),
      "asset": "string",
      "timeframe": "M1 Execution",
      "entryPoints": [Sniper_Limit, Market_Price, Safe_Reentry],
      "entryType": "Limit Order" | "Market Execution",
      "stopLoss": number,
      "takeProfits": [TP1_1to1, TP2_Mid, TP3_Final],
      "expectedDuration": "Specific hold time (e.g., 'Hold 2-3 Hours')",
      "predictedPath": "SVG path string (e.g., 'M100,450 Q250,300 400,200 T700,100')",
      "reasoning": [
        "Paragraph detailing HTF Bias and S/R Zones.",
        "Paragraph identifying the M1 Pullback POI (Order Block/FVG).",
        "Paragraph explaining the Liquidity target.",
        "Paragraph on News/Sentiment check.",
        "Paragraph on exact Risk:Reward math."
      ],
      "checklist": [
        "HTF Trend Alignment",
        "Liquidity Sweep Confirmed",
        "M1 BOS Confirmed",
        "Price inside Discount POI",
        "No High Impact News"
      ],
      "invalidationScenario": "If price closes below [level] on M5, the structure is broken. Close trade.",
      "sentiment": { "score": 0-100, "summary": "Punchy professional summary." },
      "economicEvents": [{ "name": "Event", "date": "ISO", "impact": "High" }],
      "sources": [{ "uri": "https://...", "title": "Market Data Source" }]
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
                    temperature: 0.1, // Near-zero temperature for consistent quantitative logic
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
