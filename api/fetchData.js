
const { GoogleGenAI } = require("@google/genai");

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    console.error("API_KEY environment variable not set");
    throw new Error("Server configuration error: API_KEY is missing.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const PROMPT = (riskRewardRatio, tradingStyle, isMultiDimensional) => {
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


async function callGemini(request) {
    const textPart = { text: PROMPT(request.riskRewardRatio, request.tradingStyle, request.isMultiDimensional) };
    const promptParts = [textPart];

    if (request.isMultiDimensional && request.images.higher) {
        promptParts.push({ inlineData: { data: request.images.higher.data, mimeType: request.images.higher.mimeType } });
    }
    promptParts.push({ inlineData: { data: request.images.primary.data, mimeType: request.images.primary.mimeType } });
    if (request.isMultiDimensional && request.images.entry) {
        promptParts.push({ inlineData: { data: request.images.entry.data, mimeType: request.images.entry.mimeType } });
    }

    const config = {
        tools: [{googleSearch: {}}],
        seed: 42,
        temperature: 0.4, // Increased to allow for more variability
    };

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: [{ parts: promptParts }],
        config: config,
    });

    const responseText = response.text;
    if (!responseText) {
        throw new Error("Received an empty response from the AI.");
    }
    
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const sources = groundingChunks
        ?.map(chunk => chunk.web)
        .filter(web => web && web.uri && web.title) || [];

    try {
        let jsonString = responseText.trim();
        const firstBrace = jsonString.indexOf('{');
        const lastBrace = jsonString.lastIndexOf('}');

        if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
            throw new Error("Could not find a valid JSON object in the AI response.");
        }
        
        jsonString = jsonString.substring(firstBrace, lastBrace + 1);
        
        const parsedData = JSON.parse(jsonString);
        
        if (!parsedData.signal || !parsedData.reasoning || !parsedData.entryPoints) {
            throw new Error("AI response is missing required fields.");
        }
        
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
        
        if (!analysisRequest || !analysisRequest.images || !analysisRequest.riskRewardRatio || !analysisRequest.tradingStyle || typeof analysisRequest.isMultiDimensional === 'undefined') {
           return res.status(400).json({ error: "Invalid request body." });
        }

        const signalData = await callGemini(analysisRequest);
        return res.status(200).json(signalData);
    } catch (error) {
        console.error("API Error:", error);
        
        let statusCode = 500;
        let errorMessage = "An unknown error occurred on the server.";

        if (error instanceof Error) {
            const message = error.message;
            if (message.includes('503') || message.toLowerCase().includes('overloaded')) {
                statusCode = 503;
                errorMessage = "The model is currently overloaded. Please try again in a moment.";
            } else {
                 try {
                    const parsedError = JSON.parse(message);
                    if (parsedError.error && parsedError.error.message) {
                        errorMessage = parsedError.error.message;
                    } else {
                        errorMessage = message;
                    }
                } catch (e) {
                    errorMessage = message;
                }
            }
        }
        
        return res.status(statusCode).json({ error: "API request failed", details: errorMessage });
    }
};
