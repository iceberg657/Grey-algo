export interface OHLC {
    epoch: number;
    open: number;
    high: number;
    low: number;
    close: number;
}

export interface SMCSignals {
    trend: 'BULLISH' | 'BEARISH' | 'RANGING';
    bos: boolean;
    choch: boolean;
    liquiditySweep: boolean;
    lastSwingHigh: number | null;
    lastSwingLow: number | null;
    ema50: number | null;
    ema200: number | null;
    rsi: number | null;
    equilibrium: number | null;
    isPremium: boolean;
    isDiscount: boolean;
}

// EMA Calculation
export function calculateEMA(data: number[], period: number): number[] {
    if (data.length < period) return [];
    
    const k = 2 / (period + 1);
    const ema = [];
    
    // Initial SMA
    let sum = 0;
    for (let i = 0; i < period; i++) sum += data[i];
    ema.push(sum / period);
    
    // EMA Formula
    for (let i = period; i < data.length; i++) {
        ema.push(data[i] * k + ema[ema.length - 1] * (1 - k));
    }
    
    return ema;
}

// RSI Calculation
export function calculateRSI(data: number[], period: number = 14): number[] {
    if (data.length < period + 1) return [];

    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
        const diff = data[i] - data[i - 1];
        if (diff >= 0) gains += diff;
        else losses -= diff;
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;
    const rsi = [];
    
    if (avgLoss === 0) {
        rsi.push(100);
    } else {
        const rs = avgGain / avgLoss;
        rsi.push(100 - (100 / (1 + rs)));
    }

    for (let i = period + 1; i < data.length; i++) {
        const diff = data[i] - data[i - 1];
        const gain = diff >= 0 ? diff : 0;
        const loss = diff < 0 ? -diff : 0;

        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;

        if (avgLoss === 0) {
            rsi.push(100);
        } else {
            const rs = avgGain / avgLoss;
            rsi.push(100 - (100 / (1 + rs)));
        }
    }

    return rsi;
}

// Find Swings (Fractals)
export function findSwings(candles: OHLC[], leftBars = 3, rightBars = 3) {
    const swingHighs: {index: number, price: number}[] = [];
    const swingLows: {index: number, price: number}[] = [];

    for (let i = leftBars; i < candles.length - rightBars; i++) {
        let isHigh = true;
        let isLow = true;
        const currentHigh = candles[i].high;
        const currentLow = candles[i].low;

        for (let j = i - leftBars; j <= i + rightBars; j++) {
            if (i === j) continue;
            if (candles[j].high >= currentHigh) isHigh = false;
            if (candles[j].low <= currentLow) isLow = false;
        }

        if (isHigh) swingHighs.push({ index: i, price: currentHigh });
        if (isLow) swingLows.push({ index: i, price: currentLow });
    }

    return { swingHighs, swingLows };
}

// Master SMC Analysis
export function analyzeSMC(candles: OHLC[]): SMCSignals {
    if (!candles || candles.length < 200) {
        return {
            trend: 'RANGING',
            bos: false, choch: false, liquiditySweep: false,
            lastSwingHigh: null, lastSwingLow: null,
            ema50: null, ema200: null, rsi: null,
            equilibrium: null, isPremium: false, isDiscount: false
        };
    }

    const closes = candles.map(c => c.close);
    
    // Indicators
    const ema50Arr = calculateEMA(closes, 50);
    const ema200Arr = calculateEMA(closes, 200);
    const rsiArr = calculateRSI(closes, 14);

    const ema50 = ema50Arr.length > 0 ? ema50Arr[ema50Arr.length - 1] : null;
    const ema200 = ema200Arr.length > 0 ? ema200Arr[ema200Arr.length - 1] : null;
    const currentRsi = rsiArr.length > 0 ? rsiArr[rsiArr.length - 1] : null;
    
    const lastCandle = candles[candles.length - 1]; // Could be live/open candle
    const closedCandle = candles[candles.length - 2]; // Most recently closed candle

    // Trend Definition
    let trend: 'BULLISH' | 'BEARISH' | 'RANGING' = 'RANGING';
    if (ema50 !== null && ema200 !== null) {
        if (ema50 > ema200 && closedCandle.close > ema50) trend = 'BULLISH';
        else if (ema50 < ema200 && closedCandle.close < ema50) trend = 'BEARISH';
    }

    // Swings
    const { swingHighs, swingLows } = findSwings(candles, 3, 3);
    const lastSwingHigh = swingHighs.length > 0 ? swingHighs[swingHighs.length - 1].price : null;
    const lastSwingLow = swingLows.length > 0 ? swingLows[swingLows.length - 1].price : null;

    let bos = false;
    let choch = false;
    let liquiditySweep = false;

    // SMC Logic using strict CLOSE for BOS/CHoCH and WICK for Sweeps
    if (trend === 'BULLISH') {
        // BOS: Close above last swing high
        if (lastSwingHigh !== null && closedCandle.close > lastSwingHigh) {
            bos = true;
        }
        // CHoCH: Close below last swing low
        if (lastSwingLow !== null && closedCandle.close < lastSwingLow) {
            choch = true;
        }
        // Sweep: Wick drops below swing low but specifically closes ABOVE it
        if (lastSwingLow !== null && lastCandle.low < lastSwingLow && lastCandle.close > lastSwingLow) {
            liquiditySweep = true;
        }
    } else if (trend === 'BEARISH') {
        // BOS: Close below last swing low
        if (lastSwingLow !== null && closedCandle.close < lastSwingLow) {
            bos = true;
        }
        // CHoCH: Close above last swing high
        if (lastSwingHigh !== null && closedCandle.close > lastSwingHigh) {
            choch = true;
        }
        // Sweep: Wick spikes above swing high but specifically closes BELOW it
        if (lastSwingHigh !== null && lastCandle.high > lastSwingHigh && lastCandle.close < lastSwingHigh) {
            liquiditySweep = true;
        }
    }

    // Premium / Discount Zones
    let equilibrium = null;
    let isPremium = false;
    let isDiscount = false;

    if (lastSwingHigh !== null && lastSwingLow !== null) {
        equilibrium = (lastSwingHigh + lastSwingLow) / 2;
        const currentPrice = lastCandle.close;
        if (currentPrice > equilibrium) {
            isPremium = true;
        } else if (currentPrice < equilibrium) {
            isDiscount = true;
        }
    }

    return {
        trend,
        bos,
        choch,
        liquiditySweep,
        lastSwingHigh,
        lastSwingLow,
        ema50: ema50 ? Number(ema50.toFixed(5)) : null,
        ema200: ema200 ? Number(ema200.toFixed(5)) : null,
        rsi: currentRsi ? Number(currentRsi.toFixed(2)) : null,
        equilibrium: equilibrium ? Number(equilibrium.toFixed(5)) : null,
        isPremium,
        isDiscount
    };
}
