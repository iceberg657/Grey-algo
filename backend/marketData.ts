import WebSocket from 'ws';
import { Request, Response } from 'express';

const DERIV_APP_ID = 1089;

let marketDataCache: { timestamp: number | null, data: any[] } = { timestamp: null, data: [] };
const CACHE_DURATION = 15 * 60 * 1000; // 15 mins

const SYMBOLS_MAP: Record<string, string> = {
    'EUR/USD': 'frxEURUSD',
    'GBP/USD': 'frxGBPUSD',
    'USD/JPY': 'frxUSDJPY',
    'XAU/USD': 'frxXAUUSD',
    'BTC/USD': 'cryBTCUSD',
    'ETH/USD': 'cryETHUSD',
    'DJI': 'otcDJI',
    'NDX': 'otcNDX'
};

export async function fetchFromDeriv(token?: string): Promise<any[]> {
    console.log('[MarketData] Fetching ticker data from Deriv...');
    
    return new Promise((resolve) => {
        const ws = new WebSocket(`wss://ws.binaryws.com/websockets/v3?app_id=${DERIV_APP_ID}`);
        const results: any[] = [];
        const expectedCount = Object.keys(SYMBOLS_MAP).length;
        let receivedCount = 0;
        
        const timeout = setTimeout(() => {
            ws.close();
            if (results.length > 0) {
                marketDataCache = { timestamp: Date.now(), data: results };
            }
            resolve(results.length > 0 ? results : marketDataCache.data);
        }, 10000); // 10 seconds timeout for the whole batch

        ws.on('open', () => {
            // Ticks API does not require authorization, so we request immediately
            Object.entries(SYMBOLS_MAP).forEach(([displaySymbol, derivSymbol]) => {
                ws.send(JSON.stringify({ 
                    ticks_history: derivSymbol,
                    adjust_start_time: 1,
                    count: 2,
                    end: 'latest',
                    style: 'ticks',
                    req_id: displaySymbol // use displaySymbol as req_id to track
                }));
            });
        });

        ws.on('message', (data) => {
            const response = JSON.parse(data.toString());
            
            if (response.msg_type === 'ticks_history') {
                receivedCount++;
                const history = response.history;
                const req_id = response.req_id;
                
                if (history && history.prices && history.prices.length >= 2) {
                    const currentPrice = parseFloat(history.prices[history.prices.length - 1]);
                    const prevPrice = parseFloat(history.prices[history.prices.length - 2]);
                    const change = currentPrice - prevPrice;
                    const changePercent = (change / prevPrice) * 100;

                    results.push({
                        symbol: req_id,
                        price: currentPrice,
                        change: change,
                        changePercent: changePercent
                    });
                }
                
                if (receivedCount >= expectedCount || response.error) {
                    ws.close();
                    clearTimeout(timeout);
                    if (results.length > 0) {
                        marketDataCache = { timestamp: Date.now(), data: results };
                    }
                    resolve(results.length > 0 ? results : marketDataCache.data);
                }
            } else if (response.error && response.msg_type !== 'ticks_history') {
                console.error('[MarketData] Deriv WS Error:', response.error);
                ws.close();
                clearTimeout(timeout);
                resolve(marketDataCache.data);
            }
        });

        ws.on('error', (err) => {
            console.error('[MarketData] Deriv WS Catch Error:', err);
            ws.close();
            clearTimeout(timeout);
            resolve(marketDataCache.data);
        });
    });
}

export default async (req: Request, res: Response) => {
    const isStale = !marketDataCache.timestamp || (Date.now() - marketDataCache.timestamp > CACHE_DURATION);
    const token = req.query?.token as string || process.env.DERIV_API_TOKEN || process.env.VITE_DERIV_API_TOKEN || process.env.DERIV_TOKEN || process.env.VITE_DERIV_TOKEN;
    
    if (isStale || req.query?.force) {
        const data = await fetchFromDeriv(token);
        res.status(200).json(data || []);
    } else {
        res.status(200).json(marketDataCache.data);
    }
};
