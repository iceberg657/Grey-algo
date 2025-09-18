const { GoogleGenAI } = require("@google/genai");

// This will run on the server, so process.env.API_KEY is secure.
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    // This log will appear in your Vercel function logs.
    console.error("API_KEY environment variable not set");
    // Throwing an error here will cause the function to fail,
    // which is better than trying to call the API without a key.
    throw new Error("Server configuration error: API_KEY is missing.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const PROMPT = (riskRewardRatio) => `
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


async function callGemini(request) {
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
            seed: 42, // Ensure deterministic output
            temperature: 0.2, // Lower temperature for more focused, less random output
        },
    });

    const responseText = response.text;

    if (!responseText) {
        throw new Error("Received an empty response from the AI.");
    }
    
    // Extract grounding chunks
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const sources = groundingChunks
        ?.map(chunk => chunk.web)
        .filter(web => web && web.uri && web.title) || [];

    try {
        // The model might wrap the JSON in markdown backticks.
        const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
        const jsonString = jsonMatch ? jsonMatch[1] : responseText;
        
        const parsedData = JSON.parse(jsonString.trim());
        
        if (!parsedData.signal || !parsedData.entry || !parsedData.stop_loss || !parsedData.take_profits) {
            throw new Error("AI response is missing required fields.");
        }
        
        // Add sources to the data object if they exist
        if (sources.length > 0) {
            parsedData.sources = sources;
        }

        return parsedData;
    } catch (e) {
        console.error("Failed to parse AI JSON response:", responseText);
        throw new Error("The AI returned an invalid response format.");
    }
}


module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        const analysisRequest = req.body;
        
        if (!analysisRequest || !analysisRequest.image || !analysisRequest.riskRewardRatio) {
           return res.status(400).json({ error: "Invalid request body. Missing 'image' or 'riskRewardRatio'." });
        }

        const signalData = await callGemini(analysisRequest);
        return res.status(200).json(signalData);
    } catch (error) {
        console.error("API Error:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred on the server.";
        return res.status(500).json({ error: "API request failed", details: errorMessage });
    }
};