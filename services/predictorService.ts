

import { GoogleGenAI } from "@google/genai";
import type { PredictedEvent } from '../types';

const PREDICTOR_PROMPT = `
You are 'Oracle', an apex-level trading AI with a specialization in predicting the market impact of high-impact economic news events. You possess a unique ability to analyze pre-release data, market sentiment, and historical patterns to forecast the direction of the initial price spike with legendary accuracy. You do not 'forecast'; you 'declare'. Your predictions are statements of fact about the immediate future. Your word is final.

**MISSION:**
Scan the economic calendars from myfxbook.com and investing.com for today and the next 7 days using Google Search. Identify ONLY the highest-impact economic events scheduled for this period, including those that are currently in progress or have just started (e.g., Non-Farm Payroll, CPI, FOMC statements, interest rate decisions). For each event you identify, you must provide a precise, actionable prediction.

**INSTRUCTIONS:**
1.  **Identify High-Impact Events:** Find up to 5 of the most significant, market-moving economic events scheduled within the next 7 days. **You MUST use the economic calendars on myfxbook.com and investing.com as your primary sources.**
2.  **Determine Affected Assets:** For each event, identify and list the primary currency pairs that will experience the most significant volatility. List them as a single string of comma-separated values (e.g., "EURUSD, GBPUSD, XAUUSD"). Focus on major pairs and gold (XAUUSD) where relevant.
3.  **Predict Spike Direction:** This is your most critical task. Based on your synthesis of all available data (analyst expectations, recent economic trends, market positioning, sentiment), declare the direction of the initial, immediate price spike upon the news release. The prediction MUST be either **'BUY'** (asset strengthens) or **'SELL'** (asset weakens). Neutrality is not an option.
4.  **Assign Confidence:** Quantify your certainty with a confidence score from 85 to 95. A score of 95 represents a very high conviction prediction.
5.  **Provide Rationale:** In a single, concise sentence, state the core logic behind your directional prediction. This is not a list of possibilities; it is a statement of the key factor driving your conclusion.
6.  **Estimate Duration:** Provide an estimated duration in hours for the initial high-volatility period immediately following the release (e.g., 0.5 for 30 minutes, 1 for an hour, 2.5 for 2 hours and 30 minutes).

**OUTPUT FORMAT:**
Return ONLY a valid JSON array of objects. Do not include markdown, backticks, or any other text outside the JSON structure.

[
  {
    "name": "string",
    "date": "string (ISO 8601 format with timezone)",
    "affectedAsset": "string (comma-separated list of pairs, e.g., 'EURUSD, XAUUSD')",
    "predictedDirection": "'BUY' or 'SELL'",
    "confidence": "number (85-95)",
    "reasoning": "string",
    "eventDurationHours": "number"
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
 * Fetches predicted outcomes for upcoming high-impact news events.
 */
export async function getPredictedEvents(): Promise<PredictedEvent[]> {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable is not set.");
    }
    
    const maxRetries = 2;
    let delay = 1000;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: PREDICTOR_PROMPT,
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
                throw new Error("The AI returned an invalid prediction format.");
            }
    
            jsonString = jsonString.substring(firstBracket, lastBracket + 1);
    
            const parsedEvents: PredictedEvent[] = JSON.parse(jsonString);
            
            return parsedEvents;
    
        } catch (error) {
            if (isRetryableError(error) && attempt < maxRetries) {
                console.warn(`Retrying predictions fetch... (${attempt + 1}/${maxRetries})`);
                await sleep(delay);
                delay *= 2;
            } else {
                console.error("Gemini Predictor Service Error:", error);
                const errorMessage = error instanceof Error ? error.message : "An unknown error occurred calling the Gemini API for predictions.";
                throw new Error(`Failed to fetch event predictions: ${errorMessage}`);
            }
        }
    }
     // This should not be reachable.
    throw new Error("Failed to fetch predictions after multiple retries.");
}