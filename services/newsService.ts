

import { GoogleGenAI, Type } from "@google/genai";
import type { NewsArticle } from '../types';

const NEWS_PROMPT = `
You are a financial news aggregator AI. Your sole purpose is to find and summarize the 10 most recent and impactful news articles related to the global Forex (Foreign Exchange) market, specifically from myfxbook.com and investing.com.

**Instructions:**
1.  Use Google Search to find the latest top 10 news articles, reports, or analyses concerning the Forex market. **You MUST prioritize and source content exclusively from myfxbook.com and investing.com.**
2.  Focus on news that impacts major currency pairs (e.g., EUR/USD, GBP/USD, USD/JPY).
3.  For each article, provide a concise, one-sentence summary.
4.  Provide the name of the news source, which will be either 'MyFxBook' or 'Investing.com'.
5.  Provide the original URL of the article.
6.  Provide the publication date in strict ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ).

**Output Format:**
Return ONLY a valid JSON object that is an array of news articles. Do not include markdown, backticks, or any other text outside the JSON structure.
[
    {
        "title": "string",
        "summary": "string",
        "url": "string",
        "source": "string",
        "date": "string (ISO 8601 format)"
    }
]
`;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        return message.includes('503') || message.includes('overloaded') || message.includes('xhr error');
    }
    return false;
}

/**
 * Fetches the latest Forex news using the Gemini API.
 */
export async function getForexNews(): Promise<NewsArticle[]> {
    const maxRetries = 2;
    let delay = 1000;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: NEWS_PROMPT,
                config: {
                    tools: [{googleSearch: {}}],
                    temperature: 0.2,
                },
            });

            const responseText = response.text.trim();
            if (!responseText) {
                throw new Error("Received an empty response from the AI.");
            }
            
            let jsonString = responseText;
            const firstBracket = jsonString.indexOf('[');
            const lastBracket = jsonString.lastIndexOf(']');

            if (firstBracket === -1 || lastBracket === -1 || lastBracket < firstBracket) {
                console.error("Failed to extract JSON array from response:", responseText);
                throw new Error("The AI returned an invalid news format.");
            }

            jsonString = jsonString.substring(firstBracket, lastBracket + 1);

            const parsedNews: NewsArticle[] = JSON.parse(jsonString);
            return parsedNews;

        } catch (error) {
            if (isRetryableError(error) && attempt < maxRetries) {
                console.warn(`Retrying news fetch... (${attempt + 1}/${maxRetries})`);
                await sleep(delay);
                delay *= 2;
            } else {
                console.error("Gemini News Service Error:", error);
                const errorMessage = error instanceof Error ? error.message : "An unknown error occurred calling the Gemini API for news.";
                throw new Error(`Failed to fetch Forex news: ${errorMessage}`);
            }
        }
    }
    // This should not be reachable due to the throw in the catch block.
    throw new Error("Failed to fetch news after multiple retries.");
}