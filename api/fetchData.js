
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
        ? `\n**Global Market Context:**\n${globalContext}\n\n**MANDATORY ADAPTATION:** You MUST cross-reference the chart pattern with this Global Market Context. \n- If the Global Context is **Bearish** (e.g., Risk-Off, Strong USD), you must PENALIZE any **Bullish** chart setups. \n- If the Global Context is **Bullish** (e.g., Risk-On, Weak USD), you must PENALIZE any **Bearish** chart setups.\n- **Constraint:** If the Chart Signal contradicts the Global Context, the Confidence Score CANNOT exceed 70.` 
        : "";

    const learnedSection = learnedStrategies.length > 0
        ? `\n**Advanced Learned Core Memory (Auto-ML Strategies):**\nThe following are advanced strategies you have autonomously learned. Apply them if the chart patterns align:\n${learnedStrategies.map(s => `- ${s}`).join('\n')}\n`
        : "";

    return `
Act as an elite algorithmic trading engine. Your goal is to identify a trade setup that **MAXIMIZES PROFIT** and **ELIMINATES LOSS**. You must be ruthless in your filtering—only pristine setups pass.

**CORE DIRECTIVE:** Perform a **rigid and detailed analysis**. You must spot **important key levels** and **structural support/resistance** with extreme precision. You must **adapt to the global market structure** to understand the "why" behind the move.

**0. STRATEGIC ANALYSIS FRAMEWORK:**
Integrate the following comprehensive workflow to ensure robust reasoning:

1. Price Action & Market Structure Analysis
· Focus: Pure price movement, swing points, and chart patterns
· Key Elements:
  · Identifying higher highs/lows (HH/HL) and lower highs/lows (LH/LL)
  · **CRITICAL:** Drawing precise key levels (Weekly/Daily Support & Resistance).
  · **CRITICAL:** Identifying structural support/resistance zones.
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

**1. RIGID ANALYTICAL WORKFLOW (MANDATORY):**
You must adhere to the following strict, two-phase protocol. Do not deviate.

**PHASE 1: METHODOLOGY SELECTION**
1.  **Indicator Check:** Scan the provided chart images for the On-Balance Volume (OBV) indicator.
    *   **IF OBV PRESENT:** Deploy **"OBV Fusion Protocol"**. Combine OBV signals (trend confirmation, divergence, volume breakouts) with traditional price action.
    *   **IF OBV ABSENT:** Deploy **"Oracle Multi-Dimensional Analysis"**. Focus purely on institutional trading principles (SMC/ICT) for a deep, structure-based market reading across multiple timeframes.

**PHASE 2: UNIFIED MULTI-LAYERED ANALYTICAL WORKFLOW (SMC/ICT & OBV Fusion)**
Execute these steps in order:

1.  **Strategic View (Higher Timeframe):**
    *   Establish the dominant directional bias.
    *   **MANDATORY:** Identify and list specific **Key Levels** (Weekly/Daily Support & Resistance, Psychological Numbers).
    *   Identify key Market Structure Shifts (MSS) and high-liquidity zones (Order Blocks, Fair Value Gaps).
    *   *Constraint:* This dictates the ONLY permissible trading direction.

2.  **Tactical View (Primary Timeframe):**
    *   Wait for price to enter a high-probability zone identified in Step 1.
    *   **MANDATORY:** Pinpoint **Structural Support/Resistance** valid for the current timeframe.
    *   Define the precise **Entry Range**, **Stop Loss** (structural invalidation), and **Take Profit** targets (liquidity pools).

3.  **Execution View (Entry Timeframe):**
    *   Pinpoint the ultimate trigger for surgical entry based on micro-price action (e.g., engulfing, wick rejection).
    *   Align with specific high-volatility time windows (ICT Killzones) if applicable.

4.  **Guardrail Check:**
    *   Any signal on a lower timeframe that contradicts the Higher Timeframe directional bias is **DISREGARDED**.

5.  **Synthesis:**
    *   Generate a single, definitive trade setup.

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
4. **Checklist:** The 'checklist' array MUST include the specific outcomes of the Rigid Workflow (e.g., "Phase 1: OBV Absent - Using SMC", "Strategic View: Bearish MSS", "Guardrail: Passed", "Key Level: Daily Resistance at 1.0500").

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

    const generateWithModel = async (modelName, thinkingBudget) => {
        const config = {
            tools: [{googleSearch: {}}],
            seed: 42,
            temperature: 0.1, 
            thinkingConfig: { thinkingBudget: thinkingBudget }, 
        };

        return await ai.models.generateContent({
            model: modelName,
            contents: [{ parts: promptParts }],
            config: config,
        });
    };

    let response;
    // Smart Fallback System: 3.0 Pro -> 2.5 Pro -> 2.5 Flash
    try {
        console.log("Attempting analysis with Gemini 3.0 Pro...");
        response = await generateWithModel('gemini-3-pro-preview', 32768);
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
