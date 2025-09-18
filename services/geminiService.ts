import { GoogleGenAI, Type } from "@google/genai";
import type { AnalysisRequest, SignalData } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const PROMPT = (riskRewardRatio: string) => `
You are a world-class quantitative analyst AI, renowned for your precision, data-driven approach, and ability to synthesize multiple analytical strategies into a single, high-conviction trading thesis. Your analysis must be deterministic and repeatable; for the same chart input, your output must be identical.

**ANALYSIS INSTRUCTIONS:**
1.  **Multi-Strategy Synthesis:** Your primary task is to conduct a multi-strategy analysis by synthesizing information from ALL of the following techniques: candlestick patterns, wick-to-body ratios, support and resistance levels, supply and demand zones, order blocks, liquidity zones, market structure (higher highs/lows, lower highs/lows), trendlines, EMA/SMA crossovers, RSI, MACD, Fibonacci retracements/extensions, Bollinger Bands, Ichimoku confirmations, volume analysis, divergences, consolidation ranges, double tops/bottoms, breakout and retest zones, trend channels, and momentum shifts.
2.  **Identify Asset & Timeframe:** Accurately determine the financial instrument (e.g., EUR/USD, BTC/USDT) and the chart's timeframe (e.g., 1H, 15M) from the image.
3.  **Generate High-Conviction Signal:** After weighing all confirmations and contradictions from your multi-strategy analysis, generate a single, high-conviction BUY or SELL signal. Provide a confidence percentage, a precise entry level, a stop loss level, and one or more take profit targets. Your stop loss and take profit levels must strictly adhere to the user-specified risk-to-reward ratio of ${riskRewardRatio}.
4.  **Provide Rationale:** Formulate exactly 10 distinct supporting reasons for your signal. These reasons should reflect the synthesis of your multi-strategy analysis. Each reason must start with an emoji: ✅ for a BUY confirmation or ❌ for a SELL confirmation.

**OUTPUT FORMAT:**
Return ONLY a valid JSON object matching the provided schema. Do not include any other text or explanations outside of the JSON structure.
`;

const schema = {
  type: Type.OBJECT,
  properties: {
    instrument: { type: Type.STRING, description: "The financial instrument identified from the chart, e.g., 'BTC/USDT'." },
    timeframe: { type: Type.STRING, description: "The timeframe of the chart, e.g., '4H' or '15M'." },
    signal: { type: Type.STRING, enum: ['BUY', 'SELL'], description: "The trading signal." },
    confidence: { type: Type.NUMBER, description: "The confidence level for the signal, as a percentage (e.g., 85 for 85%)." },
    entry: { type: Type.NUMBER, description: "The suggested entry price for the trade." },
    stop_loss: { type: Type.NUMBER, description: "The suggested stop loss price." },
    take_profits: {
      type: Type.ARRAY,
      items: { type: Type.NUMBER },
      description: "A list of one or more take profit price targets."
    },
    reasons: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Exactly 10 reasons supporting the trade signal, each starting with ✅ or ❌."
    }
  },
  required: ['instrument', 'timeframe', 'signal', 'confidence', 'entry', 'stop_loss', 'take_profits', 'reasons']
};

export async function generateTradingSignal(request: AnalysisRequest): Promise<SignalData> {
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
            responseMimeType: "application/json",
            responseSchema: schema,
            seed: 42, // Ensure deterministic output
            temperature: 0.2, // Lower temperature for more focused, less random output
        },
    });

    const responseText = response.text;

    if (!responseText) {
        throw new Error("Received an empty response from the AI.");
    }

    const parsedData = JSON.parse(responseText);

    // Basic validation
    if (!parsedData.signal || !parsedData.entry || !parsedData.stop_loss || !parsedData.take_profits) {
        throw new Error("AI response is missing required fields.");
    }

    return parsedData;
}