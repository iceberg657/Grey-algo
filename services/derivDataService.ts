
export interface DerivQuote {
    symbol: string;
    price: number;
    bid: number;
    ask: number;
    epoch: number;
}

export interface DerivCandle {
    epoch: number;
    open: number;
    high: number;
    low: number;
    close: number;
}

export interface DerivHistory {
    symbol: string;
    candles: DerivCandle[];
}

export async function fetchDerivQuote(symbol: string, token?: string): Promise<DerivQuote | null> {
    try {
        const query = new URLSearchParams({ symbol });
        if (token) query.append('token', token);
        
        const response = await fetch(`/api/derivData?${query.toString()}`);
        if (!response.ok) throw new Error(`Deriv API error: ${response.statusText}`);
        
        return await response.json();
    } catch (error) {
        console.error('[DerivService] Error fetching quote:', error);
        return null;
    }
}

export async function fetchDerivHistory(symbol: string, granularity: number = 60, count: number = 100, token?: string): Promise<DerivHistory | null> {
    try {
        const query = new URLSearchParams({ 
            symbol, 
            history: 'true',
            granularity: granularity.toString(),
            count: count.toString()
        });
        if (token) query.append('token', token);
        
        const response = await fetch(`/api/derivData?${query.toString()}`);
        if (!response.ok) throw new Error(`Deriv API error: ${response.statusText}`);
        
        return await response.json();
    } catch (error) {
        console.error('[DerivService] Error fetching history:', error);
        return null;
    }
}

/**
 * Calculates Basic Indicators from Candles
 */
export function calculateIndicators(candles: DerivCandle[]) {
    if (candles.length < 20) return null;
    
    const closes = candles.map(c => c.close);
    
    // RSI
    const calculateRSI = (prices: number[], period: number = 14) => {
        let gains = 0;
        let losses = 0;
        for (let i = 1; i <= period; i++) {
            const diff = prices[prices.length - i] - prices[prices.length - i - 1];
            if (diff >= 0) gains += diff;
            else losses -= diff;
        }
        const rs = (gains / period) / (losses / period);
        return 100 - (100 / (1 + rs));
    };

    // SMA
    const calculateSMA = (prices: number[], period: number = 20) => {
        const sum = prices.slice(-period).reduce((a, b) => a + b, 0);
        return sum / period;
    };

    // ATR
    const calculateATR = (candles: DerivCandle[], period: number = 14) => {
        let trSum = 0;
        for (let i = 1; i <= period; i++) {
            const c = candles[candles.length - i];
            const prev = candles[candles.length - i - 1];
            const tr = Math.max(
                c.high - c.low,
                Math.abs(c.high - prev.close),
                Math.abs(c.low - prev.close)
            );
            trSum += tr;
        }
        return trSum / period;
    };

    return {
        rsi: calculateRSI(closes).toFixed(2),
        sma: calculateSMA(closes).toFixed(2),
        atr: calculateATR(candles).toFixed(2),
        adx: '25.00', // Placeholder as ADX is complex for simple calc
        stddev: '0.00' // Placeholder
    };
}
