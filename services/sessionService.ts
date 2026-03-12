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
  const prompt = `Act as a professional market analyst. Provide a detailed analysis for the ${session} trading session. Include:
1. Major economic events happening within this session.
2. Affected pairs and assets.
3. Volatile pairs and assets.
4. Bullish and bearish pairs and assets.
5. Desired assets to trade at this time.
Return the result in a structured JSON format.`;

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
