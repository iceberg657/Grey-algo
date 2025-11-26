
const { GoogleGenAI } = require("@google/genai");

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    console.error("API_KEY environment variable not set");
    throw new Error("Server configuration error: API_KEY is missing.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const PROMPT = (riskRewardRatio, tradingStyle, isMultiDimensional, globalContext, learnedStrategies = []) => {
    const styleInstruction = tradingStyle === 'Short Term' 
        ? "Short Term (Intraday Power Shift): Execute as an Intraday strategy focused on MOMENTUM DOMINANCE. Look for specific scenarios where one side is overpowering the other. Prioritize entries at these moments of power shift."
        : tradingStyle;

    const contextSection = globalContext 
        ? `\n**Global Market Context:**\n${globalContext}\n\n**Instruction:** Use the above Global Market Context to weight your probability. If the global structure contradicts the chart signal, lower the confidence score immediately.` 
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
Before issuing a signal, you MUST check for high-impact news events scheduled for this asset within the next **60 minutes**.

1. **"PRE-NEWS PROFIT" PROTOCOL (20-60 mins before news):**
   - **Objective:** Capture the price movement *leading up* to the news event (the "Liquidity Run"). Price often accelerates toward key levels before a release.
   - **Action:** If a clear trend is visible, issue a **SCALP** signal to capture profit **BEFORE** the event occurs.
   - **Constraint:** The setup MUST target a quick TP1 that is reachable within the time remaining.
   - **Mandatory Warning:** You MUST explicitly state in the reasoning: **"Scalp the pre-news run. CLOSE ALL TRADES 5 minutes before the news release."**

2. **"IMMINENT DANGER" PROTOCOL (< 20 mins before news):**
   - **Scenario:** High-Impact news is less than 20 minutes away.
   - **Action:** Volatility is too unpredictable. Abort trade. Set Signal to 'NEUTRAL'.
   - **Output:** Provide \`estimatedWaitTime\` (e.g., "Wait 30 minutes for news impact to settle").

3. **"CLEAR SKIES" PROTOCOL (> 60 mins before news):**
   - **Action:** Proceed with standard technical analysis.

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
      "date": "string (ISO 8601 format)",
      "impact": "'High', 'Medium', or 'Low'"
    }
  ]
}
`;
};


async function callGemini(request) {
    const textPart = { text: PROMPT(request.riskRewardRatio, request.tradingStyle, request.isMultiDimensional, request.globalContext, request.learnedStrategies) };
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
        temperature: 0.7, // Higher temp to allow for diverse thinking
        thinkingConfig: { thinkingBudget: 16384 }, // Enable high-capacity reasoning with 3.0 Pro
    };

    // Use gemini-3-pro-preview for maximum accuracy
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
