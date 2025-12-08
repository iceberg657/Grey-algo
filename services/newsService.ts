
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { NewsArticle } from '../types';
import { runWithRetry } from './retryUtils';

const NEWS_PROMPT = `
Find the top 10 most impactful Forex news articles from MyFxBook and Investing.com.
Return strictly as a JSON array of objects: { "title": string, "summary": string, "url": string, "source": string, "date": string }.
`;

export async function getForexNews(): Promise<NewsArticle[]> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

    try {
        const response = await runWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash', // Flash for fast summarization
            contents: NEWS_PROMPT,
            config: {
                tools: [{googleSearch: {}}],
                temperature: 0.2,
            },
        }));

        const responseText = response.text?.trim();
        if (!responseText) return [];

        let jsonString = responseText;
        const firstBracket = jsonString.indexOf('[');
        const lastBracket = jsonString.lastIndexOf(']');

        if (firstBracket !== -1 && lastBracket !== -1) {
            jsonString = jsonString.substring(firstBracket, lastBracket + 1);
        }

        return JSON.parse(jsonString);

    } catch (error) {
        console.error("News Service Error:", error);
        throw new Error("Failed to fetch news.");
    }
}
