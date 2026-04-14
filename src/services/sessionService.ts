import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { executeLaneCall, getChatPool, CHAT_MODELS, runWithModelFallback } from './retryUtils';

export async function fetchSessionAnalysis(session: string) {
  return await executeLaneCall(async (apiKey) => {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Analyze the ${session} session. Provide a market signal (BUY or SELL) based on technical analysis. You MUST choose either BUY or SELL. Do not use NEUTRAL. Return ONLY valid JSON: {
    "signal": "string",
    "confidence": number,
    "economic_events": [{"event": "string", "impact": "string", "significance": "string"}],
    "market_sentiment": {"bullish": ["string"], "bearish": ["string"]},
    "suggested_trading_assets": [{"asset": "string", "reasoning": "string"}]
    }`;

    const response = await runWithModelFallback<GenerateContentResponse>(CHAT_MODELS, (modelId) => 
      ai.models.generateContent({
        model: modelId,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0,
        },
      })
    );

    if (!response.text) {
      throw new Error("No analysis generated.");
    }

    return JSON.parse(response.text);
  }, getChatPool);
}
