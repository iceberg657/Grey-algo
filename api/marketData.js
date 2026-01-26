
const { GoogleGenAI, Type } = require("@google/genai");

const KEYS = [
    process.env.API_KEY_1,
    process.env.API_KEY_2,
    process.env.API_KEY_3,
    process.env.API_KEY
].filter(key => !!key && key.trim() !== '');

let marketDataCache = { timestamp: null, data: [] };
const CACHE_DURATION = 10 * 60 * 1000;

const SYMBOLS = [
    'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD',
    'EUR/GBP', 'EUR/JPY', 'GBP/JPY', 'AUD/JPY', 'NZD/USD',
    'BTC/USD', 'ETH/USD', 'SOL/USD', 'XAU/USD', 'US30', 'NAS100'
];

const PRICE_PROMPT = `Find real-time price, 24h change, and % change for: ${SYMBOLS.join(', ')}.`;

const RESPONSE_SCHEMA = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            symbol: { type: Type.STRING },
            price: { type: Type.NUMBER },
            change: { type: Type.NUMBER },
            changePercent: { type: Type.NUMBER }
        },
        required: ["symbol", "price", "change", "changePercent"]
    }
};

async function fetchFromGemini() {
    if (KEYS.length === 0) throw new Error("No keys.");
    for (const apiKey of KEYS) {
        try {
            const ai = new GoogleGenAI({ apiKey });
            const response = await ai.models.generateContent({
                model: 'gemini-flash-lite-latest',
                contents: [{ parts: [{ text: PRICE_PROMPT }] }],
                config: {
                    tools: [{ googleSearch: {} }],
                    responseMimeType: "application/json",
                    responseSchema: RESPONSE_SCHEMA,
                    temperature: 0.1
                }
            });
            const text = response.text;
            if (!text) continue;
            const parsedData = JSON.parse(text);
            if (Array.isArray(parsedData) && parsedData.length > 0) {
                marketDataCache = { timestamp: Date.now(), data: parsedData };
                return parsedData;
            }
        } catch (error) { continue; }
    }
    return marketDataCache.data;
}

module.exports = async (req, res) => {
    try {
        const isStale = !marketDataCache.timestamp || (Date.now() - marketDataCache.timestamp > CACHE_DURATION);
        const data = isStale ? await fetchFromGemini() : marketDataCache.data;
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: "Failed to load" });
    }
};
