
import type { MarketDataItem } from '../types';

/**
 * Fetches real-time market data from the backend service.
 * The backend handles caching and simulation to manage API rate limits.
 */
export const getMarketData = async (): Promise<MarketDataItem[]> => {
    try {
        const response = await fetch('/api/marketData');
        if (!response.ok) {
            const errorBody = await response.text();
            console.error('Failed to fetch market data from server:', errorBody);
            throw new Error('Market data service is temporarily unavailable.');
        }
        const data: MarketDataItem[] = await response.json();
        return data;
    } catch (error) {
        console.error("Client-side error in getMarketData:", error);
        // Re-throw to be handled by the component
        throw error; 
    }
};
