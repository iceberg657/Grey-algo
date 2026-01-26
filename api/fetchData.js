
const { GoogleGenAI } = require("@google/genai");

const K = {
    P: process.env.API_KEY,
    K1: process.env.API_KEY_1,
    K2: process.env.API_KEY_2,
    K3: process.env.API_KEY_3,
    K4: process.env.API_KEY_4,
    K5: process.env.API_KEY_5
};

const CHART_POOL = [K.K3, K.K4, K.K5, K.K2, K.P].filter(k => !!k);

const PROMPT = (riskRewardRatio, tradingStyle, isMultiDimensional, profitMode, globalContext) => {
    return `Act as an Apex-Tier SMC Analyst. Perform a Pixel-Level Audit of the provided charts.
R:R: ${riskRewardRatio}. Style: ${tradingStyle}. Profit Mode: ${profitMode}.
Global Context: ${globalContext || 'Analyze visuals only'}.
Output strictly as valid JSON.`;
};

async function callGeminiWithKeyRotation(request) {
    const promptText = PROMPT(request.riskRewardRatio, request.tradingStyle, request.isMultiDimensional, request.profitMode, request.globalContext);
    const promptParts = [{ text: promptText }];
    if (request.isMultiDimensional && request.images.higher) promptParts.push({ inlineData: { data: request.images.higher.data, mimeType: request.images.higher.mimeType } });
    promptParts.push({ inlineData: { data: request.images.primary.data, mimeType: request.images.primary.mimeType } });
    if (request.isMultiDimensional && request.images.entry) promptParts.push({ inlineData: { data: request.images.entry.data, mimeType: request.images.entry.mimeType } });

    for (const apiKey of CHART_POOL) {
        try {
            const ai = new GoogleGenAI({ apiKey });
            const response = await ai.models.generateContent({ 
                model: 'gemini-2.5-flash', 
                contents: [{ parts: promptParts }], 
                config: { tools: [{googleSearch: {}}], temperature: 0.2 }
            });
            
            const responseText = response.text;
            if (!responseText) continue;
            const firstBrace = responseText.indexOf('{');
            const lastBrace = responseText.lastIndexOf('}');
            return JSON.parse(responseText.substring(firstBrace, lastBrace + 1));
        } catch (error) {
            if (error.message?.includes('429')) continue;
            throw error;
        }
    }
    throw new Error("Neural Link capacity reached.");
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
