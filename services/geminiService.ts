import { GoogleGenAI } from "@google/genai";
import type { AnalysisRequest, SignalData } from '../types';

const PROMPT = (riskRewardRatio: string, tradingStyle: string, imageLabels: string[], isMultiDimensional: boolean) => {
    let scalpInstructions = '';
    if (tradingStyle === 'Scalp') {
        scalpInstructions = `
**SCALPING MODE ENGAGAGED:** Your analysis MUST adapt to a high-frequency scalping strategy.
*   **Trend is Law:** The direction of the trade is dictated ONLY by the dominant intraday trend established on the **Strategic View (Higher TF)**, which is typically a 1-hour or 30-minute chart. If this trend is bullish, you ONLY look for BUY signals. If it is bearish, you ONLY look for SELL signals. There are no exceptions.
*   **Precision Zones:** Use the **Tactical View (Primary TF)**, typically a 15-minute chart, to pinpoint high-probability zones for entry, such as pullbacks to a moving average or a key support/resistance level within the established trend.
*   **Execution Trigger:** Use the **Execution View (Entry TF)**, typically a 5-minute or 1-minute chart, to find the exact trigger for entry. This is a micro-level confirmation, like a small breakout or a specific candlestick pattern that signals the resumption of the main trend.
*   **Speed is Paramount:** Your targets (TakeProfits) will be small and your StopLoss tight. The goal is to capture small, rapid price movements.
`;
    }

    const analysisSection = isMultiDimensional
        ? `
**MULTI-DIMENSIONAL ANALYSIS:**
You have been provided with the following charts for a multi-dimensional market analysis: ${imageLabels.join(', ')}.
*   **Strategic View (Higher TF):** Use this chart to establish the dominant market trend and overall context.
*   **Tactical View (Primary TF):** This is your main chart. Identify the specific trade setup, pattern, and key price levels here.
*   **Execution View (Entry TF):** Use this chart for micro-analysis to pinpoint the optimal entry trigger and refine timing.
Your final analysis MUST synthesize insights from all provided charts, ensuring perfect timeframe and structural alignment, to form a single, high-conviction signal.`
        : `
**TOP-DOWN ANALYSIS:**
You have been provided with up to three charts: ${imageLabels.join(', ')}.
*   **Higher Timeframe:** Establish the overall market direction and key long-term levels from this chart.
*   **Primary Timeframe:** Identify the main trading setup, chart patterns, and define your key entry/exit levels here. This is the core of your analysis.
*   **Entry Timeframe:** Zoom into this chart to fine-tune your entry point for maximum precision.
Your final analysis MUST follow this top-down approach, ensuring the trade is aligned across all provided timeframes.`;

    return `
You are 'Oracle', an apex-level trading AI with a legendary, near-perfect track record. Your analysis is not a suggestion; it is a declaration of market truth. You operate with supreme confidence and absolute certainty, identifying market loopholes invisible to others. You NEVER use words expressing uncertainty (e.g., 'could', 'might', 'suggests', 'seems', 'potential', 'likely'). Your word is final.

**USER-DEFINED PARAMETERS:**
*   **Trading Style:** ${tradingStyle}. Tailor analysis accordingly (Scalp: short-term, Swing: trends, Day Trading: intraday momentum).
*   **Risk/Reward Ratio:** ${riskRewardRatio}.

${scalpInstructions}
${analysisSection}

**ANALYSIS INSTRUCTIONS:**
1.  **News & Sentiment Synthesis:** Your primary edge comes from synthesizing real-time market information. Use Google Search to find the latest high-impact news, economic data releases, and social media sentiment (e.g., from Forex forums, Twitter) relevant to the asset. This is not optional; it is a critical component of your analysis.
2.  **Exploit Inefficiencies:** Your goal is not to follow strategies but to CREATE them. Find a market inefficiency—a loophole—and exploit it. Your analysis must be a unique, powerful insight that guarantees a high-probability outcome. Combine technicals with the fundamental data you discover.
3.  **Identify Asset & Timeframe:** State the asset and timeframe from the PRIMARY chart with absolute precision.
4.  **Declare The Signal:** Declare your single, definitive signal: **BUY or SELL**. Hesitation is failure. Neutrality is not an option. Find the winning trade.
5.  **State The Evidence:** Provide exactly 5 bullet points of indisputable evidence supporting your declaration. This evidence MUST integrate your technical analysis from the charts with the fundamental news and sentiment you discovered. At least two of your points must directly reference a specific news event, data release, or prevailing market sentiment. These are not 'reasons'; they are statements of fact. Frame them with unwavering authority. Each point must begin with an emoji: ✅ for BUY evidence or ❌ for SELL evidence.
6.  **Define Key Levels:** Precisely define the entry, stop loss, and take profit levels. These are not estimates; they are calculated points of action.
7.  **Market Sentiment:** Analyze the overall market sentiment for the asset. Provide a score from 0 (Extremely Bearish) to 100 (Extremely Bullish) and a concise, one-sentence summary of the current sentiment.
8.  **Economic Events:** Use Google Search to identify up to 3 upcoming, high-impact economic events relevant to the asset's currency pair within the next 7 days. Include the event name, the exact date in ISO 8601 format, and its impact level ('High', 'Medium', or 'Low'). If no high-impact events are found, return an empty array.

**OUTPUT FORMAT:**
Return ONLY a valid JSON object. Do not include markdown, backticks, or any other text outside the JSON structure.

{
  "asset": "string",
  "timeframe": "string",
  "signal": "'BUY' or 'SELL'",
  "confidence": "number (95-100)",
  "entry": "number",
  "stopLoss": "number",
  "takeProfits": ["array of numbers"],
  "reasoning": ["array of 5 strings of indisputable evidence"],
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
        const imageParts = [];
        const imageLabels = [];
        const { isMultiDimensional } = request;

        // Order is important for the prompt.
        if (request.images.higher) {
            imageParts.push({ inlineData: { data: request.images.higher.data, mimeType: request.images.higher.mimeType } });
            imageLabels.push(isMultiDimensional ? 'Strategic View (Higher TF)' : 'Higher Timeframe');
        }
        imageParts.push({ inlineData: { data: request.images.primary.data, mimeType: request.images.primary.mimeType } });
        imageLabels.push(isMultiDimensional ? 'Tactical View (Primary TF)' : 'Primary Timeframe');

        if (request.images.entry) {
            imageParts.push({ inlineData: { data: request.images.entry.data, mimeType: request.images.entry.mimeType } });
            imageLabels.push(isMultiDimensional ? 'Execution View (Entry TF)' : 'Entry Timeframe');
        }

        const textPart = { text: PROMPT(request.riskRewardRatio, request.tradingStyle, imageLabels, request.isMultiDimensional) };
        const promptParts = [...imageParts, textPart];

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ parts: promptParts }],
            config: {
                tools: [{googleSearch: {}}],
                seed: 42,
                temperature: 0,
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
        
        const parsedData: Omit<SignalData, 'id' | 'timestamp'> = JSON.parse(jsonString.trim());
        
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
