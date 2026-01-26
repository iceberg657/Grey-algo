
const { GoogleGenAI } = require("@google/genai");

const KEYS = [
    process.env.API_KEY_1,
    process.env.API_KEY_2,
    process.env.API_KEY_3,
    process.env.API_KEY
].filter(k => !!k);

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).end();
    
    for (const key of KEYS) {
        try {
            const ai = new GoogleGenAI({ apiKey: key });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: "Analyze chart for institutional SMC logic. Output JSON.",
                config: { tools: [{googleSearch: {}}], temperature: 0.2 }
            });
            return res.status(200).json(JSON.parse(response.text));
        } catch (e) {
            if (e.message.includes('429')) continue;
            return res.status(500).json({ error: e.message });
        }
    }
    res.status(429).json({ error: "Analysis Lane Capacity Exhausted." });
};
