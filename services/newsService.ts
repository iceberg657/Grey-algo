
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { NewsArticle } from '../types';
import { executeLaneCall, SERVICE_POOL, runWithModelFallback, LANE_2_MODELS } from './retryUtils';

export async function getForexNews(): Promise<NewsArticle[]> {
    return await executeLaneCall<NewsArticle[]>(async (apiKey) => {
        const ai = new GoogleGenAI({ apiKey });
        
        // LANE 2 CASCADE: 2.5 Lite -> 2.0 Flash
        const response = await runWithModelFallback<GenerateContentResponse>(LANE_2_MODELS, (modelId) => 
            ai.models.generateContent({
                model: modelId,
                contents: "Find 10 high-impact forex news articles. Return valid JSON array.",
                config: { tools: [{googleSearch: {}}], temperature: 0.2 },
            })
        );

        const text = response.text || '[]';
        const start = text.indexOf('[');
        const end = text.lastIndexOf(']') + 1;
        if (start === -1) return [];
        return JSON.parse(text.substring(start, end));
    }, SERVICE_POOL);
}
