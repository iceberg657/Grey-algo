
import WebSocket from 'ws';

const DERIV_APP_ID = 1089;

let marketDataCache = { timestamp: null, data: [] };
const CACHE_DURATION = 15 * 60 * 1000; // 15 mins

const SYMBOLS_MAP = {
    'EUR/USD': 'frxEURUSD',
    'GBP/USD': 'frxGBPUSD',
    'USD/JPY': 'frxUSDJPY',
    'XAU/USD': 'frxXAUUSD',
    'BTC/USD': 'cryBTCUSD',
    'ETH/USD': 'cryETHUSD',
    'DJI': 'otcDJI',
    'NDX': 'otcNDX'
};

async function fetchSymbolData(symbol, derivSymbol, token) {
    return new Promise((resolve) => {
        const ws = new WebSocket(`wss://ws.binaryws.com/websockets/v3?app_id=${DERIV_APP_ID}`);
        const timeout = setTimeout(() => {
            ws.close();
            resolve(null);
        }, 5000);

        ws.on('open', () => {
            if (token) {
                ws.send(JSON.stringify({ authorize: token }));
            } else {
                // Try without auth for public ticks_history if possible, 
                // but Deriv usually requires auth for many symbols
                ws.send(JSON.stringify({ 
                    ticks_history: derivSymbol,
                    adjust_start_time: 1,
                    count: 2,
                    end: 'latest',
                    style: 'ticks'
                }));
            }
        });

        ws.on('message', (data) => {
            const response = JSON.parse(data);
            
            if (response.msg_type === 'authorize' && !response.error) {
                ws.send(JSON.stringify({ 
                    ticks_history: derivSymbol,
                    adjust_start_time: 1,
                    count: 2,
                    end: 'latest',
                    style: 'ticks'
                }));
            } else if (response.msg_type === 'ticks_history') {
                const history = response.history;
                if (history && history.prices && history.prices.length >= 2) {
                    const currentPrice = parseFloat(history.prices[1]);
                    const prevPrice = parseFloat(history.prices[0]);
                    const change = currentPrice - prevPrice;
                    const changePercent = (change / prevPrice) * 100;

                    resolve({
                        symbol,
                        price: currentPrice,
                        change: change,
                        changePercent: changePercent
                    });
                } else {
                    resolve(null);
                }
                ws.close();
                clearTimeout(timeout);
            } else if (response.error) {
                ws.close();
                clearTimeout(timeout);
                resolve(null);
            }
        });

        ws.on('error', () => {
            ws.close();
            clearTimeout(timeout);
            resolve(null);
        });
    });
}

export async function fetchFromDeriv(token) {
    if (!token) {
        console.warn('[MarketData] Deriv Token missing, cannot fetch ticker data.');
        return marketDataCache.data;
    }

    console.log('[MarketData] Fetching ticker data from Deriv...');
    const results = [];
    for (const [displaySymbol, derivSymbol] of Object.entries(SYMBOLS_MAP)) {
        const data = await fetchSymbolData(displaySymbol, derivSymbol, token);
        if (data) results.push(data);
    }

    if (results.length > 0) {
        marketDataCache = { timestamp: Date.now(), data: results };
        return results;
    }
    return marketDataCache.data;
}

export default async (req, res) => {
    const isStale = !marketDataCache.timestamp || (Date.now() - marketDataCache.timestamp > CACHE_DURATION);
    const token = req.query?.token || process.env.DERIV_API_TOKEN || process.env.VITE_DERIV_API_TOKEN || process.env.DERIV_TOKEN || process.env.VITE_DERIV_TOKEN;
    if (isStale) {
        const data = await fetchFromDeriv(token);
        res.status(200).json(data || []);
    } else {
        res.status(200).json(marketDataCache.data);
    }
};
