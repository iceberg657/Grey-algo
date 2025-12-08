
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { PredictedEvent } from '../types';
import { runWithModelFallback } from './retryUtils';

const MODELS = ['gemini-2.5-flash', 'gemini-flash-lite-latest'];

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
        // Using Flash models per user request for prediction speed/cost
        const response = await runWithModelFallback<GenerateContentResponse>(MODELS, (modelId) => ai.models.generateContent({
            model: modelId,
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
