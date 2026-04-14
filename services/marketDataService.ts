
import type { MarketDataItem } from '../types';

const FALLBACK_DATA: Record<string, Omit<MarketDataItem, 'symbol'>> = {
    'EUR/USD': { price: 1.0845, change: 0.0012, changePercent: 0.11 },
    'GBP/USD': { price: 1.2630, change: -0.0015, changePercent: -0.12 },
    'USD/JPY': { price: 148.15, change: 0.35, changePercent: 0.24 },
    'XAU/USD': { price: 2150.40, change: 12.10, changePercent: 0.56 },
    'BTC/USD': { price: 95240.00, change: 1400.50, changePercent: 1.45 }
};

const simulateFluctuations = (data: MarketDataItem[]): MarketDataItem[] => {
    return data.map(item => {
        const baseVolatility = item.symbol.includes('BTC') ? 0.0004 : 0.0001;
        const jitter = item.price * baseVolatility * (Math.random() - 0.5) * 2;
        const newPrice = item.price + jitter;
        const newChange = item.change + jitter;
        const newChangePercent = (newChange / (newPrice - newChange)) * 100;
        
        let prec = item.symbol.includes('JPY') || item.symbol.includes('BTC') ? 2 : 4;
        return {
            symbol: item.symbol,
            price: parseFloat(newPrice.toFixed(prec)),
            change: parseFloat(newChange.toFixed(prec)),
            changePercent: parseFloat(newChangePercent.toFixed(2)),
        };
    });
};

let lastFetchTime = 0;
let cachedData: MarketDataItem[] = [];
const DEBOUNCE_TIME = 30000; // 30 seconds between actual API calls

export const getMarketData = async (): Promise<MarketDataItem[]> => {
    const now = Date.now();
    
    // Only call API if cache is old
    if (now - lastFetchTime > DEBOUNCE_TIME) {
        try {
            const response = await fetch('/api/marketData');
            if (response.ok) {
                cachedData = await response.json();
                lastFetchTime = now;
                return cachedData;
            }
        } catch (error) {
            console.warn("Market Data API throttled, using cached/fallback.");
        }
    }

    // Return simulation of existing data to keep UI "moving"
    if (cachedData.length > 0) return simulateFluctuations(cachedData);

    return simulateFluctuations(Object.entries(FALLBACK_DATA).map(([symbol, d]) => ({ symbol, ...d })));
};
