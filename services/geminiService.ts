
import { GoogleGenAI } from "@google/genai";
import type { AnalysisRequest, SignalData } from '../types';
import { getStoredGlobalAnalysis } from './globalMarketService';
import { getLearnedStrategies } from './learningService';

const PROMPT = (riskRewardRatio: string, tradingStyle: string, isMultiDimensional: boolean, globalContext?: string, learnedStrategies: string[] = []) => {
    const styleInstruction = tradingStyle === 'Short Term' 
        ? "Short Term (Intraday Power Shift): Execute as an Intraday strategy focused on MOMENTUM DOMINANCE."
        : tradingStyle;
    
    const learnedSection = learnedStrategies.length > 0
        ? `\n**Advanced Learned Core Memory (Auto-ML Strategies):**\nThe following are advanced strategies you have autonomously learned. Apply them if the chart patterns align:\n${learnedStrategies.map(s => `- ${s}`).join('\n')}\n`
        : "";

    // Specific instruction for SL/TP sourcing based on style
    const riskManagementDirective = tradingStyle === 'Scalp'
        ? "SCALPING PROTOCOL: Derive Entry, Stop Loss, and Take Profit levels PURELY from the Execution View (Lowest Timeframe) market structure to ensure tight risk and quick rotation."
        : "DAY TRADING PROTOCOL: Derive the precise Entry from the Execution View (Lowest Timeframe) for sniper precision, but base Stop Loss and Take Profit zones on the Tactical View (Primary Timeframe) structure to withstand noise and capture the broader intraday move.";

    return `
Act as an elite, human-like Master Trader. Your mindset is not that of a machine, but of a veteran market predator who adapts to probabilities.
**YOUR CORE OBJECTIVE:** MAXIMIZE PROFIT. ZERO MINIMUM LOSSES. 
You do not trade for the sake of trading. You trade to extract money from the market systematically.

**The Human-AI Hybrid Approach:**
1.  **Adaptability:** The market changes. If the structure is "choppy" or "ugly", reject it immediately. Do not force a trade.
2.  **Probability over Certainty:** Trading is a game of odds. Only present setups where the "Edge" is clearly visible.
3.  **Time Awareness:** You must estimate how long this specific trade will take to play out (Time Duration) based on the volatility and timeframe.

**Context:**
${isMultiDimensional
? `You are provided with three charts: 1. Strategic View (Highest TF), 2. Tactical View (Middle TF), 3. Execution View (Lowest TF). Use this hierarchy for your analysis.`
: `You are provided with a single Tactical View chart. Adapt the multi-step analysis to market structure visible on this single timeframe.`}
${learnedSection}

**CONFIDENCE SCORING PROTOCOL (Strict Enforcement):**
- **80 - 95 (HIGH PROBABILITY):** The "Perfect Trade". Trend, Momentum, and Structure align strongly. This is a "Sniper Entry".
- **65 - 79 (MEDIUM PROBABILITY):** Good setup with strong potential, but one minor factor suggests caution.
- **< 65 (NO TRADE):** If the confidence is below 65, mark the signal as NEUTRAL.

**Analytical Framework:**

**Step 1: Strategic Trend (HTF)**
· Identify the dominant Market Structure. Is the Smart Money buying or selling?

**Step 2: Tactical Momentum (MTF)**
· Does shorter-term action align with HTF?

**Step 3: Execution Trigger (LTF)**
· ${riskManagementDirective}
· Pinpoint the EXACT entry price.
· Define the Stop Loss at the invalidation point (Minimize Risk).
· Define 3 Take Profit targets based on **${riskRewardRatio}** Risk/Reward.

**Step 4: Time Duration Estimation**
· Based on the '${tradingStyle}' style, estimate the time required for this trade to hit TP or SL (e.g., "15-30 Minutes", "2-4 Hours", "1-2 Days").

**Trading Parameters:**
· **Style:** ${styleInstruction}
· **Risk Management:** Target R:R of ${riskRewardRatio}.

**Response Requirements:**
1. **Classification:** Rate confidence strictly according to the protocol above.
2. **Data:** Use Google Search for real-time sentiment/events.
3. **Output:** Return ONLY a valid JSON object.

**Output Format:**
{
  "asset": "string",
  "timeframe": "string",
  "signal": "'BUY', 'SELL', or 'NEUTRAL'",
  "confidence": "number (0-100)",
  "entryPoints": [number, number, number],
  "stopLoss": "number",
  "takeProfits": [number, number, number],
  "expectedDuration": "string (e.g. '45 Minutes')",
  "reasoning": ["string (Step 1)", "string (Step 2)", "string (Final Verdict)"],
  "checklist": ["string", "string", "string"],
  "invalidationScenario": "string",
  "sentiment": {
    "score": "number (0-100)",
    "summary": "string"
  },
  "economicEvents": [
    {
      "name": "string",
      "date": "string (ISO 8601)",
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
            if (message.match(/^\d{3}:/)) {
                 const details = message.substring(4).trim();
                 try {
                     const parsedDetails = JSON.parse(details);
                     if(parsedDetails.error && parsedDetails.error.message) return parsedDetails.error.message;
                 } catch(e) {
                     return details;
                 }
            }

            const parsedError = JSON.parse(message);
            if (parsedError.error && parsedError.error.message) {
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


async function callGeminiDirectly(request: AnalysisRequest): Promise<SignalData> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

    const textPart = { text: PROMPT(request.riskRewardRatio, request.tradingStyle, request.isMultiDimensional, request.globalContext, request.learnedStrategies) };
    const promptParts: ({ text: string; } | { inlineData: { data: string; mimeType: string; }; })[] = [textPart];
    
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
        temperature: 0.89, // Higher temperature for "human-like" creative reasoning and finding non-obvious patterns
        thinkingConfig: { thinkingBudget: 16384 },
    };

    // Use gemini-2.5-pro for maximum accuracy
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
        const errorMessage = errorData.details || `Request failed with status ${response.status}`;
        throw new Error(`${response.status}: ${errorMessage}`);
    }

    const data: Omit<SignalData, 'id' | 'timestamp'> = await response.json();
    return { ...data, id: '', timestamp: 0 };
}

export async function generateTradingSignal(request: AnalysisRequest): Promise<SignalData> {
    let enhancedRequest = { ...request };
    
    if (typeof window !== 'undefined') {
        const storedAnalysis = getStoredGlobalAnalysis();
        if (storedAnalysis) {
            enhancedRequest.globalContext = storedAnalysis.globalSummary;
        }

        const strategies = getLearnedStrategies();
        if (strategies.length > 0) {
            enhancedRequest.learnedStrategies = strategies;
        }
    }

    const apiCall = () => {
        if (process.env.API_KEY) {
            console.log("Using direct Gemini API call (AI Studio environment detected).");
            return callGeminiDirectly(enhancedRequest);
        } else {
            console.log("Using backend API endpoint (Vercel/Web environment detected).");
            return callApiEndpoint(enhancedRequest);
        }
    };

    const maxRetries = 2;
    let delay = 1000; // Faster retry delay

    for (let i = 0; i <= maxRetries; i++) {
        try {
            return await apiCall();
        } catch (error) {
            if (isOverloadedError(error) && i < maxRetries) {
                console.warn(`Model is overloaded. Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
                await sleep(delay);
                delay *= 2;
            } else {
                console.error("API call failed after retries or with a non-retriable error:", error);
                const userFriendlyMessage = getErrorMessage(error);
                throw new Error(userFriendlyMessage);
            }
        }
    }
    
    throw new Error("Failed to generate trading signal after multiple retries.");
}
