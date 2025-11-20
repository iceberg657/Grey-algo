
import { GoogleGenAI } from "@google/genai";
import type { AnalysisRequest, SignalData } from '../types';

const PROMPT = (riskRewardRatio: string, tradingStyle: string, isMultiDimensional: boolean) => {
    const styleInstruction = tradingStyle === 'Short Term' 
        ? "Short Term (Intraday Power Shift): Execute as an Intraday strategy focused on MOMENTUM DOMINANCE. Look for specific scenarios where one side is overpowering the other (e.g., Bulls overpowering Bears in a downtrend, or Bears overpowering Bulls in an uptrend). Prioritize entries at these moments of power shift."
        : tradingStyle;

    return `
Act as an expert forex trading analyst. Your primary goal is to provide a clear, actionable trading recommendation (BUY, SELL, or WAIT) based strictly on a multi-timeframe analysis of the provided chart screenshots. You must follow the structured, step-by-step framework below.

**Context:**
${isMultiDimensional
? `You are provided with three charts: 1. Strategic View (Highest TF), 2. Tactical View (Middle TF), 3. Execution View (Lowest TF). Use this hierarchy for your analysis.`
: `You are provided with a single Tactical View chart. Adapt the multi-step analysis to market structure visible on this single timeframe.`}

**Core Analytical Framework:**

**Step 1: Analyze the Strategic Trend (Highest Timeframe - e.g., H4, D1)**
· Identify the dominant Market Structure: Is it an uptrend (Higher Highs, Higher Lows), downtrend (Lower Highs, Lower Lows), or a range?
· Mark the most critical Support (major price floor) and Resistance (major price ceiling) levels.
· Determine the Primary Bias: "Bullish," "Bearish," or "Neutral."

**Step 2: Identify the Tactical Momentum (Middle Timeframe - e.g., M15, H1)**
· Assess if the shorter-term price action aligns with or contradicts the primary bias from Step 1.
· Locate the immediate Support/Resistance levels that define the current trading range or momentum.
· Determine the Confluence: Does this timeframe "Confirm," "Contradict," or present a "Neutral" signal relative to Step 1?

**Step 3: Pinpoint the Execution Trigger (Lowest Timeframe - e.g., M5, M1)**
· Find the precise price level where a trade entry is triggered (e.g., a specific "BUY" or "SELL" marker, or a key level test).
· Evaluate the current price's behavior at this level (e.g., bouncing, breaking, consolidating).
· Define the exact Stop-Loss (SL) level that would invalidate the trade idea, based on the nearest market structure break.
· Determine the Action: "BUY at [Price]," "SELL at [Price]," or "WAIT for a clearer trigger."

**Final Synthesis & Recommendation:**
· Combine the findings from all three steps.
· Provide a final, concise recommendation.
· State the rationale in one sentence, referencing the alignment (or misalignment) of the timeframes.

**Trading Parameters:**
· **Style:** Optimize for a **${styleInstruction}** approach.
· **Risk Management:** Target a Risk/Reward ratio of **${riskRewardRatio}**.

**Response Requirements:**
1. **Confidence:** Rate your analysis confidence (0-100) based on trend alignment and clarity of price action.
2. **External Data:** Use Google Search to fill the 'sentiment' and 'economicEvents' fields with real-time data.
3. **Strict Output:** Return ONLY a valid JSON object matching the structure below exactly.

**Output Format:**
{
  "asset": "string",
  "timeframe": "string",
  "signal": "'BUY', 'SELL', or 'NEUTRAL'",
  "confidence": "number (0-100)",
  "entryPoints": [number, number, number] (Provide exactly 3 numeric entry levels. If only one exists, offset slightly for the others),
  "stopLoss": "number",
  "takeProfits": [number, number, number] (Calculate 3 numeric levels based on R:R),
  "reasoning": ["string (Step 1 Findings)", "string (Step 2 Findings)", "string (Step 3 Findings & Final Recommendation)"],
  "checklist": ["string", "string", "string"],
  "invalidationScenario": "string",
  "sentiment": {
    "score": "number (0-100)",
    "summary": "string"
  },
  "economicEvents": [
    {
      "name": "string",
      "date": "string (ISO 8601 format)",
      "impact": "'High', 'Medium', or 'Low'"
    }
  ]
}
`;
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        let message = error.message;
        try {
            // Check for API endpoint error format first
            if (message.match(/^\d{3}:/)) {
                 const details = message.substring(4).trim();
                 // Attempt to parse nested JSON error from Gemini
                 try {
                     const parsedDetails = JSON.parse(details);
                     if(parsedDetails.error && parsedDetails.error.message) return parsedDetails.error.message;
                 } catch(e) {
                     // Not JSON, return the details string
                     return details;
                 }
            }

            const parsedError = JSON.parse(message);
            if (parsedError.error && parsedError.error.message) { // Gemini SDK error format
                return parsedError.error.message;
            }
        } catch (e) {
            // Not a JSON error, use the message as is
        }
        return message;
    }
    return "An unknown error occurred.";
}


