
// In-memory cache to store data.
// This will persist between invocations on the same Vercel serverless instance.
let marketDataCache = {
    timestamp: null,
    data: [],
};

// Helper to check if two JS Dates are on the same day in UTC
const isSameDay = (d1, d2) => {
    if (!d1 || !d2) return false;
    const date1 = new Date(d1);
    const date2 = new Date(d2);
    return date1.getUTCFullYear() === date2.getUTCFullYear() &&
           date1.getUTCMonth() === date2.getUTCMonth() &&
           date1.getUTCDate() === date2.getUTCDate();
};

// Function to simulate small, realistic price fluctuations on cached data
const simulateFluctuations = (data) => {
    return data.map(item => {
        // Use a small volatility for realistic ticks
        // Higher volatility for Crypto
        const isCrypto = item.symbol.includes('BTC') || item.symbol.includes('ETH');
        const baseVolatility = isCrypto ? 0.0005 : 0.0001;
        
        const volatility = item.price * baseVolatility;
        const randomFactor = (Math.random() - 0.5) * 2; // -1 to 1
        const priceChange = volatility * randomFactor;
        
        const newPrice = item.price + priceChange;
        
        // Approximate 'open' price from the last real fetch to calculate new change
        const openPrice = item.price - item.change;
        const newChange = newPrice - openPrice;
        const newChangePercent = (newChange / openPrice) * 100;
        
        // Precision logic
        let pricePrecision = 4;
        if (item.symbol.includes('JPY')) pricePrecision = 2;
        if (item.symbol.includes('XAU') || item.symbol.includes('BTC') || item.symbol.includes('ETH')) pricePrecision = 2;

        return {
            symbol: item.symbol,
            price: parseFloat(newPrice.toFixed(pricePrecision)),
            change: parseFloat(newChange.toFixed(pricePrecision)),
            changePercent: parseFloat(newChangePercent.toFixed(2)),
        };
    });
};

// Fetches fresh data from Alpha Vantage for all pairs
async function fetchFreshData(apiKey) {
    const majorPairs = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD'];
    const minorPairs = ['EUR/GBP', 'EUR/JPY', 'GBP/JPY', 'AUD/JPY', 'NZD/USD'];
    const cryptoAndMetals = ['BTC/USD', 'ETH/USD', 'XAU/USD'];
    
    const allPairs = [...majorPairs, ...minorPairs, ...cryptoAndMetals];
    
    console.warn(`Making live API calls to Alpha Vantage. This function will use ${allPairs.length} calls (Limit: 25/day).`);

    const promises = allPairs.map(pair => {
        const symbol = pair.replace('/', '');
        const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
        return fetch(url).then(res => res.json());
    });
    
    try {
        const results = await Promise.all(promises);

        const freshData = results.map((result, index) => {
            const quote = result['Global Quote'];
            if (!quote || Object.keys(quote).length === 0) {
                console.warn(`Could not fetch data for ${allPairs[index]}. Response:`, JSON.stringify(result));
                if (result['Note']) {
                     console.warn(`Alpha Vantage API Note: ${result['Note']}`);
                }
                return null;
            }
            return {
                symbol: allPairs[index],
                price: parseFloat(quote['05. price']),
                change: parseFloat(quote['09. change']),
                changePercent: parseFloat(quote['10. change percent']),
            };
        }).filter(item => item !== null); // Filter out any failed fetches

        if (freshData.length > 0) {
             marketDataCache = {
                timestamp: Date.now(),
                data: freshData,
            };
            console.log(`Successfully fetched and cached ${freshData.length} pairs from Alpha Vantage.`);
        } else {
            console.error("Failed to fetch any data from Alpha Vantage. Serving stale data if available.");
        }
       
        return marketDataCache.data;
    } catch (error) {
        console.error("Error fetching from Alpha Vantage:", error);
        return marketDataCache.data; // Return old data if the entire fetch process fails
    }
}

module.exports = async (req, res) => {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;

    if (!apiKey) {
        console.error("ALPHA_VANTAGE_API_KEY environment variable not set on Vercel.");
        return res.status(500).json({ error: "Server configuration error: API key is missing." });
    }

    const now = Date.now();
    const cacheTimestamp = marketDataCache.timestamp;

    // If cache is empty or it's a new day, fetch fresh data
    if (!cacheTimestamp || !isSameDay(now, cacheTimestamp)) {
        console.log("Cache is stale or empty. Fetching fresh data from Alpha Vantage...");
        const data = await fetchFreshData(apiKey);
        if (data.length === 0) {
             return res.status(503).json({ error: "Failed to fetch initial market data from provider." });
        }
        return res.status(200).json(data);
    } else {
        // Otherwise, serve simulated data based on the cached version
        const simulatedData = simulateFluctuations(marketDataCache.data);
        return res.status(200).json(simulatedData);
    }
};
