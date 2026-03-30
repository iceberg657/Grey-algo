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

const API_KEY = import.meta.env.VITE_TWELVEDATA_API_KEY || 'bc100778dac44abb9fc82db199f458fa';

export async function fetchMarketData(symbol: string, interval: string = '1h'): Promise<TwelveDataTimeSeries | null> {
    try {
        const url = `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=${interval}&apikey=${API_KEY}&outputsize=10`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Twelve Data API error: ${response.statusText}`);
        }
        const data = await response.json();
        if (data.status === 'error') {
            throw new Error(`Twelve Data error: ${data.message}`);
        }
        return data as TwelveDataTimeSeries;
    } catch (error) {
        console.error('Failed to fetch Twelve Data:', error);
        return null;
    }
}
