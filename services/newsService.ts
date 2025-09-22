import { GoogleGenAI, Type } from "@google/genai";
import type { NewsArticle } from '../types';

const NEWS_PROMPT = `
You are a financial news aggregator AI. Your sole purpose is to find and summarize the 10 most recent and impactful news articles related to the global Forex (Foreign Exchange) market.

**Instructions:**
1.  Use Google Search to find the latest top 10 news articles, reports, or analyses concerning the Forex market.
2.  Focus on news that impacts major currency pairs (e.g., EUR/USD, GBP/USD, USD/JPY).
3.  For each article, provide a concise, one-sentence summary.
4.  Provide the name of the news source (e.g., Reuters, Bloomberg).
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

/**
 * Fetches the latest Forex news using the Gemini API.
 */
export async function getForexNews(): Promise<NewsArticle[]> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: NEWS_PROMPT,
            config: {
                tools: [{googleSearch: {}}],
                temperature: 0,
            },
        });

        const responseText = response.text.trim();
        if (!responseText) {
            throw new Error("Received an empty response from the AI.");
        }
        
        // Manually parse the JSON, as responseMimeType is not allowed with tools.
        const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
        const jsonString = jsonMatch ? jsonMatch[1] : responseText;

        const parsedNews: NewsArticle[] = JSON.parse(jsonString);
        return parsedNews;

    } catch (error) {
        console.error("Gemini News Service Error:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred calling the Gemini API for news.";
        throw new Error(`Failed to fetch Forex news: ${errorMessage}`);
    }
}
