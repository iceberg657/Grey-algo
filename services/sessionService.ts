import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = import.meta.env.VITE_API_KEY_8;
    if (!apiKey) {
      throw new Error("VITE_API_KEY_8 is not defined");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

export async function fetchSessionAnalysis(session: string) {
  const ai = getAiClient();
  const prompt = `Analyze the ${session} session. Provide a market signal (BUY or SELL) based on technical analysis. You MUST choose either BUY or SELL. Do not use NEUTRAL. Return ONLY valid JSON: {
  "signal": "string",
  "confidence": number,
  "economic_events": [{"event": "string", "impact": "string", "significance": "string"}],
  "market_sentiment": {"bullish": ["string"], "bearish": ["string"]},
  "suggested_trading_assets": [{"asset": "string", "reasoning": "string"}]
}`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      temperature: 0,
    },
  });

  if (!response.text) {
    throw new Error("No analysis generated.");
  }

  return JSON.parse(response.text);
}
