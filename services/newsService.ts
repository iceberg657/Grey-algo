
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { NewsArticle } from '../types';
import { executeLaneCall, SERVICE_POOL } from './retryUtils';

export async function getForexNews(): Promise<NewsArticle[]> {
    return await executeLaneCall<NewsArticle[]>(async (apiKey) => {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: "Find 10 high-impact forex news articles. Return valid JSON array.",
            config: { tools: [{googleSearch: {}}], temperature: 0.2 },
        });
        const text = response.text || '[]';
        return JSON.parse(text.substring(text.indexOf('['), text.lastIndexOf(']') + 1));
    }, SERVICE_POOL);
}
