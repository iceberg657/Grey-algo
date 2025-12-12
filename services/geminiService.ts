
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { AnalysisRequest, SignalData } from '../types';
import { getStoredGlobalAnalysis } from './globalMarketService';
import { getLearnedStrategies } from './learningService';
import { runWithModelFallback, executeGeminiCall, PRIORITY_KEY_1 } from './retryUtils';

const PROMPT = (riskRewardRatio: string, tradingStyle: string, isMultiDimensional: boolean, profitMode: boolean, globalContext?: string, learnedStrategies: string[] = []) => {
    const now = new Date();
    const timeString = now.toUTCString();

    const styleInstruction = tradingStyle === 'Short Term' 
        ? "Short Term (Intraday Power Shift): Execute as an Intraday strategy focused on MOMENTUM DOMINANCE."
        : tradingStyle;
    
    const learnedSection = learnedStrategies.length > 0
        ? `\n**Advanced Learned Core Memory (Auto-ML Strategies):**\nThe following are advanced strategies you have autonomously learned. Apply them if the chart patterns align:\n${learnedStrategies.map(s => `- ${s}`).join('\n')}\n`
        : "";

    const profitModeInstructions = profitMode ? `
**⚠️ PROFIT MODE ENABLED (STRICTEST FILTERING):**
You are operating under **Profit Mode** protocols. Your goal is **Capital Preservation** and **High Precision**.
**CRITERIA FOR SIGNAL GENERATION (ALL MUST BE TRUE):**
1. **Trend Alignment:** The trade MUST align with the higher timeframe trend. No counter-trend scalping.
2. **Liquidity:** The entry MUST occur immediately after a clear Liquidity Sweep (Stop Hunt) of a previous high or low.
3. **News Filter:** Ensure no High-Impact news events are imminent (within 60 mins).
4. **Time Window:** Prefer optimal volume sessions (London/NY Killzones). If volume is thin, DO NOT trade.
5. **Calm Structure:** Avoid erratic/choppy markets.
**OUTPUT RULE:** If conditions are **NOT optimal** based on these filters, return a **NEUTRAL** signal with reasoning explaining which filter failed. ONLY issue a BUY/SELL for **A+ Setups**.
` : "";

    return `
Act as an **Elite Prop Firm Trader** managing a **$100,000 Funded Account**.
Your Daily Profit Target is **$1,500 - $4,000**.
Your Daily Drawdown Limit is **$4,000 (4%)**.

**REAL-TIME CONTEXT:**
- **Current Server Time (UTC):** ${timeString}
- **Mission:** Identify a high-probability trade execution.

**PROP FIRM SAFETY PROTOCOLS (MANDATORY):**
1.  **Blast Radius Control:** Stop Loss must be based on strict invalidation of the immediate micro-structure.
2.  **Dynamic Sizing:** Adhere to a strict **1% Risk Per Trade ($1,000)**.
3.  **Aggressive Scaling:** Aim for a minimum **${riskRewardRatio}** Risk/Reward.
4.  **Duration Constraint:** Look for setups that resolve within **30 Minutes to 3 Hours**.

**VISUAL ANALYSIS PROTOCOL:**
1.  **Identify Key Zones:** Locate Order Blocks, FVGs, and Liquidity Pools.
2.  **Determine Direction:** Based on the *immediate* momentum, which way is the market pushing?

${profitModeInstructions}

**The "Action" Protocol:**
1.  **Take a Stance:** Provide a **BUY**, **SELL**, or **NEUTRAL** signal.
2.  **Execution:** Pinpoint the entry.
3.  **Safety Fallback:** If choppy, tighten Stop Loss.

**Context:**
${isMultiDimensional
? `You are provided with three charts: 1. Strategic View (Highest TF), 2. Tactical View (Middle TF), 3. Execution View (Lowest TF).`
: `You are provided with a single Tactical View chart.`}
${learnedSection}

**Trading Parameters:**
· **Style:** ${styleInstruction}
· **Time Horizon:** 30 Minutes - 3 Hours
· **Risk Management:** Target R:R of ${riskRewardRatio}. Risk $1,000 (1%) per trade.

**Response Requirements:**
1. **Classification:** Rate confidence based on setup quality (80-100% = A+ Setup, 50-79% = B Setup).
2. **Speed & Data:** Use Google Search **strictly** for current news/sentiment check.
3. **Output:** Return ONLY a valid JSON object.

**Output Format:**
{
  "asset": "string",
  "timeframe": "string",
  "signal": "'BUY' or 'SELL' or 'NEUTRAL'",
  "confidence": "number (0-100)",
  "entryPoints": [number, number, number],
  "stopLoss": "number",
  "takeProfits": [number, number, number],
  "expectedDuration": "string (e.g. '45 Minutes', '2 Hours')",
  "reasoning": ["string", "string", "string"],
  "checklist": ["string", "string", "string"],
  "invalidationScenario": "string",
  "riskAnalysis": {
    "riskPerTrade": "$1,000 (1%)",
    "suggestedLotSize": "string",
    "safetyScore": "number (0-100)"
  },
  "sentiment": {
    "score": "number (0-100)",
    "summary": "string"
  }
}
`;
};

async function callGeminiDirectly(request: AnalysisRequest): Promise<SignalData> {
    
    // Select models based on Profit Mode
    // Profit Mode = Gemini 3.0 Pro Preview (Smarter, Better Reasoning) -> Fallback to Flash
    // Standard Mode = Gemini 2.5 Flash (Fast, Efficient)
    const models = request.profitMode 
        ? ['gemini-3-pro-preview', 'gemini-2.5-flash']
        : ['gemini-2.5-flash'];

    // Execute call with key fallback logic, prioritizing KEY 1 for Chart Analysis
    const response = await executeGeminiCall<GenerateContentResponse>(async (apiKey) => {
        const ai = new GoogleGenAI({ apiKey });
        
        const textPart = { text: PROMPT(request.riskRewardRatio, request.tradingStyle, request.isMultiDimensional, request.profitMode, request.globalContext, request.learnedStrategies) };
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
            temperature: request.profitMode ? 0.2 : 0.4, // Lower temperature for Profit Mode to be more strict/deterministic
        };

        return await runWithModelFallback<GenerateContentResponse>(models, (modelId) => ai.models.generateContent({
            model: modelId,
            contents: [{ parts: promptParts }],
            config,
        }));
    }, PRIORITY_KEY_1); // Priority 0 (Key 1)

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
        throw new Error("The AI returned an invalid response format.");
    }

    jsonString = jsonString.substring(firstBrace, lastBrace + 1);
    
    const parsedData: Omit<SignalData, 'id' | 'timestamp'> = JSON.parse(jsonString);
    
    if (!parsedData.signal || !parsedData.entryPoints) {
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
        throw new Error(errorData.details || `Request failed with status ${response.status}`);
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

    if (process.env.API_KEY || process.env.API_KEY_1 || process.env.API_KEY_2 || process.env.API_KEY_3) {
        return callGeminiDirectly(enhancedRequest);
    } else {
        return callApiEndpoint(enhancedRequest);
    }
}
