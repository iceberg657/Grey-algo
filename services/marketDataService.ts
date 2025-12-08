
import type { MarketDataItem } from '../types';

// Client-side fallback data in case the API endpoint is unreachable (e.g. local dev without server)
const FALLBACK_DATA: Record<string, Omit<MarketDataItem, 'symbol'>> = {
    'EUR/USD': { price: 1.0845, change: 0.0012, changePercent: 0.11 },
    'GBP/USD': { price: 1.2630, change: -0.0015, changePercent: -0.12 },
    'USD/JPY': { price: 148.15, change: 0.35, changePercent: 0.24 },
    'USD/CHF': { price: 0.8840, change: 0.0008, changePercent: 0.09 },
    'AUD/USD': { price: 0.6550, change: -0.0025, changePercent: -0.38 },
    'EUR/GBP': { price: 0.8555, change: 0.0010, changePercent: 0.12 },
    'EUR/JPY': { price: 160.90, change: 0.60, changePercent: 0.37 },
    'GBP/JPY': { price: 187.40, change: 0.45, changePercent: 0.24 },
    'AUD/JPY': { price: 96.85, change: -0.15, changePercent: -0.15 },
    'NZD/USD': { price: 0.6125, change: -0.0010, changePercent: -0.16 },
    'BTC/USD': { price: 64250.00, change: 1200.50, changePercent: 1.90 },
    'ETH/USD': { price: 3450.50, change: 85.20, changePercent: 2.53 },
    'XAU/USD': { price: 2150.40, change: 12.10, changePercent: 0.56 }
};

// Simulation helper to make the UI look alive even with fallback data
const simulateFluctuations = (data: MarketDataItem[]): MarketDataItem[] => {
    return data.map(item => {
        const isCrypto = item.symbol.includes('BTC') || item.symbol.includes('ETH');
        const baseVolatility = isCrypto ? 0.0005 : 0.0001;
        
        const volatility = item.price * baseVolatility;
        const randomFactor = (Math.random() - 0.5) * 2; 
        const priceChange = volatility * randomFactor;
        
        const newPrice = item.price + priceChange;
        const openPrice = item.price - item.change;
        const newChange = newPrice - openPrice;
        const newChangePercent = (newChange / openPrice) * 100;
        
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

/**
 * Fetches real-time market data. 
 * Tries the backend API first. If unavailable (404/500), falls back to client-side simulation.
 */
export const getMarketData = async (): Promise<MarketDataItem[]> => {
    try {
        const response = await fetch('/api/marketData');
        if (!response.ok) {
            // Throw to trigger catch block for fallback
            throw new Error(`Server returned ${response.status}`);
        }
        const data: MarketDataItem[] = await response.json();
        return data;
    } catch (error) {
        console.warn("Market API unavailable, switching to client-side simulation.", error);
        
        // Generate fallback list
        const fallbackList: MarketDataItem[] = Object.entries(FALLBACK_DATA).map(([symbol, data]) => ({
            symbol,
            ...data
        }));

        // Apply simulation to make it dynamic
        return simulateFluctuations(fallbackList);
    }
};
