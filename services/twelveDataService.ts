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
            try {
                // If we have a local key, call Twelve Data directly from the client in parallel
                // This maintains the same confluence as the backend proxy
                const [quoteRes, rsiRes, smaRes, stddevRes, atrRes, adxRes] = await Promise.all([
                    fetch(`https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbol)}&apikey=${localKey}`, { cache: 'no-store' }),
                    fetch(`https://api.twelvedata.com/rsi?symbol=${encodeURIComponent(symbol)}&interval=${interval}&time_period=14&apikey=${localKey}`, { cache: 'no-store' }),
                    fetch(`https://api.twelvedata.com/sma?symbol=${encodeURIComponent(symbol)}&interval=${interval}&time_period=20&apikey=${localKey}`, { cache: 'no-store' }),
                    fetch(`https://api.twelvedata.com/stddev?symbol=${encodeURIComponent(symbol)}&interval=${interval}&time_period=20&apikey=${localKey}`, { cache: 'no-store' }),
                    fetch(`https://api.twelvedata.com/atr?symbol=${encodeURIComponent(symbol)}&interval=${interval}&time_period=14&apikey=${localKey}`, { cache: 'no-store' }),
                    fetch(`https://api.twelvedata.com/adx?symbol=${encodeURIComponent(symbol)}&interval=${interval}&time_period=14&apikey=${localKey}`, { cache: 'no-store' })
                ]);

                if (quoteRes.ok) {
                    const quoteData = await quoteRes.json();
                    
                    if (quoteData.status !== 'error') {
                        const rsiData = rsiRes.ok ? await rsiRes.json() : null;
                        const smaData = smaRes.ok ? await smaRes.json() : null;
                        const stddevData = stddevRes.ok ? await stddevRes.json() : null;
                        const atrData = atrRes.ok ? await atrRes.json() : null;
                        const adxData = adxRes.ok ? await adxRes.json() : null;

                        return {
                            ...quoteData,
                            rsi: rsiData?.values?.[0]?.rsi || 'N/A',
                            sma: smaData?.values?.[0]?.sma || 'N/A',
                            stddev: stddevData?.values?.[0]?.stddev || 'N/A',
                            atr: atrData?.values?.[0]?.atr || 'N/A',
                            adx: adxData?.values?.[0]?.adx || 'N/A',
                            interval
                        };
                    } else {
                        console.warn(`Twelve Data API error with local key for ${symbol}:`, quoteData.message);
                        // Fall through to backend proxy
                    }
                }
            } catch (localError) {
                console.warn('Failed to fetch Twelve Data with local key, falling back to proxy:', localError);
                // Fall through to backend proxy
            }
        }

        // Fallback to backend proxy
        const url = `/api/twelveData?action=quote&symbol=${encodeURIComponent(symbol)}&interval=${interval}${localKey ? `&apikey=${localKey}` : ''}`;
        const response = await fetch(url, { cache: 'no-store' });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Twelve Data API error: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // The backend proxy returns combined data (quote + RSI + SMA)
        return data;
    } catch (error) {
        console.error('Failed to fetch Twelve Data via proxy:', error);
        return { error: error instanceof Error ? error.message : 'Unknown error fetching Twelve Data' };
    }
}