function isOverloadedError(error: unknown): boolean {
    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        return message.includes('503') || message.includes('overloaded');
    }
    return false;
}


/**
 * Handles the direct API call to Google Gemini.
 */
async function callGeminiDirectly(request: AnalysisRequest): Promise<SignalData> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

    const textPart = { text: PROMPT(request.riskRewardRatio, request.tradingStyle, request.isMultiDimensional) };
    // FIX: Explicitly type promptParts to allow both text and image parts to be added.
    // This resolves the type inference issue where the array was assumed to only contain text parts.
    const promptParts: ({ text: string; } | { inlineData: { data: string; mimeType: string; }; })[] = [textPart];
    
    // Add images in a specific order: higher, primary, entry
    if (request.isMultiDimensional && request.images.higher) {
        promptParts.push({ inlineData: { data: request.images.higher.data, mimeType: request.images.higher.mimeType } });
    }
    promptParts.push({ inlineData: { data: request.images.primary.data, mimeType: request.images.primary.mimeType } });
    if (request.isMultiDimensional && request.images.entry) {
        promptParts.push({ inlineData: { data: request.images.entry.data, mimeType: request.images.entry.mimeType } });
    }

    const config: any = {
        tools: [{googleSearch: {}}],
        seed: 42,
        temperature: 0.4, // Increased to allow for more variability
    };

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: [{ parts: promptParts }],
        config,
    });

    const responseText = response.text;
    if (!responseText) {
        throw new Error("Received an empty response from the AI.");
    }
    
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const sources = groundingChunks
        ?.map(chunk => chunk.web)
        .filter((web): web is { uri: string; title: string } => !!(web && web.uri && web.title)) || [];

    // FIX: Implement a more robust JSON extraction method to handle responses
    // that may or may not be wrapped in markdown code blocks.
    let jsonString = responseText.trim();
    const firstBrace = jsonString.indexOf('{');
    const lastBrace = jsonString.lastIndexOf('}');

    if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
        console.error("Failed to extract JSON from response:", responseText);
        throw new Error("The AI returned an invalid response format.");
    }

    jsonString = jsonString.substring(firstBrace, lastBrace + 1);
    
    const parsedData: Omit<SignalData, 'id' | 'timestamp'> = JSON.parse(jsonString);
    
    if (!parsedData.signal || !parsedData.reasoning || !parsedData.entryPoints) {
        throw new Error("AI response is missing required fields.");
    }
    
    const fullData = { ...parsedData, id: '', timestamp: 0 };

    if (sources.length > 0) {
        fullData.sources = sources;
    }

    return fullData;
}

/**
 * Calls the backend API endpoint (/api/fetchData).
 */
async function callApiEndpoint(request: AnalysisRequest): Promise<SignalData> {
    const response = await fetch('/api/fetchData', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ details: response.statusText }));
        // The error message will contain the `details` from our backend, which is now user-friendly.
        // We also include the status code to help our retry logic.
        const errorMessage = errorData.details || `Request failed with status ${response.status}`;
        throw new Error(`${response.status}: ${errorMessage}`);
    }

    const data: Omit<SignalData, 'id' | 'timestamp'> = await response.json();
    return { ...data, id: '', timestamp: 0 };
}


/**
 * Generates a trading signal by determining the environment and calling the appropriate service,
 * with retry logic for overload errors.
 */
export async function generateTradingSignal(request: AnalysisRequest): Promise<SignalData> {
    const apiCall = () => {
        if (process.env.API_KEY) {
            console.log("Using direct Gemini API call (AI Studio environment detected).");
            return callGeminiDirectly(request);
        } else {
            console.log("Using backend API endpoint (Vercel/Web environment detected).");
            return callApiEndpoint(request);
        }
    };

    const maxRetries = 2;
    let delay = 2000; // 2 seconds

    for (let i = 0; i <= maxRetries; i++) {
        try {
            return await apiCall();
        } catch (error) {
            if (isOverloadedError(error) && i < maxRetries) {
                console.warn(`Model is overloaded. Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
                await sleep(delay);
                delay *= 2; // Exponential backoff
            } else {
                console.error("API call failed after retries or with a non-retriable error:", error);
                const userFriendlyMessage = getErrorMessage(error);
                throw new Error(userFriendlyMessage); // Throw a clean message for the UI
            }
        }
    }
    
    // This should not be reachable, but is needed for TypeScript.
    throw new Error("Failed to generate trading signal after multiple retries.");
}
