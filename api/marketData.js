
const { GoogleGenAI, Type } = require("@google/genai");

// Strictly use API Keys 1 and 2 for market data
const LITE_POOL = [
    process.env.API_KEY_1,
    process.env.API_KEY_2
].filter(key => !!key && key.trim() !== '');

let marketDataCache = { timestamp: null, data: [] };
const CACHE_DURATION = 15 * 60 * 1000;

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
    // If Lite Pool is empty, fallback to primary as last resort
    const keysToTry = LITE_POOL.length > 0 ? LITE_POOL : [process.env.API_KEY];
    
    for (const apiKey of keysToTry) {
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
        } catch (error) { 
            console.error(`Ticker Key Error:`, error.message);
            continue; 
        }
    }
    return marketDataCache.data;
}

module.exports = async (req, res) => {
    try {
        const isStale = !marketDataCache.timestamp || (Date.now() - marketDataCache.timestamp > CACHE_DURATION);
        const data = isStale ? await fetchFromGemini() : marketDataCache.data;
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: "Failed to load market data" });
    }
};
