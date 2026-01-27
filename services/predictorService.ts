
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { PredictedEvent } from '../types';
import { runWithModelFallback, executeLaneCall, PREDICTION_POOL, PREDICTION_MODELS } from './retryUtils';

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
    try {
        return await executeLaneCall<PredictedEvent[]>(async (apiKey) => {
            const ai = new GoogleGenAI({ apiKey });

            // LANE 2 CASCADE: 2.5 Flash -> 2.0 Flash
            const response = await runWithModelFallback<GenerateContentResponse>(PREDICTION_MODELS, (modelId) => ai.models.generateContent({
                model: modelId,
                contents: PREDICTOR_PROMPT,
                config: {
                    tools: [{googleSearch: {}}],
                    temperature: 0.2,
                },
            }));

            const responseText = response.text?.trim();
            if (!responseText) return [];

            const start = responseText.indexOf('[');
            const end = responseText.lastIndexOf(']') + 1;
            if (start === -1) return [];

            return JSON.parse(responseText.substring(start, end));
        }, PREDICTION_POOL);

    } catch (error) {
        console.error("Gemini Predictor Service Error:", error);
        throw new Error("Failed to fetch event predictions.");
    }
}
