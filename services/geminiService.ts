
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { AnalysisRequest, SignalData, UserSettings } from '../types';
import { runWithModelFallback, executeLaneCall, ANALYSIS_POOL, ANALYSIS_MODELS } from './retryUtils';

const AI_TRADING_PLAN = (rrRatio: string) => `
🔥 **CORE OBJECTIVE: Professional SMC Executioner**
You are a disciplined, rule-based quantitative analyst. Your goal is to grow accounts steadily by being highly selective and risk-controlled. No gambling. No random entries. 

🧠 **MANDATORY WORKFLOW: Three-Level Top-Down Analysis**

1. **HTF BIAS:** Establish directional dominance. No counter-trend trades.
2. **PRIMARY CONFIRMATION:** Validate price reaction at institutional POIs.
3. **ENTRY TRIGGER (M1):** Find the sniper execution point at an OB or FVG.

🚨 **COGNITIVE ALIGNMENT LOCK:**
- Your output must be 100% decisive. 
- If your signal is "BUY", your entire reasoning, sentiment, and predicted path must focus on the Bullish thesis. 
- Do NOT list "Bearish" signs as current factors; only mention them as invalidated zones or liquidity targets to be swept. 
- If you see conflicting signals that you cannot resolve, you MUST return "NEUTRAL".

🎯 **EXECUTION PROTOCOL:**
- **Entry:** MUST be a "Limit Order" at a POI. Do not chase price.
- **Take Profit (TP):** Adjusted to 2-3 pips BEFORE the next major opposing zone.
- **Hold Time:** Focus on "Sniper" volatility windows. Target 15m to 120m for execution to target.

---
**JSON SCHEMA REQUIREMENTS:**
- **confidence:** MUST be an integer between 0 and 100.
- **sentiment.score:** MUST be an integer between 0 and 100.
- **reasoning:** You MUST provide EXACTLY 5 or more detailed paragraphs.
- **checklist:** All 5 items must be confirmed for a signal; otherwise return NEUTRAL.
- **expectedDuration:** Must be a single estimated hold time (e.g., "~45m", "~90m"). Do NOT provide a range.

---
**FINAL JSON OUTPUT (RAW ONLY):**
{
  "signal": "BUY" | "SELL" | "NEUTRAL",
  "confidence": number,
  "asset": "string",
  "timeframe": "M1 Execution",
  "entryPoints": [Sniper_Limit, Market_Price, Safe_Reentry],
  "entryType": "Limit Order",
  "stopLoss": number,
  "takeProfits": [TP1_1to1, TP2_Mid, TP3_Final],
  "expectedDuration": "Specific hold time (e.g., '~45m')",
  "reasoning": [
    "HTF Structure & Bias analysis.",
    "Institutional POI Identification.",
    "Liquidity and Inducement map.",
    "M1 Break of Structure/Sniper Trigger logic.",
    "Risk Mitigation & Target rationale."
  ],
  "checklist": [
    "HTF Bias Confirmed",
    "POI Mitigated",
    "Liquidity Swept",
    "M1 BOS Confirmed",
    "No High-Impact News"
  ],
  "invalidationScenario": "string",
  "sentiment": { "score": number, "summary": "string" },
  "economicEvents": [],
  "sources": []
}
`;

const PROMPT = (riskRewardRatio: string) => AI_TRADING_PLAN(riskRewardRatio);

async function callGeminiDirectly(request: AnalysisRequest): Promise<Omit<SignalData, 'id' | 'timestamp'>> {
    return await executeLaneCall<Omit<SignalData, 'id' | 'timestamp'>>(async (apiKey) => {
        const ai = new GoogleGenAI({ apiKey });
        
        const promptText = PROMPT(request.riskRewardRatio);
        const promptParts: any[] = [{ text: promptText }];
        
        if (request.isMultiDimensional && request.images.higher) promptParts.push({ text: "HTF CHART" }, { inlineData: { data: request.images.higher.data, mimeType: request.images.higher.mimeType } });
        promptParts.push({ text: "PRIMARY CHART" }, { inlineData: { data: request.images.primary.data, mimeType: request.images.primary.mimeType } });
        if (request.isMultiDimensional && request.images.entry) promptParts.push({ text: "ENTRY CHART" }, { inlineData: { data: request.images.entry.data, mimeType: request.images.entry.mimeType } });

        const response = await runWithModelFallback<GenerateContentResponse>(ANALYSIS_MODELS, (modelId) => 
            ai.models.generateContent({
                model: modelId,
                contents: [{ parts: promptParts }],
                config: { tools: [{googleSearch: {}}], temperature: 0.1 },
            })
        );

        let text = response.text || '';
        text = text.replace(/```\w*\n?/g, '').replace(/```/g, '').trim();
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        
        if (start === -1 || end === -1) throw new Error("Neural alignment failure.");
        
        const data = JSON.parse(text.substring(start, end + 1));

        // **Data Sanitization Layer**
        // Corrects AI tendency to return floats (0.88) instead of integers (88)
        if (data.confidence && data.confidence > 0 && data.confidence <= 1) {
            data.confidence = Math.round(data.confidence * 100);
        } else if (data.confidence) {
            data.confidence = Math.round(data.confidence);
        }
        
        if (data.sentiment && data.sentiment.score && data.sentiment.score > 0 && data.sentiment.score <= 1) {
            data.sentiment.score = Math.round(data.sentiment.score * 100);
        } else if (data.sentiment && data.sentiment.score) {
            data.sentiment.score = Math.round(data.sentiment.score);
        }
        
        return {
            asset: data.asset || "Unknown",
            timeframe: data.timeframe || "N/A",
            signal: data.signal || 'NEUTRAL',
            confidence: data.confidence || 0,
            entryPoints: data.entryPoints || [0, 0, 0],
            entryType: data.entryType || "Limit Order",
            stopLoss: data.stopLoss || 0,
            takeProfits: data.takeProfits || [0, 0, 0],
            expectedDuration: data.expectedDuration || "Unknown",
            reasoning: data.reasoning || [],
            checklist: data.checklist || [],
            invalidationScenario: data.invalidationScenario || "Structure break.",
            sentiment: data.sentiment || { score: 50, summary: "Neutral" },
            economicEvents: data.economicEvents || [],
            sources: data.sources || []
        };
    }, ANALYSIS_POOL);
}

export async function generateTradingSignal(request: AnalysisRequest): Promise<Omit<SignalData, 'id' | 'timestamp'>> {
    return callGeminiDirectly(request);
}
