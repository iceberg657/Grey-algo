import type { MarketDataItem } from '../types';

const initialMarketData: MarketDataItem[] = [
    { symbol: 'EUR/USD', price: 1.0853, change: 0.0021, changePercent: 0.19 },
    { symbol: 'GBP/USD', price: 1.2736, change: -0.0015, changePercent: -0.12 },
    { symbol: 'USD/JPY', price: 157.02, change: 0.35, changePercent: 0.22 },
    { symbol: 'XAU/USD', price: 2333.45, change: 15.80, changePercent: 0.68 },
    { symbol: 'AUD/USD', price: 0.6657, change: 0.0009, changePercent: 0.14 },
    { symbol: 'USD/CAD', price: 1.3651, change: -0.0023, changePercent: -0.17 },
    { symbol: 'BTC/USD', price: 67540.1, change: -1250.5, changePercent: -1.82 },
    { symbol: 'ETH/USD', price: 3512.7, change: 88.2, changePercent: 2.57 },
];

// In-memory store to persist data between calls within the session
let currentMarketData = [...initialMarketData.map(item => ({ ...item }))];

// Function to simulate random price fluctuations
const simulateFluctuations = (data: MarketDataItem[]): MarketDataItem[] => {
    return data.map(item => {
        const volatility = item.price * 0.0005; // 0.05% volatility
        const randomFactor = (Math.random() - 0.5) * 2; // -1 to 1
        const priceChange = volatility * randomFactor;
        
        const newPrice = item.price + priceChange;
        // FIX: The variable name "openPrice" was incorrectly quoted, causing a syntax error. Removed quotes.
        const openPrice = item.price - item.change;
        const newChange = newPrice - openPrice;
        const newChangePercent = (newChange / openPrice) * 100;
        
        const pricePrecision = item.symbol.includes('JPY') ? 2 : (item.price > 1000 ? 1 : 4);

        return {
            symbol: item.symbol,
            price: parseFloat(newPrice.toFixed(pricePrecision)),
            change: parseFloat(newChange.toFixed(pricePrecision)),
            changePercent: parseFloat(newChangePercent.toFixed(2)),
        };
    });
};

/**
 * Mocks fetching real-time market data.
 */
export const getMarketData = (): Promise<MarketDataItem[]> => {
    return new Promise(resolve => {
        setTimeout(() => {
            currentMarketData = simulateFluctuations(currentMarketData);
            resolve(currentMarketData);
        }, 300); // Simulate network latency
    });
};