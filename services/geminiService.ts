
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { AnalysisRequest, SignalData, UserSettings } from '../types';
import { runWithModelFallback, executeLaneCall, ANALYSIS_POOL, ANALYSIS_MODELS } from './retryUtils';

const PROMPT = (riskRewardRatio: string, tradingStyle: string, isMultiDimensional: boolean, profitMode: boolean, globalContext?: string, learnedStrategies: string[] = [], userSettings?: UserSettings) => {
    
    let userContext = '';
    if (userSettings) {
        userContext = `
    **USER ACCOUNT CONTEXT:**
    - Account Type: ${userSettings.accountType}
    - Balance: $${userSettings.accountBalance.toLocaleString()}
    - Profit Target: ${userSettings.targetPercentage}%
    - Max Daily Drawdown: ${userSettings.dailyDrawdown}%
    - Max Overall Drawdown: ${userSettings.maxDrawdown}%
    - Time Limit: ${userSettings.accountType === 'Funded' ? `${userSettings.timeLimit} days` : 'N/A'}
    
    **CRITICAL RULE:** The analysis MUST respect these risk parameters. Do not suggest trades that would violate drawdown rules. The goal is to safely reach the profit target within the given constraints.
        `;
    }
    
    return `
    You are 'GreyAlpha', an elite quantitative trading AI.
    Analyze the attached financial chart image(s) using Institutional SMC (Smart Money Concepts).
    
    **CONTEXT:**
    - Risk/Reward: ${riskRewardRatio}
    - Style: ${tradingStyle}
    - Profit Mode (Strict Filtering): ${profitMode ? "ENABLED (Only A+ Setups)" : "Standard"}
    ${globalContext ? `- Global Market Context: ${globalContext}` : ''}
    ${userContext}

    **REQUIRED OUTPUT FORMAT:**
    You MUST return a raw JSON object. Do not include markdown formatting like \`\`\`json.
    
    **JSON SCHEMA:**
    {
      "signal": "BUY" | "SELL" | "NEUTRAL",
      "confidence": number, // 0 to 100
      "asset": "string", // e.g. "EUR/USD"
      "timeframe": "string", // e.g. "4H"
      "entryPoints": [number, number, number], // 3 specific entry prices
      "entryType": "Market Execution" | "Pullback" | "Breakout",
      "stopLoss": number,
      "takeProfits": [number, number, number], // 3 specific TP prices
      "expectedDuration": "string", // e.g. "2-4 Hours"
      "reasoning": ["string", "string", "string"], // 3 bullet points
      "checklist": ["string", "string", "string"], // 3 confirmation factors
      "invalidationScenario": "string",
      "sentiment": {
        "score": number, // 0-100
        "summary": "string"
      }
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

        // LANE 1 CASCADE: 3.0 Pro -> 3.0 Flash -> 2.5 Pro -> 2.5 Flash -> 2.0 Flash
        const response = await runWithModelFallback<GenerateContentResponse>(ANALYSIS_MODELS, (modelId) => 
            ai.models.generateContent({
                model: modelId,
                contents: [{ parts: promptParts }],
                config: { tools: [{googleSearch: {}}], temperature: 0.2 },
            })
        );

        let text = response.text || '';
        // Sanitize: remove markdown code blocks if present
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start === -1 || end === -1) throw new Error("Invalid format: No JSON object found in response.");
        
        const data = JSON.parse(text.substring(start, end + 1));
        
        // Data Validation / Fallbacks to prevent "undefined"
        return {
            asset: data.asset || "Unknown Asset",
            timeframe: data.timeframe || "N/A",
            signal: data.signal || "NEUTRAL",
            confidence: data.confidence || 50,
            entryPoints: data.entryPoints || [0, 0, 0],
            entryType: data.entryType || "Pullback",
            stopLoss: data.stopLoss || 0,
            takeProfits: data.takeProfits || [0, 0, 0],
            expectedDuration: data.expectedDuration || "Unknown",
            reasoning: data.reasoning || ["Analysis incomplete."],
            checklist: data.checklist || [],
            invalidationScenario: data.invalidationScenario || "Price violates structure.",
            sentiment: data.sentiment || { score: 50, summary: "Neutral" }
        };
    }, ANALYSIS_POOL);
}

export async function generateTradingSignal(request: AnalysisRequest): Promise<Omit<SignalData, 'id' | 'timestamp'>> {
    return callGeminiDirectly(request);
}
