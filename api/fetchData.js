
const { GoogleGenAI } = require("@google/genai");

const KEYS = [
    process.env.API_KEY_1,
    process.env.API_KEY_2,
    process.env.API_KEY_3,
    process.env.API_KEY_4,
    process.env.API_KEY_5,
    process.env.API_KEY
].filter(key => !!key && key.trim() !== '');

const PROMPT = (riskRewardRatio, tradingStyle, isMultiDimensional, profitMode, globalContext, learnedStrategies = []) => {
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
1. **Trend Alignment:** The trade MUST align with the higher timeframe trend.
2. **Liquidity:** The entry MUST occur immediately after a clear Liquidity Sweep (Stop Hunt).
3. **Time Window:** Prefer optimal volume sessions (London/NY Killzones).
**OUTPUT RULE:** If conditions are **NOT optimal**, return a **NEUTRAL** signal with reasoning explaining which filter failed.
` : "";

    return `
Act as an **Apex-Tier SMC/ICT Quantitative Analyst**. Perform a **Pixel-Level Structural Audit** of the charts.

**CONTEXT:**
- **Current Server Time (UTC):** ${timeString}
- **Global Context:** ${globalContext || 'Analyze visuals'}

**VISUAL ANALYSIS PROTOCOL:**
1.  **Spot Liquidity Pools:** Identify recent sweeps of high/lows.
2.  **Detect Imbalance:** Look for Fair Value Gaps (FVGs).
3.  **Pinpoint Entry Type:**
    - Detect the **Current Market Price (CMP)** from the screenshot.
    - Compare CMP to your **Optimal Trade Entry (OTE)**.
    - Label as 'Market Execution' if CMP is in OTE.
    - Label as 'Pullback' if price needs to retrace to a FVG/OB.
    - Label as 'Breakout' for stop orders.

${profitModeInstructions}

**Trading Parameters:**
· **Style:** ${styleInstruction}
· **Risk Management:** Target R:R of ${riskRewardRatio}. Risk 1% per trade.

${learnedSection}

**Output Format (Strict JSON):**
{
  "asset": "string",
  "timeframe": "string",
  "signal": "'BUY' or 'SELL' or 'NEUTRAL'",
  "confidence": "number",
  "entryPoints": [number, number, number],
  "entryType": "'Market Execution' | 'Pullback' | 'Breakout'",
  "stopLoss": "number",
  "takeProfits": [number, number, number],
  "expectedDuration": "string (MUST BE 30m - 3h)",
  "reasoning": ["Technical reason 1", "SMC Reason 2", "Entry Logic 3"],
  "checklist": ["string"],
  "invalidationScenario": "string",
  "riskAnalysis": {
    "riskPerTrade": "$1,000 (1%)",
    "suggestedLotSize": "string",
    "safetyScore": "number"
  },
  "sentiment": {
    "score": "number",
    "summary": "string"
  }
}
`;
};

async function callGeminiWithKeyRotation(request) {
    if (KEYS.length === 0) throw new Error("No API Keys configured.");
    const textPart = { text: PROMPT(request.riskRewardRatio, request.tradingStyle, request.isMultiDimensional, request.profitMode, request.globalContext, request.learnedStrategies) };
    const promptParts = [textPart];
    if (request.isMultiDimensional && request.images.higher) promptParts.push({ inlineData: { data: request.images.higher.data, mimeType: request.images.higher.mimeType } });
    promptParts.push({ inlineData: { data: request.images.primary.data, mimeType: request.images.primary.mimeType } });
    if (request.isMultiDimensional && request.images.entry) promptParts.push({ inlineData: { data: request.images.entry.data, mimeType: request.images.entry.mimeType } });

    const flashModels = ['gemini-3-flash-preview', 'gemini-2.5-flash'];
    const startTime = Date.now();

    for (const apiKey of KEYS) {
        try {
            const ai = new GoogleGenAI({ apiKey });
            
            // Designate API_KEY_5 node to use gemma-3-4b
            const isGemmaNode = !!process.env.API_KEY_5 && apiKey === process.env.API_KEY_5;
            const modelsToTry = isGemmaNode ? ['gemma-3-4b', ...flashModels] : flashModels;

            let response;
            for (const model of modelsToTry) {
                try {
                    const isGemma = model.startsWith('gemma');
                    const config = { 
                        tools: isGemma ? undefined : [{googleSearch: {}}], 
                        temperature: request.profitMode ? 0.1 : 0.25,
                        thinkingConfig: isGemma ? undefined : { thinkingBudget: request.profitMode ? 4000 : 2000 }
                    };
                    response = await ai.models.generateContent({ model, contents: [{ parts: promptParts }], config });
                    break;
                } catch (e) {
                    if (e.message?.includes('429')) throw e;
                    continue;
                }
            }
            if (response) return processResponse(response);
        } catch (error) {
            if (error.message?.includes('429')) continue;
            throw error;
        }
    }

    const elapsed = Date.now() - startTime;
    const remaining = 5000 - elapsed;
    if (remaining > 0) await new Promise(resolve => setTimeout(resolve, remaining));
    throw new Error("Quota exhausted across all available keys.");
}

function processResponse(response) {
    const responseText = response.text;
    if (!responseText) throw new Error("Empty AI response.");
    const firstBrace = responseText.indexOf('{');
    const lastBrace = responseText.lastIndexOf('}');
    if (firstBrace === -1) throw new Error("Invalid JSON.");
    const jsonString = responseText.substring(firstBrace, lastBrace + 1);
    return JSON.parse(jsonString);
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).end();
    try {
        const signalData = await callGeminiWithKeyRotation(req.body);
        return res.status(200).json(signalData);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
