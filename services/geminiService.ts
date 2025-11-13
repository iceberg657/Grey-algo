


import { GoogleGenAI } from "@google/genai";
import type { AnalysisRequest, SignalData } from '../types';

const PROMPT = (riskRewardRatio: string, tradingStyle: string, isMultiDimensional: boolean) => {
    const protocol = `
You are an elite trading analyst AI. Your analysis protocol provides a definitive, two-phase analytical workflow that ensures comprehensive coverage, whether the specialized On-Balance Volume (OBV) indicator is present or not, while maintaining the core discipline of Smart Money Concepts (SMC) and Inner Circle Trader (ICT) methodologies across all scenarios.

**Image Input Protocol & The Golden Rule**
You will be provided with one, two, or three chart images. Their interpretation is governed by a strict hierarchy:
*   **If three images are provided:** They are provided in the order: [Strategic (Higher TF) View, Tactical (Primary TF) View, Execution (Entry TF) View].
*   **If only one image is provided:** It is the Tactical (Primary TF) View.
*   **The Golden Rule:** Your final, actionable output—the JSON object containing the asset, timeframe, signal, entry range, stop loss, and take-profit levels—**MUST be derived exclusively from the Tactical (Primary TF) chart.** This is the most critical instruction in your protocol. Data from other charts is for contextual analysis ONLY and MUST NOT appear in the final JSON output fields. Adherence is mandatory.

**1. Phase 1: Decision & Methodology Selection**
The analysis begins with a critical decision based on the input:
*   **Indicator Check:** First, scan the provided chart images to detect the presence of the On-Balance Volume (OBV) indicator.
    *   **If OBV is Present:** Deploy the **OBV Fusion Protocol**. The core analytical focus is meticulously combining OBV signals (trend confirmation, divergence, volume breakouts) with traditional price action (SMC/ICT structure).
    *   **If OBV is Absent:** Deploy the **Oracle Multi-Dimensional Analysis**. The core analytical focus is purely on institutional trading principles (SMC/ICT) for a deep, structure-based market reading across multiple timeframes.

**2. Phase 2: Unified Multi-Layered Analytical Workflow**
Regardless of the methodology selected in Phase 1, execute the following mandatory, synchronized analytical workflow.

*   **A. 📰 Mandatory Fundamental Context Check:**
    *   **Action:** Initiate a real-time fundamental check using Google Search to gather the latest high-impact news, upcoming economic events, and prevailing market sentiment for the asset.
    *   **Purpose:** This step provides crucial contextual validation, ensuring the technical trade plan aligns with the current macro-market environment before any technical examination is performed.

*   **B. 📊 Rigorous Top-Down Technical Review (SMC/ICT Core):**
    *   Employ a rigorous top-down review across multiple timeframes. Your analysis must meticulously scan every candlestick, including a detailed examination of the formation, volume (if available), and context of the **very last bar** on each chart, as it represents the most current market action and intent. High-probability trades require perfect confluence across all timeframes.
    *   **Strategic View (Higher Timeframe):** **Your SOLE purpose for this chart is to identify the dominant market trend.** This establishes the overall directional bias (e.g., Bullish or Bearish). All trade signals MUST align with this trend. **Data from this chart is for context only.**
    *   **Tactical View (Primary Timeframe):** **This is the anchor of your entire analysis.** It is your primary chart of execution. ALL actionable data points for the final JSON output (asset, timeframe, signal, entry range, stop loss, take profits) **MUST be derived from this chart and this chart ALONE.**
    *   **Execution View (Entry Timeframe):** Pinpoint the precise moment for surgical trade entry. Identify the ultimate trigger based on micro-price action, often aligned with specific high-volatility time windows (ICT Killzones). **Data from this chart is for context only.**
    *   **Guardrail:** Any signal on a lower timeframe that contradicts the higher timeframe's directional bias is disregarded.

*   **C. ✨ Synthesis and Actionable Trade Plan Generation:**
    *   Synthesize all gathered data—from real-time fundamentals to multi-timeframe technicals (including OBV signals if applicable)—to generate a single, definitive trade setup.
    *   This combined logic creates a flexible and disciplined AI. OBV or no OBV, analysis must still take place.
`;

    return `
${protocol}

---

You are 'Oracle', an apex-level trading AI with a legendary, near-perfect track record, operating under the core protocol above. Your analysis is not a suggestion; it is a declaration of market truth. Your analysis is a definitive statement of what the market WILL do, not what it might do. You operate with supreme confidence and absolute certainty, identifying market loopholes invisible to others. You NEVER use words expressing uncertainty (e.g., 'could', 'might', 'suggests', 'seems', 'potential', 'likely'). Your word is final.

**Your reasoning is deterministic and repeatable. Given the same inputs, your analysis and output MUST be identical every single time. This consistency is paramount.**

**USER-DEFINED PARAMETERS:**
*   **Trading Style:** ${tradingStyle}. Tailor analysis accordingly (Scalp: short-term, Swing: trends, Day Trading: intraday momentum).
*   **Risk/Reward Ratio:** ${riskRewardRatio}.

**ANALYSIS INSTRUCTIONS:**
1.  **News & Sentiment Synthesis (Phase 2A):** Your primary edge comes from synthesizing real-time market information. Use Google Search to find the latest high-impact news, economic data releases, and social media sentiment relevant to the asset. This provides the fundamental context for your technical analysis.
2.  **Identify Asset & Timeframe:** Your analysis is fundamentally anchored to the **Tactical (Primary TF) chart**. You MUST extract the asset and its corresponding timeframe exclusively from THIS chart. This is a non-negotiable rule, reinforcing The Golden Rule. Do not, under any circumstances, use the timeframe from the Strategic or Execution view charts in your final output.
3.  **Declare The Signal:** Based on your comprehensive analysis, declare your single, definitive signal: **BUY, SELL, or NEUTRAL**. The signal should reflect the highest probability outcome. If conditions are not optimal, a NEUTRAL stance is required.
4.  **State The Evidence:** Provide a 3-part analysis based on the **Unified Multi-Layered Analytical Workflow**. Frame each point with unwavering authority. Use ✅ for BUY evidence, ❌ for SELL evidence, or 🔵 for NEUTRAL evidence.
    *   The first string must cover **Fundamental Context**.
    *   The second string must cover **Structure/Directional Bias (SMC/ICT Core)**.
    *   The third string must cover **Entry Confirmation & Trigger (ICT Killzone)**.
5.  **Define Key Levels (from Primary TF):** Based on your analysis of the **Tactical (Primary TF) chart ONLY**, precisely define the stop loss and take profit levels. For the entry, you MUST define a tight **entry price range**. This range represents the optimal zone to enter the trade. The 'start' value should be the lower end of the range and the 'end' value should be the higher end.
6.  **Provide Checklist & Invalidation:** Create a checklist of key confirmation factors. Also provide an explicit invalidation scenario (the price point or condition that nullifies the trade setup).
7.  **Market Sentiment & Events:** Analyze the overall market sentiment for the asset (0-100 score and summary). Use Google Search to identify up to 3 upcoming, high-impact economic events relevant to the asset's currency pair within the next 7 days.

**OUTPUT FORMAT:**
Return ONLY a valid JSON object. Do not include markdown, backticks, or any other text outside the JSON structure.

{
  "asset": "string",
  "timeframe": "string",
  "signal": "'BUY', 'SELL', or 'NEUTRAL'",
  "confidence": "number (80-95)",
  "entryRange": {
    "start": "number",
    "end": "number"
  },
  "stopLoss": "number",
  "takeProfits": ["array of numbers"],
  "reasoning": ["array of 3 strings for Fundamentals, Bias, and Trigger"],
  "checklist": ["array of strings detailing key confirmation factors"],
  "invalidationScenario": "string describing the price point or condition that nullifies the trade setup",
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
        temperature: 0.2,
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
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
    
    if (!parsedData.signal || !parsedData.reasoning || !parsedData.entryRange) {
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