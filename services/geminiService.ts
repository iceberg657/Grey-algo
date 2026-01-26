
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { AnalysisRequest, SignalData, UserSettings } from '../types';
import { getStoredGlobalAnalysis } from './globalMarketService';
import { getLearnedStrategies } from './learningService';
import { runWithModelFallback, executeChartGeminiCall } from './retryUtils';

const PROMPT = (riskRewardRatio: string, tradingStyle: string, isMultiDimensional: boolean, profitMode: boolean, globalContext?: string, learnedStrategies: string[] = [], userSettings?: UserSettings) => {
    const now = new Date();
    const timeString = now.toUTCString();
    const styleInstruction = tradingStyle === 'Short Term' 
        ? "Short Term (Intraday Power Shift): Focus on MOMENTUM DOMINANCE."
        : tradingStyle;
    
    const learnedSection = learnedStrategies.length > 0
        ? `\n**Auto-ML Learned Memory:**\n${learnedStrategies.map(s => `- ${s}`).join('\n')}\n`
        : "";

    const riskContext = userSettings ? `
**USER RISK PROTOCOL:**
- Type: ${userSettings.accountType} | Bal: $${userSettings.balance.toLocaleString()}
- Daily Drawdown: ${userSettings.dailyDrawdownLimit}% | Max: ${userSettings.maxDrawdownLimit}%
` : `R:R Target: ${riskRewardRatio}`;

    return `
Act as an Apex-Tier Quantitative Analyst. Perform a Pixel-Level Audit of the provided chart.
REAL-TIME CONTEXT: ${timeString} | BIAS: ${globalContext || 'Visuals only'}
TRADING STYLE: ${styleInstruction}
${riskContext}
${learnedSection}

**MANDATORY RULES:**
1. Duration: Setup MUST reach target within 30m - 3h.
2. Entry Type: Market Execution | Pullback | Breakout.
3. Sentiment: 0-100 score.

**Output JSON Format:**
{
  "asset": "string",
  "timeframe": "string",
  "signal": "BUY|SELL|NEUTRAL",
  "confidence": number,
  "entryPoints": [number],
  "entryType": "string",
  "stopLoss": number,
  "takeProfits": [number],
  "expectedDuration": "30m-3h",
  "reasoning": ["string"],
  "riskAnalysis": { "riskPerTrade": "string", "suggestedLotSize": "string", "safetyScore": number },
  "sentiment": { "score": number, "summary": "string" }
}
`;
};

async function callGeminiDirectly(request: AnalysisRequest): Promise<SignalData> {
    const MODELS = ['gemini-2.5-flash'];

    const response = await executeChartGeminiCall<GenerateContentResponse>(async (apiKey) => {
        const ai = new GoogleGenAI({ apiKey });
        
        const textPart = { text: PROMPT(request.riskRewardRatio, request.tradingStyle, request.isMultiDimensional, request.profitMode, request.globalContext, request.learnedStrategies, request.userSettings) };
        const promptParts: any[] = [textPart];
        
        if (request.isMultiDimensional && request.images.higher) promptParts.push({ inlineData: { data: request.images.higher.data, mimeType: request.images.higher.mimeType } });
        promptParts.push({ inlineData: { data: request.images.primary.data, mimeType: request.images.primary.mimeType } });
        if (request.isMultiDimensional && request.images.entry) promptParts.push({ inlineData: { data: request.images.entry.data, mimeType: request.images.entry.mimeType } });

        return await runWithModelFallback<GenerateContentResponse>(MODELS, (modelId) => ai.models.generateContent({
            model: modelId,
            contents: [{ parts: promptParts }],
            config: {
                tools: [{googleSearch: {}}], 
                temperature: request.profitMode ? 0.1 : 0.25,
            },
        }));
    });

    const responseText = response.text;
    if (!responseText) throw new Error("Empty AI response.");
    let jsonString = responseText.trim();
    const firstBrace = jsonString.indexOf('{');
    const lastBrace = jsonString.lastIndexOf('}');
    if (firstBrace === -1) throw new Error("Invalid response format.");
    jsonString = jsonString.substring(firstBrace, lastBrace + 1);
    const parsedData: Omit<SignalData, 'id' | 'timestamp'> = JSON.parse(jsonString);
    return { ...parsedData, id: '', timestamp: 0 };
}

export async function generateTradingSignal(request: AnalysisRequest): Promise<SignalData> {
    const enhancedRequest = { ...request };
    const stored = getStoredGlobalAnalysis();
    if (stored) enhancedRequest.globalContext = stored.globalSummary;
    const strategies = getLearnedStrategies();
    if (strategies.length > 0) enhancedRequest.learnedStrategies = strategies;
    return callGeminiDirectly(enhancedRequest);
}
