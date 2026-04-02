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
        // Check if we have a key in localStorage
        const storedSettings = localStorage.getItem('greyquant_user_settings');
        const userSettings = storedSettings ? JSON.parse(storedSettings) : null;
        const localKey = userSettings?.twelveDataApiKey;

        if (localKey && localKey.length > 10) {
            // If we have a local key, call Twelve Data directly from the client in parallel
            // This maintains the same confluence as the backend proxy
            const [quoteRes, rsiRes, smaRes] = await Promise.all([
                fetch(`https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbol)}&apikey=${localKey}`),
                fetch(`https://api.twelvedata.com/rsi?symbol=${encodeURIComponent(symbol)}&interval=${interval}&time_period=14&apikey=${localKey}`),
                fetch(`https://api.twelvedata.com/sma?symbol=${encodeURIComponent(symbol)}&interval=${interval}&time_period=20&apikey=${localKey}`)
            ]);

            if (quoteRes.ok) {
                const quoteData = await quoteRes.json();
                const rsiData = rsiRes.ok ? await rsiRes.json() : null;
                const smaData = smaRes.ok ? await smaRes.json() : null;

                return {
                    ...quoteData,
                    rsi: rsiData?.values?.[0]?.rsi || 'N/A',
                    sma: smaData?.values?.[0]?.sma || 'N/A',
                    interval
                };
            }
        }

        // Fallback to backend proxy
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
