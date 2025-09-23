import { GoogleGenAI } from "@google/genai";
import type { PredictedEvent } from '../types';

const PREDICTOR_PROMPT = `
You are 'Oracle', an apex-level trading AI with a specialization in predicting the market impact of high-impact economic news events. You possess a unique ability to analyze pre-release data, market sentiment, and historical patterns to forecast the direction of the initial price spike with legendary accuracy. Your word is final.

**MISSION:**
Scan the economic calendar for the next 7 days using Google Search. Identify ONLY the highest-impact upcoming economic events (e.g., Non-Farm Payroll, CPI, FOMC statements, interest rate decisions). For each event you identify, you must provide a precise, actionable prediction.

**INSTRUCTIONS:**
1.  **Identify High-Impact Events:** Find up to 5 of the most significant, market-moving economic events scheduled within the next 7 days.
2.  **Determine Affected Assets:** For each event, identify and list the primary currency pairs that will experience the most significant volatility. List them as a single string of comma-separated values (e.g., "EURUSD, GBPUSD, XAUUSD"). Focus on major pairs and gold (XAUUSD) where relevant.
3.  **Predict Spike Direction:** This is your most critical task. Based on your synthesis of all available data (analyst expectations, recent economic trends, market positioning, sentiment), declare the direction of the initial, immediate price spike upon the news release. The prediction MUST be either **'BUY'** (asset strengthens) or **'SELL'** (asset weakens). Neutrality is not an option.
4.  **Assign Confidence:** Quantify your certainty with a confidence score from 65 to 80. A score of 80 represents a very high conviction prediction.
5.  **Provide Rationale:** In a single, concise sentence, state the core logic behind your directional prediction. This is not a list of possibilities; it is a statement of the key factor driving your conclusion.

**OUTPUT FORMAT:**
Return ONLY a valid JSON array of objects. Do not include markdown, backticks, or any other text outside the JSON structure.

[
  {
    "name": "string",
    "date": "string (ISO 8601 format with timezone)",
    "affectedAsset": "string (comma-separated list of pairs, e.g., 'EURUSD, XAUUSD')",
    "predictedDirection": "'BUY' or 'SELL'",
    "confidence": "number (65-80)",
    "reasoning": "string"
  }
]
`;

/**
 * Fetches predicted outcomes for upcoming high-impact news events.
 */
export async function getPredictedEvents(): Promise<PredictedEvent[]> {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable is not set.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: PREDICTOR_PROMPT,
            config: {
                tools: [{googleSearch: {}}],
                temperature: 0.1, // A little temperature for nuanced predictions
            },
        });

        const responseText = response.text.trim();
        if (!responseText) {
            throw new Error("Received an empty response from the AI.");
        }
        
        const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
        const jsonString = jsonMatch ? jsonMatch[1] : responseText;

        const parsedEvents: PredictedEvent[] = JSON.parse(jsonString);
        
        // Sort events by date, soonest first
        parsedEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        return parsedEvents;

    } catch (error) {
        console.error("Gemini Predictor Service Error:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred calling the Gemini API for predictions.";
        throw new Error(`Failed to fetch event predictions: ${errorMessage}`);
    }
}