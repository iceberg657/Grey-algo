
const { GoogleGenAI, Type } = require("@google/genai");

// Gemini Key Rotation (Same as fetchData.js)
const KEYS = [
    process.env.API_KEY_1,
    process.env.API_KEY_2,
    process.env.API_KEY_3,
    process.env.API_KEY
].filter(key => !!key && key.trim() !== '');

// Internal cache to prevent hitting Gemini too hard
let marketDataCache = {
    timestamp: null,
    data: [],
};

const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes cache for market prices

const SYMBOLS = [
    'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD',
    'EUR/GBP', 'EUR/JPY', 'GBP/JPY', 'AUD/JPY', 'NZD/USD',
    'BTC/USD', 'ETH/USD', 'SOL/USD', 'XAU/USD', 'US30', 'NAS100'
];

/**
 * Prompt to get live market data from Gemini Search
 */
const PRICE_PROMPT = `Find the current real-time market price, 24h absolute change, and 24h percentage change for these assets: ${SYMBOLS.join(', ')}. 
Return the data as a structured array. Ensure prices are accurate to current market conditions.`;

const RESPONSE_SCHEMA = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            symbol: { type: Type.STRING, description: 'The trading pair symbol' },
            price: { type: Type.NUMBER, description: 'Current market price' },
            change: { type: Type.NUMBER, description: 'Absolute change in the last 24h' },
            changePercent: { type: Type.NUMBER, description: 'Percentage change in the last 24h' }
        },
        required: ["symbol", "price", "change", "changePercent"]
    }
};

/**
 * Simulates micro-fluctuations to make the UI feel alive
 */
const simulateJitter = (data) => {
    return data.map(item => {
        const volatility = item.symbol.includes('BTC') || item.symbol.includes('SOL') ? 0.0003 : 0.00005;
        const randomFactor = (Math.random() - 0.5) * 2;
        const jitter = item.price * volatility * randomFactor;
        
        const newPrice = item.price + jitter;
        const newChange = item.change + jitter;
        const newChangePercent = (newChange / (newPrice - newChange)) * 100;

        let precision = 4;
        if (item.symbol.includes('JPY') || item.symbol.includes('XAU') || item.symbol.includes('BTC')) precision = 2;
        if (item.symbol.includes('US30') || item.symbol.includes('NAS100')) precision = 1;

        return {
            symbol: item.symbol,
            price: parseFloat(newPrice.toFixed(precision)),
            change: parseFloat(newChange.toFixed(precision)),
            changePercent: parseFloat(newChangePercent.toFixed(2))
        };
    });
};

async function fetchFromGemini() {
    if (KEYS.length === 0) throw new Error("No Gemini API Keys configured.");

    for (const apiKey of KEYS) {
        try {
            const ai = new GoogleGenAI({ apiKey });
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
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
                marketDataCache = {
                    timestamp: Date.now(),
                    data: parsedData
                };
                return parsedData;
            }
        } catch (error) {
            console.error(`Gemini Market Data Error with key ending ${apiKey.slice(-4)}:`, error.message);
            continue; // Try next key
        }
    }
    
    // Final Fallback if all keys fail
    return marketDataCache.data.length > 0 ? marketDataCache.data : SYMBOLS.map(s => ({
        symbol: s, price: 0, change: 0, changePercent: 0
    }));
}

module.exports = async (req, res) => {
    try {
        const now = Date.now();
        const isStale = !marketDataCache.timestamp || (now - marketDataCache.timestamp > CACHE_DURATION);

        let data;
        if (isStale) {
            data = await fetchFromGemini();
        } else {
            data = simulateJitter(marketDataCache.data);
        }

        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: "Failed to load market data", details: error.message });
    }
};
