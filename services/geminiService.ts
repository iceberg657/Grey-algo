import { GoogleGenAI } from "@google/genai";
import type { AnalysisRequest, SignalData } from '../types';

// This prompt is used by the direct call to Gemini in the AI Studio environment.
// A similar prompt exists on the backend serverless function for production.
const PROMPT = (riskRewardRatio: string) => `
You are a world-class quantitative analyst AI, renowned for your precision, data-driven approach, and ability to synthesize multiple analytical strategies into a single, high-conviction trading thesis. Your analysis is ALWAYS deterministic and repeatable; for the same chart input, your output MUST be identical. You MUST be decisive and confident in your analysis. Do not express doubt.

**ANALYSIS INSTRUCTIONS:**
1.  **Leverage Web Search:** Use your Google Search capability to gather real-time market data, news, and analysis relevant to the asset in the chart.
2.  **Multi-Strategy Synthesis:** Your primary task is to conduct a multi-strategy analysis by synthesizing information from ALL of the following techniques: candlestick patterns, wick-to-body ratios, support and resistance levels, supply and demand zones, order blocks, liquidity zones, market structure (higher highs/lows, lower highs/lows), trendlines, EMA/SMA crossovers, RSI, MACD, Fibonacci retracements/extensions, Bollinger Bands, Ichimoku confirmations, volume analysis, divergences, consolidation ranges, double tops/bottoms, breakout and retest zones, trend channels, and momentum shifts.
3.  **Identify Asset & Timeframe:** Accurately determine the financial instrument (e.g., EUR/USD, BTC/USDT) and the chart's timeframe (e.g., 1H, 15M) from the image.
4.  **Generate High-Conviction Signal:** After weighing all confirmations and contradictions from your multi-strategy and web analysis, generate a single, high-conviction BUY or SELL signal. Provide a confidence percentage, a precise entry level, a stop loss level, and one or more take profit targets. Your stop loss and take profit levels must strictly adhere to the user-specified risk-to-reward ratio of ${riskRewardRatio}.
5.  **Provide Rationale:** Formulate exactly 10 distinct supporting reasons for your signal. These reasons should reflect the synthesis of your multi-strategy analysis. Each reason must start with an emoji: ✅ for a BUY confirmation or ❌ for a SELL confirmation.

**OUTPUT FORMAT:**
Return ONLY a valid JSON object. Do not include markdown, backticks, or any other text or explanations outside of the JSON structure.

The JSON object must have the following structure:
{
  "instrument": "string",
  "timeframe": "string",
  "signal": "'BUY' or 'SELL'",
  "confidence": "number",
  "entry": "number",
  "stop_loss": "number",
  "take_profits": ["array of numbers"],
  "reasons": ["array of 10 strings"]
}
`;

/**
 * Handles the direct API call to Google Gemini.
 * This function is used when the app is running in an environment like Google AI Studio,
 * where the API key is available on the client side.
 */
async function callGeminiDirectly(request: AnalysisRequest): Promise<SignalData> {
    // This will only be called if process.env.API_KEY is available.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

    try {
        const imagePart = {
            inlineData: {
                data: request.image.data,
                mimeType: request.image.mimeType,
            },
        };

        const textPart = { text: PROMPT(request.riskRewardRatio) };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
            config: {
                tools: [{googleSearch: {}}],
                seed: 42,
                temperature: 0.2,
            },
        });

        const responseText = response.text;

        if (!responseText) {
            throw new Error("Received an empty response from the AI.");
        }
        
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        const sources = groundingChunks
            ?.map(chunk => chunk.web)
            .filter((web): web is { uri: string; title: string } => !!(web && web.uri && web.title)) || [];

        const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
        const jsonString = jsonMatch ? jsonMatch[1] : responseText;
        
        const parsedData: SignalData = JSON.parse(jsonString.trim());
        
        if (!parsedData.signal || !parsedData.entry || !parsedData.stop_loss || !parsedData.take_profits) {
            throw new Error("AI response is missing required fields.");
        }
        
        if (sources.length > 0) {
            parsedData.sources = sources;
        }

        return parsedData;
    } catch (error) {
        console.error("Direct Gemini Service Error:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred calling the Gemini API.";
        throw new Error(`Failed to generate trading signal: ${errorMessage}`);
    }
}

/**
 * Calls the backend API endpoint (/api/fetchData).
 * This function is used in a production environment (like Vercel) where the API key
 * is kept secure on the server.
 */
async function callApiEndpoint(request: AnalysisRequest): Promise<SignalData> {
     try {
        const response = await fetch('/api/fetchData', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ details: response.statusText }));
            throw new Error(errorData.details || `Request failed with status ${response.status}`);
        }

        const data: SignalData = await response.json();
        return data;
    } catch (error) {
        console.error("Backend API Error:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown network error occurred.";
        throw new Error(`Failed to generate trading signal: ${errorMessage}`);
    }
}


/**
 * Generates a trading signal by determining the environment and calling the appropriate service.
 * - In Google AI Studio (or any env with a client-side API_KEY), it calls Gemini directly.
 * - In a production web deployment, it calls a secure backend endpoint.
 */
export async function generateTradingSignal(request: AnalysisRequest): Promise<SignalData> {
    if (process.env.API_KEY) {
        console.log("Using direct Gemini API call (AI Studio environment detected).");
        return callGeminiDirectly(request);
    } else {
        console.log("Using backend API endpoint (Vercel/Web environment detected).");
        return callApiEndpoint(request);
    }
}
