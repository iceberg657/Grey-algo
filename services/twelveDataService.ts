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

import { fetchDerivHistory, calculateIndicators } from './derivDataService';

const fetchWithTimeout = async (resource: string, options: any = {}, timeout = 5000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(resource, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
};

export async function fetchMarketData(symbol: string, interval: string = '1h'): Promise<any | null> {
    try {
        const storedSettings = localStorage.getItem('greyquant_user_settings');
        const userSettings = storedSettings ? JSON.parse(storedSettings) : null;
        const localKey = userSettings?.twelveDataApiKey;
        const derivToken = userSettings?.derivApiToken || userSettings?.derivToken;

        // 1. Try Twelve Data (Local Client Fetch) if key exists
        if (localKey && localKey.length > 5) {
            try {
                // Try proxy first to avoid CORS (using robust quantum-stream endpoint)
                let proxyUrl = `/api/quantum-stream?symbol=${encodeURIComponent(symbol)}&interval=${interval}&apikey=${localKey}`;
                if (derivToken) proxyUrl += `&token=${encodeURIComponent(derivToken)}`;
                
                const proxyRes = await fetchWithTimeout(proxyUrl, { cache: 'no-store' }, 8000);
                if (proxyRes.ok) {
                    const data = await proxyRes.json();
                    if (!data.error) return { ...data, dataSource: 'Twelve Data (Local Proxy)' };
                }
            } catch (err) {
                console.warn('[MarketService] Local Twelve Data fetch failed or timed out');
            }
        }

        // 2. Try System Twelve Data (Proxy) via Robust Endpoint
        try {
            let url = `/api/quantum-stream?symbol=${encodeURIComponent(symbol)}&interval=${interval}`;
            if (derivToken) url += `&token=${encodeURIComponent(derivToken)}`;
            
            const response = await fetchWithTimeout(url, { cache: 'no-store' }, 8000);
            if (response.ok) {
                const data = await response.json();
                if (!data.error) return { ...data, dataSource: data.dataSource || 'Twelve Data (System Proxy)' };
            } else {
                // Secondary fallback to primary proxy if quantum-stream is blocked
                let fallbackUrl = `/api/marketFetcher?symbol=${encodeURIComponent(symbol)}&interval=${interval}`;
                if (derivToken) fallbackUrl += `&token=${encodeURIComponent(derivToken)}`;
                
                const fallbackRes = await fetchWithTimeout(fallbackUrl, { cache: 'no-store' }, 8000);
                if (fallbackRes.ok) {
                    const data = await fallbackRes.json();
                    if (!data.error) return { ...data, dataSource: 'Twelve Data (Fallback Proxy)' };
                }
            }
        } catch (err) {
            console.warn('[MarketService] System Twelve Data fetch failed or timed out', err);
        }

        // 3. Try Deriv Fallback (Candlestick Data for Indicators)
        try {
            console.log(`[MarketService] Using Deriv fallback for ${symbol}`);
            let granularity = 3600; // 1h
            if (interval === '5min') granularity = 300;
            else if (interval === '15min') granularity = 900;
            else if (interval === '4h') granularity = 14400;
            else if (interval === '1day') granularity = 86400;

            const history = await fetchDerivHistory(symbol, granularity, 100, derivToken);
            if (history && history.candles && history.candles.length > 0) {
                const lastCandle = history.candles[history.candles.length - 1];
                const indicators = calculateIndicators(history.candles);
                return {
                    symbol,
                    name: symbol,
                    close: lastCandle.close.toString(),
                    high: lastCandle.high.toString(),
                    low: lastCandle.low.toString(),
                    open: lastCandle.open.toString(),
                    percent_change: '0.00',
                    rsi: indicators?.rsi || 'N/A',
                    sma: indicators?.sma || 'N/A',
                    atr: indicators?.atr || 'N/A',
                    interval,
                    dataSource: 'Deriv (Neural Fallback)',
                    is_market_open: true
                };
            }
        } catch (err) {
            console.warn('[MarketService] Deriv fallback failed');
        }

        return { error: 'All data sources exhausted', symbol, close: '0.00', dataSource: 'None' };
    } catch (error) {
        console.error('Market Service Exception:', error);
        return { error: 'Service failure', symbol };
    }
}
