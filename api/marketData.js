
const { GoogleGenAI, Type } = require("@google/genai");

const KEYS = [
    process.env.API_KEY_4,
    process.env.API_KEY_5,
    process.env.API_KEY_6,
    process.env.API_KEY
].filter(key => !!key && key.trim() !== '');

let marketDataCache = { timestamp: null, data: [] };
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

const SYMBOLS = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'XAU/USD', 'BTC/USD', 'ETH/USD', 'US30', 'NAS100'];

async function fetchFromGemini() {
    for (const apiKey of KEYS) {
        try {
            const ai = new GoogleGenAI({ apiKey });
            // Try Gemini 3 Flash first for Ticker, fallback to 2.0
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Current price & 24h % change for: ${SYMBOLS.join(', ')}. Return JSON.`,
                config: { tools: [{ googleSearch: {} }], temperature: 0.1 }
            });

            if (response.text) {
                const start = response.text.indexOf('[');
                const end = response.text.lastIndexOf(']') + 1;
                const data = JSON.parse(response.text.substring(start, end));
                marketDataCache = { timestamp: Date.now(), data };
                return data;
            }
        } catch (e) { continue; }
    }
    return marketDataCache.data;
}

module.exports = async (req, res) => {
    const isStale = !marketDataCache.timestamp || (Date.now() - marketDataCache.timestamp > CACHE_DURATION);
    const data = isStale ? await fetchFromGemini() : marketDataCache.data;
    res.status(200).json(data || []);
};
