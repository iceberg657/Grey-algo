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
        const storedSettings = localStorage.getItem('greyquant_user_settings');
        const userSettings = storedSettings ? JSON.parse(storedSettings) : null;
        const localKey = userSettings?.twelveDataApiKey;

        if (!localKey) {
            return { error: 'Twelve Data API key is required. Please set it in Settings.' };
        }

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
            
            if (quoteData.code === 429) {
                return { error: 'Twelve Data rate limit exceeded. Please wait or upgrade your plan.' };
            }

            const data: any = {
                ...quoteData,
            };

            if (rsiRes.ok) {
                const rsiData = await rsiRes.json();
                data.rsi = rsiData.values?.[0]?.rsi || null;
            }
            if (smaRes.ok) {
                const smaData = await smaRes.json();
                data.sma = smaData.values?.[0]?.sma || null;
            }
            if (stddevRes.ok) {
                const stddevData = await stddevRes.json();
                data.stddev = stddevData.values?.[0]?.stddev || null;
            }
            if (atrRes.ok) {
                const atrData = await atrRes.json();
                data.atr = atrData.values?.[0]?.atr || null;
            }
            if (adxRes.ok) {
                const adxData = await adxRes.json();
                data.adx = adxData.values?.[0]?.adx || null;
            }

            return data;
        }
        
        return { error: 'Failed to fetch quote data from Twelve Data.' };
    } catch (e: any) {
        console.error('Failed to fetch from Twelve Data:', e);
        return { error: e.message };
    }
}
