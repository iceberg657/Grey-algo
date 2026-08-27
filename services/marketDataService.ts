
import type { MarketDataItem } from '../types';
import { 
    ACCURATE_MARKET_FALLBACKS, 
    normalizeSymbolKey, 
    findAssetPrice 
} from './marketDataConstants';
import { derivStream } from './derivStreamService';

export { ACCURATE_MARKET_FALLBACKS, normalizeSymbolKey, findAssetPrice };

let cachedData: MarketDataItem[] = [];
let lastFetchTimestamp = 0;

/**
 * Fetches real market data from Deriv stream and backend API without artificial simulation
 */
export const getMarketData = async (force: boolean = false, token?: string): Promise<MarketDataItem[]> => {
    // 1. If Deriv direct WebSocket stream has live streaming prices, prioritize those
    const liveStreamPrices = derivStream.getLatestPrices();
    if (!force && liveStreamPrices.length > 0 && (Date.now() - derivStream.getLastTickTimestamp() < 30000)) {
        return liveStreamPrices;
    }

    try {
        const queryParams = new URLSearchParams();
        if (token) queryParams.append('token', token);
        if (force) queryParams.append('force', 'true');
        
        const response = await fetch(`/api/marketData?${queryParams.toString()}`, {
            cache: 'no-store'
        });

        if (response.ok) {
            const fetched = await response.json();
            if (Array.isArray(fetched) && fetched.length > 0) {
                cachedData = fetched;
                lastFetchTimestamp = Date.now();
                return cachedData;
            }
        }
    } catch (error) {
        console.warn("[MarketData] API fetch error:", error);
    }

    if (liveStreamPrices.length > 0) {
        return liveStreamPrices;
    }

    if (cachedData.length > 0) {
        return cachedData;
    }

    const fallbackList = Object.entries(ACCURATE_MARKET_FALLBACKS).map(([symbol, d]) => ({ 
        symbol, 
        ...d 
    }));
    cachedData = fallbackList;
    lastFetchTimestamp = Date.now();
    return fallbackList;
};



