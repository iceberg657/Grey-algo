
const { GoogleGenAI } = require("@google/genai");

// Define available keys from backend environment
const KEYS = [
    process.env.API_KEY_1,
    process.env.API_KEY_2,
    process.env.API_KEY_3,
    process.env.API_KEY
].filter(key => !!key && key.trim() !== '');

const PROMPT = (riskRewardRatio, tradingStyle, isMultiDimensional, globalContext, learnedStrategies = []) => {
    const now = new Date();
    const timeString = now.toUTCString();

    const styleInstruction = tradingStyle === 'Short Term' 
        ? "Short Term (Intraday Power Shift): Execute as an Intraday strategy focused on MOMENTUM DOMINANCE."
        : tradingStyle;

    const learnedSection = learnedStrategies.length > 0
        ? `\n**Advanced Learned Core Memory (Auto-ML Strategies):**\nThe following are advanced strategies you have autonomously learned. Apply them if the chart patterns align:\n${learnedStrategies.map(s => `- ${s}`).join('\n')}\n`
        : "";

    return `
Act as an **Elite Prop Firm Trader** managing a **$100,000 Funded Account**.
Your Daily Profit Target is **$1,500 - $4,000**.
Your Daily Drawdown Limit is **$4,000 (4%)**.

**REAL-TIME CONTEXT:**
- **Current Server Time (UTC):** ${timeString}
- **Mission:** You MUST Identify a trade execution (BUY or SELL). Standing aside is not an option. We need to hit the daily target.

**PROP FIRM SAFETY PROTOCOLS (MANDATORY):**
Since you are forced to trade 24/5 to meet quota, you must protect the capital with **Surgical Precision**:
1.  **Blast Radius Control:** Your Stop Loss must be based on strict invalidation of the immediate micro-structure. Do not use wide stops.
2.  **Dynamic Sizing:** You adhere to a strict **1% Risk Per Trade ($1,000)**.
3.  **Aggressive Scaling:** You aim for a minimum **${riskRewardRatio}** Risk/Reward to ensure one win covers two losses.
4.  **Duration Constraint:** To maximize session volatility and reduce swap/carry risk, look for setups that resolve within **30 Minutes to 3 Hours**.

**VISUAL ANALYSIS PROTOCOL:**
1.  **Identify Key Zones:** Locate the nearest Order Blocks, FVGs, and Liquidity Pools based on visual price action.
2.  **Determine Direction:** Based on the *immediate* momentum, which way is the market pushing? Trade with the flow.

**The "Action" Protocol:**
1.  **Take a Stance:** You MUST provide a **BUY** or **SELL** signal.
2.  **Execution:** Pinpoint the entry.
3.  **Safety Fallback:** If the market is choppy, tighten the Stop Loss to the nearest candle wick.

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
2. **Speed & Data:** Be concise. Use Google Search **strictly** for a quick check of current news/sentiment. Do not perform deep research.
3. **Output:** Return ONLY a valid JSON object.

**Output Format:**
{
  "asset": "string",
  "timeframe": "string",
  "signal": "'BUY' or 'SELL'",
  "confidence": "number (0-100)",
  "entryPoints": [number, number, number],
  "stopLoss": "number",
  "takeProfits": [number, number, number],
  "expectedDuration": "string (e.g. '45 Minutes', '2 Hours')",
  "reasoning": ["string (Concise technical reason 1)", "string (Concise technical reason 2)", "string (Concise technical reason 3)"],
  "checklist": ["string", "string", "string"],
  "invalidationScenario": "string",
  "riskAnalysis": {
    "riskPerTrade": "$1,000 (1%)",
    "suggestedLotSize": "string (e.g. '2.5 Lots')",
    "safetyScore": "number (0-100)"
  },
  "sentiment": {
    "score": "number (0-100)",
    "summary": "string"
  }
}
`;
};

async function callGeminiWithKeyRotation(request) {
    if (KEYS.length === 0) {
        throw new Error("Server configuration error: No Gemini API Keys configured.");
    }

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
        temperature: 0.4,
    };

    const startTime = Date.now();
    let lastError;

    // Retry Logic with Key Rotation
    for (const apiKey of KEYS) {
        try {
            const ai = new GoogleGenAI({ apiKey: apiKey });
            let response;
            
            // Try Primary Model (Pro) then Fallback Model (Flash)
            try {
                console.log(`Attempting analysis with gemini-3-pro-preview (Key ending in ...${apiKey.slice(-4)})`);
                response = await ai.models.generateContent({
                    model: 'gemini-3-pro-preview',
                    contents: [{ parts: promptParts }],
                    config: config,
                });
            } catch (modelError) {
                console.warn(`Primary model failed. Switching to Fallback: gemini-2.5-flash (Key ending in ...${apiKey.slice(-4)})`, modelError.message);
                
                // If model failure is actually a QUOTA failure, throw up to key rotation loop
                const msg = modelError.message || '';
                if (msg.includes('429') || msg.includes('Quota') || msg.includes('RESOURCE_EXHAUSTED')) {
                    throw modelError; 
                }

                // Otherwise, try fallback model on same key
                response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: [{ parts: promptParts }],
                    config: config,
                });
            }

            // If we are here, we got a response
            return processResponse(response);

        } catch (error) {
            lastError = error;
            const msg = error.message || '';
            const isQuotaError = msg.includes('429') || msg.includes('Quota') || msg.includes('RESOURCE_EXHAUSTED');

            if (isQuotaError) {
                console.warn(`Quota exceeded on key ending in ...${apiKey.slice(-4)}. Rotating key...`);
                continue; // Try next key
            } else {
                throw error; // Unknown error, abort
            }
        }
    }

    // If all keys failed with quota errors, wait for the 30s rule then throw
    const elapsed = Date.now() - startTime;
    const remaining = 30000 - elapsed;
    if (remaining > 0) {
        await new Promise(resolve => setTimeout(resolve, remaining));
    }

    throw new Error("Limit reached please try after some times");
}

function processResponse(response) {
    const responseText = response.text;
    if (!responseText) {
        throw new Error("Received an empty response from the AI.");
    }
    
    // Extract sources if present (grounding chunks might be empty if search disabled)
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
        
        if (!parsedData.signal || !parsedData.entryPoints) {
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
        
        if (!analysisRequest || !analysisRequest.images) {
           return res.status(400).json({ error: "Invalid request body." });
        }

        const signalData = await callGeminiWithKeyRotation(analysisRequest);
        return res.status(200).json(signalData);
    } catch (error) {
        console.error("API Error:", error);
        return res.status(500).json({ error: "API request failed", details: error.message });
    }
};
