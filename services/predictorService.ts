
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { PredictedEvent } from '../types';
import { runWithRetry } from './retryUtils';

const PREDICTOR_PROMPT = `
You are 'Oracle', an apex-level trading AI.
**MISSION:** Scan economic calendars (MyFxBook, Investing.com) for the next 7 days.
**TASK:** Identify high-impact events and predict the **INITIAL PRICE SPIKE DIRECTION** based on consensus vs. actual forecasts and institutional positioning.

**OUTPUT FORMAT (Strict JSON Array):**
[
  {
    "name": "string",
    "date": "string (ISO 8601)",
    "affectedAsset": "string",
    "predictedDirection": "'BUY' or 'SELL'",
    "confidence": "number (85-95)",
    "reasoning": "string",
    "eventDurationHours": "number"
  }
]
`;

export async function getPredictedEvents(): Promise<PredictedEvent[]> {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable is not set.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    try {
        // Using Pro model for deeper reasoning on economic impact
        const response = await runWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: PREDICTOR_PROMPT,
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
        console.error("Gemini Predictor Service Error:", error);
        throw new Error("Failed to fetch event predictions.");
    }
}
