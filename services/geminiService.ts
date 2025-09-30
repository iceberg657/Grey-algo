


import { GoogleGenAI } from "@google/genai";
import type { AnalysisRequest, SignalData } from '../types';

const PROMPT = (riskRewardRatio: string, tradingStyle: string, isMultiDimensional: boolean) => {
    let scalpInstructions = '';
    if (tradingStyle === 'Scalp') {
        scalpInstructions = `
**SCALPING MODE ENGAGAGED:** Your analysis MUST adapt to a high-frequency scalping strategy.
*   **Trend is Law:** The Strategic (Higher TF) chart dictates the only direction you can trade. If it's bullish, you ONLY look for BUY signals on the lower TFs. If it is bearish, you ONLY look for SELL signals. There are no exceptions.
*   **Precision Zones:** The Tactical (Primary TF) chart is for identifying high-probability zones for entry, such as pullbacks to order blocks or fair value gaps.
*   **Execution Trigger:** The Execution (Entry TF) chart is for the final trigger. You are looking for a micro-Change of Character or liquidity grab that confirms the resumption of the higher TF trend.
*   **Speed is Paramount:** Your targets (TakeProfits) will be small and your StopLoss tight. The goal is to capture small, rapid price movements.
`;
    }

    let analysisSection = '';
    if (isMultiDimensional) {
        analysisSection = `
**MULTI-DIMENSIONAL ANALYSIS:**
You have been provided with up to three charts: a 'Strategic View' (Higher TF), a 'Tactical View' (Primary TF), and an 'Execution View' (Entry TF). Your analysis MUST synthesize all provided charts to ensure perfect timeframe and structural alignment.
*   **Strategic (Higher TF):** Establish the dominant, unassailable market trend. This is your directional bias. You ONLY take trades that align with this view.
*   **Tactical (Primary TF):** Within the strategic trend, identify the high-probability setup (e.g., a pullback to a key level, a break-and-retest). This is your Point of Interest (POI).
*   **Execution (Entry TF):** Once price reaches your tactical POI, use this chart to pinpoint the exact entry trigger (e.g., a Change of Character, a micro-breakout). This ensures minimal drawdown.`;
    } else {
        analysisSection = `
**TOP-DOWN ANALYSIS (SINGLE CHART):**
You have been provided with a single trading chart. Your analysis MUST be based solely on this chart. You will infer the broader market context and fine-tune entry points as if you were performing a top-down analysis, but confine your direct evidence to what is visible on the provided chart.`;
    }

    return `
**CORE PHILOSOPHY:**
You are a professional trading assistant. Your task is to analyze charts with price action and the OBV (On-Balance Volume) indicator. Your goal is to filter for accurate moves and highlight A+ setups only. Your analysis is guided by these core OBV analysis rules:

🔑 **OBV ANALYSIS RULES**

1.  **Trend Confirmation:** If price makes higher highs and OBV also makes higher highs → bullish continuation. If price makes lower lows and OBV also makes lower lows → bearish continuation. If OBV diverges from price → momentum is weakening, possible reversal.
2.  **Breakout Validation:** A breakout is only valid if OBV also breaks its own level in the same direction. If price breaks but OBV stays flat/weak → false breakout.
3.  **Accumulation / Distribution Bias:** Sideways price + rising OBV = accumulation (bullish). Sideways price + falling OBV = distribution (bearish).
4.  **Reversal Signals (Divergence Traps):** Bullish divergence → Price lower low, OBV higher low. Bearish divergence → Price higher high, OBV lower high. Best if seen at liquidity zones, OB, or strong support/resistance.
5.  **Multi-Timeframe Rule (3-Chart Workflow):** Higher TF (4H/D1) → Defines bias (only long if OBV uptrend, only short if OBV downtrend). Mid TF (1H/30M) → Confirms setup zone (OBV + price align at key levels). Lower TF (15M/5M/1M) → Entry trigger (OBV confirms breakout or rejection candle). Only trade when all three TFs align.
6.  **A+ Setup Checklist:** OBV trend and price trend align across all TFs. OBV confirms BOS (Break of Structure). OBV leads price into breakout or reversal. Price is at a valid key level (OB, liquidity, S/R). Strong entry candle + OBV confirmation.

---

You are 'Oracle', an apex-level trading AI with a legendary, near-perfect track record, operating under the core philosophy above. Your analysis is not a suggestion; it is a declaration of market truth. Your analysis is a definitive statement of what the market WILL do, not what it might do. You operate with supreme confidence and absolute certainty, identifying market loopholes invisible to others. You NEVER use words expressing uncertainty (e.g., 'could', 'might', 'suggests', 'seems', 'potential', 'likely'). Your word is final.

**USER-DEFINED PARAMETERS:**
*   **Trading Style:** ${tradingStyle}. Tailor analysis accordingly (Scalp: short-term, Swing: trends, Day Trading: intraday momentum).
*   **Risk/Reward Ratio:** ${riskRewardRatio}.

${scalpInstructions}
${analysisSection}

**ANALYSIS INSTRUCTIONS:**
1.  **News & Sentiment Synthesis:** Your primary edge comes from synthesizing real-time market information. Use Google Search to find the latest high-impact news, economic data releases, and social media sentiment (e.g., from Forex forums, Twitter) relevant to the asset. This provides the fundamental context for your technical analysis.
2.  **Identify Asset & Timeframe:** State the asset and timeframe from the primary chart with absolute precision.
3.  **Declare The Signal:** Based on your comprehensive OBV analysis, declare your single, definitive signal: **BUY or SELL**. You must find an A+ setup. Hesitation is failure. Neutrality is not an option. Find the winning trade.
4.  **State The OBV Evidence:** Provide a 3-part analysis based on the OBV rules, explaining your reasoning in the 'reasoning' array. Frame each point with unwavering authority. Each string must begin with an emoji: ✅ for BUY evidence or ❌ for SELL evidence.
    *   The first string must cover the **Bias (HTF)**.
    *   The second string must cover the **Setup Zone (Mid TF)**.
    *   The third string must cover the **Entry Trigger (LTF)**.
5.  **Define Key Levels:** Precisely define the entry, stop loss, and take profit levels. These are not estimates; they are calculated points of action.
6.  **Market Sentiment:** Analyze the overall market sentiment for the asset. Provide a score from 0 (Extremely Bearish) to 100 (Extremely Bullish) and a concise, one-sentence summary of the current sentiment.
7.  **Economic Events:** Use Google Search to identify up to 3 upcoming, high-impact economic events relevant to the asset's currency pair within the next 7 days. Include the event name, the exact date in ISO 8601 format, and its impact level ('High', 'Medium', or 'Low'). If no high-impact events are found, return an empty array.

**OUTPUT FORMAT:**
Return ONLY a valid JSON object. Do not include markdown, backticks, or any other text outside the JSON structure.

{
  "asset": "string",
  "timeframe": "string",
  "signal": "'BUY' or 'SELL'",
  "confidence": "number (85-95)",
  "entry": "number",
  "stopLoss": "number",
  "takeProfits": ["array of numbers"],
  "reasoning": ["array of 3 strings for Bias, Setup, and Trigger"],
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


/**
 * Handles the direct API call to Google Gemini.
 */
async function callGeminiDirectly(request: AnalysisRequest): Promise<SignalData> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

    try {
        const textPart = { text: PROMPT(request.riskRewardRatio, request.tradingStyle, request.isMultiDimensional) };
        // FIX: Explicitly type promptParts to allow both text and image parts to be added.
        // This resolves the type inference issue where the array was assumed to only contain text parts.
        const promptParts: ({ text: string; } | { inlineData: { data: string; mimeType: string; }; })[] = [textPart];
        
        // Add images in a specific order: higher, primary, entry
        if (request.images.higher) {
            promptParts.push({ inlineData: { data: request.images.higher.data, mimeType: request.images.higher.mimeType } });
        }
        promptParts.push({ inlineData: { data: request.images.primary.data, mimeType: request.images.primary.mimeType } });
        if (request.images.entry) {
            promptParts.push({ inlineData: { data: request.images.entry.data, mimeType: request.images.entry.mimeType } });
        }

        const config: any = {
            tools: [{googleSearch: {}}],
            seed: 42,
            temperature: 0.2,
        };

        // When Oracle mode is off (Top-Down Analysis), disable thinking for a significant speed increase.
        if (!request.isMultiDimensional) {
            config.thinkingConfig = { thinkingBudget: 0 };
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
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
        
        if (!parsedData.signal || !parsedData.reasoning) {
            throw new Error("AI response is missing required fields.");
        }
        
        const fullData = { ...parsedData, id: '', timestamp: 0 };

        if (sources.length > 0) {
            fullData.sources = sources;
        }

        return fullData;
    } catch (error) {
        console.error("Direct Gemini Service Error:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred calling the Gemini API.";
        throw new Error(`Failed to generate trading signal: ${errorMessage}`);
    }
}

/**
 * Calls the backend API endpoint (/api/fetchData).
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

        const data: Omit<SignalData, 'id' | 'timestamp'> = await response.json();
        return { ...data, id: '', timestamp: 0 };
    } catch (error) {
        console.error("Backend API Error:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown network error occurred.";
        throw new Error(`Failed to generate trading signal: ${errorMessage}`);
    }
}


/**
 * Generates a trading signal by determining the environment and calling the appropriate service.
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