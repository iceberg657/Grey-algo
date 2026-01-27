
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { AnalysisRequest, SignalData } from '../types';
import { runWithModelFallback, executeLaneCall, ANALYSIS_POOL, LANE_1_MODELS } from './retryUtils';

const PROMPT = (riskRewardRatio: string, tradingStyle: string, isMultiDimensional: boolean, profitMode: boolean, globalContext?: string, learnedStrategies: string[] = []) => {
    return `Act as an Elite Prop Firm Trader. Mission: Identify high-probability visual SMC setups.
R:R: ${riskRewardRatio}. Style: ${tradingStyle}.
REQUIREMENTS: Entry, Stop Loss, 3 TPs, and institutional reasoning.
Output strictly valid JSON.`;
};

async function callGeminiDirectly(request: AnalysisRequest): Promise<Omit<SignalData, 'id' | 'timestamp'>> {
    return await executeLaneCall<Omit<SignalData, 'id' | 'timestamp'>>(async (apiKey) => {
        const ai = new GoogleGenAI({ apiKey });
        
        const promptText = PROMPT(request.riskRewardRatio, request.tradingStyle, request.isMultiDimensional, request.profitMode, request.globalContext, request.learnedStrategies);
        const promptParts: any[] = [{ text: promptText }];
        
        if (request.isMultiDimensional && request.images.higher) promptParts.push({ inlineData: { data: request.images.higher.data, mimeType: request.images.higher.mimeType } });
        promptParts.push({ inlineData: { data: request.images.primary.data, mimeType: request.images.primary.mimeType } });
        if (request.isMultiDimensional && request.images.entry) promptParts.push({ inlineData: { data: request.images.entry.data, mimeType: request.images.entry.mimeType } });

        // LANE 1 CASCADE: 3.0 Flash -> 2.5 Pro -> 2.5 Flash -> 2.5 Lite
        const response = await runWithModelFallback<GenerateContentResponse>(LANE_1_MODELS, (modelId) => 
            ai.models.generateContent({
                model: modelId,
                contents: [{ parts: promptParts }],
                config: { tools: [{googleSearch: {}}], temperature: 0.2 },
            })
        );

        const text = response.text || '';
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start === -1 || end === -1) throw new Error("Invalid format: No JSON object found in response.");
        
        const data = JSON.parse(text.substring(start, end + 1));
        return data; // Return raw data, let saveAnalysis handle id/timestamp
    }, ANALYSIS_POOL);
}

export async function generateTradingSignal(request: AnalysisRequest): Promise<Omit<SignalData, 'id' | 'timestamp'>> {
    return callGeminiDirectly(request);
}
