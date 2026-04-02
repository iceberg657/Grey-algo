export interface TwelveDataQuote {
    symbol: string;
    name: string;
    exchange: string;
    mic_code: string;
    currency: string;
    datetime: string;
    timestamp: number;
    open: string;
    high: string;
    low: string;
    close: string;
    volume: string;
    previous_close: string;
    change: string;
    percent_change: string;
    average_volume: string;
    is_market_open: boolean;
    fifty_two_week: {
        low: string;
        high: string;
        low_change: string;
        high_change: string;
        low_change_percent: string;
        high_change_percent: string;
        range: string;
    };
}

export interface TwelveDataTimeSeries {
    meta: {
        symbol: string;
        interval: string;
        currency: string;
        exchange_timezone: string;
        exchange: string;
        mic_code: string;
        type: string;
    };
    values: {
        datetime: string;
        open: string;
        high: string;
        low: string;
        close: string;
        volume: string;
    }[];
    status: string;
}

export async function fetchMarketData(symbol: string, interval: string = '1h'): Promise<any | null> {
    try {
        // Use the backend proxy instead of calling Twelve Data directly from the client
        // This keeps the API key secure on the server
        const url = `/api/twelvedata/quote?symbol=${encodeURIComponent(symbol)}&interval=${interval}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Twelve Data API error: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // The backend proxy returns combined data (quote + RSI + SMA)
        return data;
    } catch (error) {
        console.error('Failed to fetch Twelve Data via proxy:', error);
        return null;
    }
}
