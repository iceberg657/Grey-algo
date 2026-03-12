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
  const prompt = `Act as a professional market analyst. Provide a detailed, comprehensive analysis for the ${session} trading session. Return the result in a structured JSON format with the following structure:
{
  "economic_events": [{"event": "string", "impact": "High/Medium/Low", "significance": "string"}],
  "market_sentiment": {"bullish": ["string"], "bearish": ["string"]},
  "suggested_trading_assets": [{"asset": "string", "reasoning": "string"}]
}`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  if (!response.text) {
    throw new Error("No analysis generated.");
  }

  return JSON.parse(response.text);
}
