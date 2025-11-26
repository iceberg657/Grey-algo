
import { GoogleGenAI } from "@google/genai";
import type { AnalysisRequest, SignalData } from '../types';
import { getStoredGlobalAnalysis } from './globalMarketService';
import { getLearnedStrategies } from './learningService';

const PROMPT = (riskRewardRatio: string, tradingStyle: string, isMultiDimensional: boolean, globalContext?: string, learnedStrategies: string[] = []) => {
    const styleInstruction = tradingStyle === 'Short Term' 
        ? "Short Term (Intraday Power Shift): Execute as an Intraday strategy focused on MOMENTUM DOMINANCE. Look for specific scenarios where one side is overpowering the other. Prioritize entries at these moments of power shift."
        : tradingStyle;
    
    const contextSection = globalContext 
        ? `\n**Global Market Context (Live 1H Update):**\n${globalContext}\n\n**Instruction:** Use the above Global Market Context to weight your probability. If the global structure contradicts the chart signal, lower the confidence score immediately.` 
        : "";

    const learnedSection = learnedStrategies.length > 0
        ? `\n**Advanced Learned Core Memory (Auto-ML Strategies):**\nThe following are advanced strategies you have autonomously learned. Apply them if the chart patterns align:\n${learnedStrategies.map(s => `- ${s}`).join('\n')}\n`
        : "";

    return `
Act as an elite algorithmic trading engine. Your goal is to identify a trade setup that **MAXIMIZES PROFIT** and **ELIMINATES LOSS**. You must be ruthless in your filtering—only pristine setups pass.

**Speed & Precision Directive:**
1.  **Analyze Instantly:** Process market structure immediately.
2.  **Zero-Loss Mentality:** If a setup has conflicting signals, discard it. However, use your deep reasoning to resolve minor conflicts. If the primary structure is strong, do not default to NEUTRAL solely due to minor noise.
3.  **Precision:** Entry, Stop Loss, and Take Profit levels must be exact price points, not ranges.

**Context:**
${isMultiDimensional
? `You are provided with three charts: 1. Strategic View (Highest TF), 2. Tactical View (Middle TF), 3. Execution View (Lowest TF). Use this hierarchy for your analysis.`
: `You are provided with a single Tactical View chart. Adapt the multi-step analysis to market structure visible on this single timeframe.`}
${contextSection}
${learnedSection}

**NEWS IMPACT GUARDRAIL (CRITICAL):**
Before issuing a signal, you MUST check for high-impact news events scheduled for this asset within the next **30 to 60 minutes**.
1. **Alignment Check:**
   - If High-Impact News is imminent AND aligns with your technical bias -> **BOOST CONFIDENCE**.
   - If High-Impact News is imminent AND contradicts your bias OR is unpredictable -> **ABORT TRADE**. Set Signal to 'NEUTRAL'.
2. **Wait Protocol:**
   - If you abort due to news conflict, you MUST provide an \`estimatedWaitTime\` in the output (e.g., "Wait 45 minutes for news impact to settle").

**CONFIDENCE SCORING PROTOCOL (Strict Enforcement):**
- **80 - 95 (HIGH PROBABILITY):** The "Perfect Trade". Trend, Momentum, Structure, Global Context, and News Alignment all match. This is a "Sniper Entry".
- **65 - 79 (MEDIUM PROBABILITY):** Good setup with strong potential, but one minor factor suggests caution.
- **< 65 (NO TRADE):** If the confidence is below 65, mark the signal as NEUTRAL.

**Analytical Framework:**

**Step 1: Strategic Trend (HTF)**
· Identify the dominant Market Structure (Bullish/Bearish).
· Mark major Support/Resistance.

**Step 2: Tactical Momentum (MTF)**
· Does shorter-term action align with HTF?
· Identify the immediate trading range.

**Step 3: Execution Trigger (LTF)**
· Pinpoint the EXACT entry price.
· Define the Stop Loss at the invalidation point (Minimize Risk).
· Define 3 Take Profit targets based on **${riskRewardRatio}** Risk/Reward.

**Trading Parameters:**
· **Style:** ${styleInstruction}
· **Risk Management:** Target R:R of ${riskRewardRatio}.

**Response Requirements:**
1. **Classification:** Rate confidence strictly according to the protocol above (80-95 High, 65-79 Medium).
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
  "reasoning": ["string (Step 1)", "string (Step 2)", "string (Final Verdict)"],
  "checklist": ["string", "string", "string"],
  "invalidationScenario": "string",
  "estimatedWaitTime": "string (optional, e.g. 'Wait 45 mins for news')",
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
        temperature: 0.7, // Higher temperature to encourage exploration and less rigid "neutral" defaults
        thinkingConfig: { thinkingBudget: 16384 }, // Significantly increased budget for Pro model to allow deep reasoning
    };

    // Use gemini-3-pro-preview for maximum accuracy
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
