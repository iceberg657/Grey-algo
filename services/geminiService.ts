
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { AnalysisRequest, SignalData } from '../types';
import { getStoredGlobalAnalysis } from './globalMarketService';
import { getLearnedStrategies } from './learningService';
import { runWithModelFallback, executeLaneCall, ANALYSIS_POOL } from './retryUtils';

const PROMPT = (riskRewardRatio: string, tradingStyle: string, isMultiDimensional: boolean, profitMode: boolean, globalContext?: string, learnedStrategies: string[] = []) => {
    return `Act as an Elite Prop Firm Trader. Mission: Identify high-probability visual SMC setups.
R:R: ${riskRewardRatio}. Style: ${tradingStyle}.
REQUIREMENTS: Entry, Stop Loss, 3 TPs, and institutional reasoning.
Output strictly valid JSON.`;
};

async function callGeminiDirectly(request: AnalysisRequest): Promise<SignalData> {
    // AS REQUESTED: Chart Analysis uses Gemini 2.5 Flash
    const model = 'gemini-2.5-flash';

    return await executeLaneCall<SignalData>(async (apiKey) => {
        const ai = new GoogleGenAI({ apiKey });
        
        const promptText = PROMPT(request.riskRewardRatio, request.tradingStyle, request.isMultiDimensional, request.profitMode, request.globalContext, request.learnedStrategies);
        const promptParts: any[] = [{ text: promptText }];
        
        if (request.isMultiDimensional && request.images.higher) promptParts.push({ inlineData: { data: request.images.higher.data, mimeType: request.images.higher.mimeType } });
        promptParts.push({ inlineData: { data: request.images.primary.data, mimeType: request.images.primary.mimeType } });
        if (request.isMultiDimensional && request.images.entry) promptParts.push({ inlineData: { data: request.images.entry.data, mimeType: request.images.entry.mimeType } });

        const response = await ai.models.generateContent({
            model: model,
            contents: [{ parts: promptParts }],
            config: { tools: [{googleSearch: {}}], temperature: 0.2 },
        });

        const text = response.text || '';
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start === -1 || end === -1) throw new Error("Invalid format");
        
        const data = JSON.parse(text.substring(start, end + 1));
        return { ...data, id: Date.now().toString(), timestamp: Date.now() };
    }, ANALYSIS_POOL);
}

export async function generateTradingSignal(request: AnalysisRequest): Promise<SignalData> {
    return callGeminiDirectly(request);
}
