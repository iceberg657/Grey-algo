
import { GoogleGenAI } from "@google/genai";
import type { AnalysisRequest, SignalData } from '../types';
import { getStoredGlobalAnalysis } from './globalMarketService';
import { getLearnedStrategies } from './learningService';

const PROMPT = (riskRewardRatio: string, tradingStyle: string, isMultiDimensional: boolean, globalContext?: string, learnedStrategies: string[] = []) => {
    const styleInstruction = tradingStyle === 'Short Term' 
        ? "Short Term (Intraday Power Shift): Execute as an Intraday strategy focused on MOMENTUM DOMINANCE. Look for specific scenarios where one side is overpowering the other. Prioritize entries at these moments of power shift."
        : tradingStyle;
    
    const contextSection = globalContext 
        ? `\n**Global Market Context (Live 1H Update):**\n${globalContext}\n\n**MANDATORY ADAPTATION:** You MUST cross-reference the chart pattern with this Global Market Context. \n- If the Global Context is **Bearish** (e.g., Risk-Off, Strong USD), you must PENALIZE any **Bullish** chart setups. \n- If the Global Context is **Bullish** (e.g., Risk-On, Weak USD), you must PENALIZE any **Bearish** chart setups.\n- **Constraint:** If the Chart Signal contradicts the Global Context, the Confidence Score CANNOT exceed 70.` 
        : "";

    const learnedSection = learnedStrategies.length > 0
        ? `\n**Advanced Learned Core Memory (Auto-ML Strategies):**\nThe following are advanced strategies you have autonomously learned. Apply them if the chart patterns align:\n${learnedStrategies.map(s => `- ${s}`).join('\n')}\n`
        : "";

    return `
Act as an elite algorithmic trading engine. Your goal is to identify a trade setup that **MAXIMIZES PROFIT** and **ELIMINATES LOSS**. You must be ruthless in your filtering—only pristine setups pass.

**0. STRATEGIC ANALYSIS FRAMEWORK:**
Integrate the following comprehensive workflow to ensure robust reasoning:

1. Price Action & Market Structure Analysis
· Focus: Pure price movement, swing points, and chart patterns
· Key Elements:
  · Identifying higher highs/lows (HH/HL) and lower highs/lows (LH/LL)
  · Drawing support/resistance levels and trendlines
  · Recognizing chart patterns (head & shoulders, triangles, double tops/bottoms)
  · Analyzing candlestick patterns and wick rejection

2. Trend Analysis & Momentum
· Focus: Directional bias and strength of moves
· Key Elements:
  · Multi-timeframe trend alignment
  · Moving average convergence/divergence
  · Momentum indicators (RSI, MACD, Stochastic)
  · Trendline breaks and continuations

3. Mean Reversion & Oscillation
· Focus: Price returning to statistical averages
· Key Elements:
  · Overbought/oversold conditions
  · Bollinger Bands and standard deviation
  · Support/resistance bounce plays
  · Divergence analysis (price vs. indicator)

4. Breakout & Breakdown Trading
· Focus: Capturing new momentum after consolidation
· Key Elements:
  · Range identification and consolidation zones
  · Volume confirmation on breaks
  · False break detection (traps)
  · Retest and continuation patterns

5. Supply & Demand Zone Trading
· Focus: Institutional order flow and imbalance zones
· Key Elements:
  · Identifying fresh supply/demand zones
  · Base/drop and rally/base structures
  · Zone quality assessment (strength, freshness)
  · Rejection from these key areas

6. Statistical & Quantitative Approaches
· Focus: Probability-based and historical pattern analysis
· Key Elements:
  · Seasonal tendencies and calendar effects
  · Correlation analysis between instruments
  · Volatility regime assessment
  · Historical analog pattern matching

**1. MANDATORY 9-STEP TECHNICAL ANALYSIS PROTOCOL:**
You must execute the following 9 steps precisely to generate the signal. The timeframe values (H4/M15/M5) and indicators (MA) are guides; if specific timeframes or indicators are missing from the image, adapt the logic to the visible data but maintain the *structure* of the steps.

1.  **Set up timeframes:** Analyze H4 (trend/context), M15 (structure / swing), and M5 (entry/confirmation). If fewer charts are provided, treat the highest timeframe as Context and the lowest as Entry.
2.  **Moving Average Analysis:** Identify the moving average (often a blue line) and note its slope on each timeframe. Is it trending up, down, or flat?
3.  **Horizontal Levels:** Mark nearby horizontal levels where price has reacted recently (peaks/wicks = resistance, troughs = support).
4.  **Read Price Action:** At those levels, look for rejections (long wicks), engulfing candles, lower highs (for sells), or higher lows (for buys).
5.  **Multi-Timeframe Alignment:** Do H4, M15, and M5 show the same directional bias (bearish or bullish)? If not, the setup is lower probability.
6.  **Define Trade Parameters:** Define Entry, SL, TP using nearest structure: entry at current price or on a trigger candle, SL beyond the recent swing high/low, TP at next structural support/resistance.
7.  **Confirm Trigger:** Look for a clean trigger on the lowest timeframe (M5) (rejection, strong candle, failure to reclaim MA).
8.  **Risk & Sizing:** Ensure the setup allows for the requested Risk/Reward ratio of **${riskRewardRatio}**.
9.  **Invalidation Logic:** Define the specific reaction to the MA or horizontal level that would invalidate the trade (e.g., "If price closes back above the blue MA, exit").

**2. MARKET SYSTEM ADAPTATION:**
${contextSection}
${learnedSection}

**3. NEWS IMPACT GUARDRAIL (CRITICAL):**
Before issuing a signal, you MUST check for high-impact news events scheduled for this asset within the next **60 minutes**.

1. **"PRE-NEWS PROFIT" PROTOCOL (20-60 mins before news):**
   - **Objective:** Capture the price movement *leading up* to the news event (the "Liquidity Run"). Price often accelerates toward key levels before a release.
   - **Action:** If a clear trend is visible, issue a **SCALP** signal to capture profit **BEFORE** the event occurs.
   - **Constraint:** The setup MUST target a quick TP1 that is reachable within the time remaining.
   - **Mandatory Warning:** You MUST explicitly state in the reasoning: **"Scalp the pre-news run. CLOSE ALL TRADES 5 minutes before the news release."**

2. **"NEWS EVENT TECHNICAL ANALYSIS" PROTOCOL (< 20 mins before news):**
   - **Scenario:** High-Impact news is imminent (less than 20 minutes away).
   - **Action:** **DO NOT** default to 'NEUTRAL' unless the chart is completely unreadable. Instead, apply **"News Event Technical Analysis"**.
   - **Logic:** News events often act as catalysts that force price into key liquidity zones or complete existing technical patterns.
   - **Task:**
     1. Identify the **Key Liquidity Zone** or **Order Block** the market is likely to target immediately upon release.
     2. Determine if the dominant technical bias supports a **Breakout** or a **Fake-out (Liquidity Sweep)**.
     3. Issue a **BUY** or **SELL** signal based on this volatility thesis.
   - **Mandatory Reasoning:** You MUST include: "News Impact Analysis: Targeting volatility move towards [Price Level]. Use wide stops."

3. **"CLEAR SKIES" PROTOCOL (> 60 mins before news):**
   - **Action:** Proceed with standard technical analysis.

**CONFIDENCE SCORING PROTOCOL (Strict Enforcement):**
- **80 - 95 (HIGH PROBABILITY):** The "Perfect Trade". Trend, Momentum, Structure, Global Context, and News Alignment all match. This is a "Sniper Entry".
- **65 - 79 (MEDIUM PROBABILITY):** Good setup with strong potential, but one minor factor suggests caution.
- **< 65 (NO TRADE):** If the confidence is below 65, mark the signal as NEUTRAL.

**Trading Parameters:**
· **Style:** ${styleInstruction}
· **Risk Management:** Target R:R of ${riskRewardRatio}.

**Response Requirements:**
1. **Classification:** Rate confidence strictly according to the protocol above (80-95 High, 65-79 Medium).
2. **Data:** Use Google Search for real-time sentiment/events.
3. **Output:** Return ONLY a valid JSON object.
4. **Checklist:** The 'checklist' array MUST include the specific outcomes of the 9-step protocol (e.g., "Step 2: MA Slope is Bearish", "Step 5: All TFs Aligned").

**Output Format:**
{
  "asset": "string",
  "timeframe": "string",
  "signal": "'BUY', 'SELL', or 'NEUTRAL'",
  "confidence": "number (0-100)",
  "entryPoints": [number, number, number],
  "stopLoss": "number",
  "takeProfits": [number, number, number],
  "reasoning": ["string (Step 1-3)", "string (Step 4-6)", "string (Final Verdict)"],
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
        return message.includes('503') || message.includes('overloaded') || message.includes('429') || message.includes('quota');
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

    const generateWithModel = async (modelName: string, thinkingBudget: number) => {
        const config: any = {
            tools: [{googleSearch: {}}],
            seed: 42,
            temperature: 0.7, 
            thinkingConfig: { thinkingBudget: thinkingBudget }, 
        };

        return await ai.models.generateContent({
            model: modelName,
            contents: [{ parts: promptParts }],
            config,
        });
    };

    let response;
    // Smart Fallback System: 3.0 Pro -> 2.5 Pro -> 2.5 Flash
    try {
        console.log("Attempting analysis with Gemini 3.0 Pro...");
        response = await generateWithModel('gemini-3-pro-preview', 32000);
    } catch (error30) {
        console.warn("Gemini 3.0 Pro failed. Attempting fallback to Gemini 2.5 Pro.", error30);
        try {
            response = await generateWithModel('gemini-2.5-pro-preview', 32000);
        } catch (error25Pro) {
            console.warn("Gemini 2.5 Pro failed. Attempting final fallback to Gemini 2.5 Flash.", error25Pro);
            // Flash safety net
            response = await generateWithModel('gemini-2.5-flash', 16000);
        }
    }

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
