
const { GoogleGenAI } = require("@google/genai");

const KEYS = {
    K1: process.env.API_KEY_1,
    K2: process.env.API_KEY_2,
    K3: process.env.API_KEY_3,
    K4: process.env.API_KEY_4,
    K5: process.env.API_KEY_5,
    P: process.env.API_KEY
};

const PROMPT = (riskRewardRatio, tradingStyle, isMultiDimensional, profitMode, globalContext, learnedStrategies = []) => {
    return `Act as an Apex-Tier SMC/ICT Analyst. Analyze visuals. 
Risk: 1%. R:R: ${riskRewardRatio}. Style: ${tradingStyle}. 
Profit Mode: ${profitMode ? 'STRICT' : 'STANDARD'}. 
Global Context: ${globalContext || 'None'}.
Output Format: Strict JSON.`;
};

async function callGeminiWithKeyRotation(request) {
    const promptText = PROMPT(request.riskRewardRatio, request.tradingStyle, request.isMultiDimensional, request.profitMode, request.globalContext, request.learnedStrategies);
    const promptParts = [{ text: promptText }];
    if (request.isMultiDimensional && request.images.higher) promptParts.push({ inlineData: { data: request.images.higher.data, mimeType: request.images.higher.mimeType } });
    promptParts.push({ inlineData: { data: request.images.primary.data, mimeType: request.images.primary.mimeType } });
    if (request.isMultiDimensional && request.images.entry) promptParts.push({ inlineData: { data: request.images.entry.data, mimeType: request.images.entry.mimeType } });

    // Priority for Chart: K3 (Gemini 3 Flash) -> K5 (Gemma 3 4B)
    const chartKeys = [KEYS.K3, KEYS.K5, KEYS.P].filter(k => !!k);
    
    for (const apiKey of chartKeys) {
        try {
            const ai = new GoogleGenAI({ apiKey });
            const modelId = apiKey === KEYS.K5 ? 'gemma-3-4b' : 'gemini-3-flash-preview';
            const isGemma = modelId.startsWith('gemma');
            
            const response = await ai.models.generateContent({ 
                model: modelId, 
                contents: [{ parts: promptParts }], 
                config: {
                    tools: isGemma ? undefined : [{googleSearch: {}}],
                    temperature: 0.2
                }
            });
            
            return processResponse(response);
        } catch (error) {
            if (error.message?.includes('429')) continue;
            throw error;
        }
    }
    throw new Error("Analysis node capacity reached.");
}

function processResponse(response) {
    const responseText = response.text;
    if (!responseText) throw new Error("Empty AI response.");
    const firstBrace = responseText.indexOf('{');
    const lastBrace = responseText.lastIndexOf('}');
    if (firstBrace === -1) throw new Error("Invalid JSON.");
    return JSON.parse(responseText.substring(firstBrace, lastBrace + 1));
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
