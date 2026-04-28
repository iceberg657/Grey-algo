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
export function analyzeSMC(candles: any[], confirmCandles?: any[], htfCandles?: any[]) {
    if (!candles || candles.length < 50) return null;

    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);

    // EMA Calculation
    const calculateEMA = (data: number[], period: number) => {
        const k = 2 / (period + 1);
        let ema = data[0];
        for (let i = 1; i < data.length; i++) {
            ema = data[i] * k + ema * (1 - k);
        }
        return ema;
    };

    const ema50 = calculateEMA(closes, 50);
    const ema200 = calculateEMA(closes, 200);

    // RSI Calculation
    const calculateRSI = (data: number[], period = 14) => {
        let gains = 0, losses = 0;
        for (let i = 1; i <= period; i++) {
            const diff = data[i] - data[i - 1];
            if (diff > 0) gains += diff;
            else losses -= diff;
        }
        const rs = gains / (losses || 1);
        return 100 - 100 / (1 + rs);
    };

    const rsi = calculateRSI(closes);

    // Swing Highs and Lows
    const lastSwingHigh = Math.max(...highs.slice(-20));
    const lastSwingLow = Math.min(...lows.slice(-20));
    const currentPrice = closes[closes.length - 1];

    // Trend
    const trend = ema50 > ema200 && currentPrice > ema50 ? 'BULLISH' :
                  ema50 < ema200 && currentPrice < ema50 ? 'BEARISH' : 'RANGING';

    // BOS and CHoCH
    const prevHigh = Math.max(...highs.slice(-10, -1));
    const prevLow = Math.min(...lows.slice(-10, -1));
    const bos = trend === 'BULLISH' ? currentPrice > prevHigh : currentPrice < prevLow;
    const choch = trend === 'BULLISH' ? currentPrice < prevLow : currentPrice > prevHigh;

    // Liquidity Sweep
    const lastCandle = candles[candles.length - 1];
    const liquiditySweep = trend === 'BULLISH'
        ? lastCandle.low < prevLow && lastCandle.close > prevLow
        : lastCandle.high > prevHigh && lastCandle.close < prevHigh;

    // ✅ NEW: Premium/Discount Zone Calculation
    const highest = Math.max(...highs);
    const lowest = Math.min(...lows);
    const range = highest - lowest;
    const midpoint = lowest + range / 2;
    const premiumZone = { upper: highest, lower: midpoint };
    const discountZone = { upper: midpoint, lower: lowest };
    const currentZone = currentPrice > midpoint ? 'PREMIUM' : 'DISCOUNT';

    // Zone validity check
    const zoneValid = (
        (trend === 'BULLISH' && currentZone === 'DISCOUNT') ||
        (trend === 'BEARISH' && currentZone === 'PREMIUM')
    );

    // ✅ NEW: 3 Timeframe Confirmation
    let tfConfirmation = {
        entryTrend: trend,
        confirmTrend: 'UNKNOWN',
        htfTrend: 'UNKNOWN',
        allAligned: false
    };

    if (confirmCandles && confirmCandles.length >= 50) {
        const confirmCloses = confirmCandles.map((c: any) => c.close);
        const confirmEma50 = calculateEMA(confirmCloses, 50);
        const confirmEma200 = calculateEMA(confirmCloses, 200);
        const confirmPrice = confirmCloses[confirmCloses.length - 1];
        tfConfirmation.confirmTrend = confirmEma50 > confirmEma200 && confirmPrice > confirmEma50
            ? 'BULLISH' : confirmEma50 < confirmEma200 && confirmPrice < confirmEma50
            ? 'BEARISH' : 'RANGING';
    }

    if (htfCandles && htfCandles.length >= 50) {
        const htfCloses = htfCandles.map((c: any) => c.close);
        const htfEma50 = calculateEMA(htfCloses, 50);
        const htfEma200 = calculateEMA(htfCloses, 200);
        const htfPrice = htfCloses[htfCloses.length - 1];
        tfConfirmation.htfTrend = htfEma50 > htfEma200 && htfPrice > htfEma50
            ? 'BULLISH' : htfEma50 < htfEma200 && htfPrice < htfEma50
            ? 'BEARISH' : 'RANGING';
    }

    // If HTF data insufficient, don't penalize — just skip TF alignment check
    tfConfirmation.allAligned = (
        tfConfirmation.entryTrend !== 'RANGING' &&
        (
            // Full 3TF alignment
            (tfConfirmation.entryTrend === tfConfirmation.confirmTrend &&
             tfConfirmation.confirmTrend === tfConfirmation.htfTrend) ||
            // Partial — only entry + confirm available
            (tfConfirmation.htfTrend === 'UNKNOWN' &&
             tfConfirmation.entryTrend === tfConfirmation.confirmTrend) ||
            // Only entry TF available
            (tfConfirmation.confirmTrend === 'UNKNOWN' &&
             tfConfirmation.htfTrend === 'UNKNOWN')
        )
    );

    // ✅ NEW: Confidence Scoring (45-55% threshold)
    let confidenceScore = 0;
    if (trend !== 'RANGING') confidenceScore += 20;
    if (bos) confidenceScore += 15;
    if (liquiditySweep) confidenceScore += 15;
    if (zoneValid) confidenceScore += 20;
    if (tfConfirmation.allAligned) confidenceScore += 20;
    if (rsi > 50 && trend === 'BULLISH') confidenceScore += 10;
    if (rsi < 50 && trend === 'BEARISH') confidenceScore += 10;

    // Block signal if below 45%
    // If ranging but strong BOS + liquidity sweep exists, allow signal
    const rangingException = trend === 'RANGING' && bos && liquiditySweep;
    const signalValid = confidenceScore >= 45 || rangingException;
    const blockSignal = !signalValid || !zoneValid;
    const blockReason = !signalValid
        ? `Confidence ${confidenceScore}% below 45% minimum threshold`
        : !zoneValid
        ? `Price in ${currentZone} zone conflicts with ${trend} bias`
        : null;

    return {
        trend,
        ema50,
        ema200,
        rsi,
        lastSwingHigh,
        lastSwingLow,
        bos,
        choch,
        liquiditySweep,
        // New additions
        premiumZone,
        discountZone,
        currentZone,
        zoneValid,
        confidenceScore,
        signalValid,
        blockSignal,
        blockReason,
        tfConfirmation
    };
}
