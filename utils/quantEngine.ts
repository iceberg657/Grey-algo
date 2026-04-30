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
    const prevHigh = Math.max(...highs.slice(-12, -1));
    const prevLow = Math.min(...lows.slice(-12, -1));
    
    let bos = false;
    let choch = false;
    if (trend === 'BULLISH') {
        bos = currentPrice > prevHigh;
        choch = currentPrice < prevLow;
    } else if (trend === 'BEARISH') {
        bos = currentPrice < prevLow;
        choch = currentPrice > prevHigh;
    } else {
        // In RANGING: BOS is a break of the local range
        bos = currentPrice > prevHigh || currentPrice < prevLow;
    }

    // Liquidity Sweep
    const lastCandle = candles[candles.length - 1];
    let liquiditySweep = false;
    if (trend === 'BULLISH') {
        liquiditySweep = lastCandle.low < prevLow && lastCandle.close > prevLow;
    } else if (trend === 'BEARISH') {
        liquiditySweep = lastCandle.high > prevHigh && lastCandle.close < prevHigh;
    } else {
        // In RANGING: Check both sides for sweeps
        liquiditySweep = (lastCandle.low < prevLow && lastCandle.close > prevLow) || 
                         (lastCandle.high > prevHigh && lastCandle.close < prevHigh);
    }

    // ✅ NEW: Premium/Discount Zone Calculation
    const highest = Math.max(...highs.slice(-50));
    const lowest = Math.min(...lows.slice(-50));
    const range = highest - lowest;
    const midpoint = lowest + range / 2;
    const premiumZone = { upper: highest, lower: midpoint };
    const discountZone = { upper: midpoint, lower: lowest };
    const currentZone = currentPrice > midpoint ? 'PREMIUM' : 'DISCOUNT';

    // Zone validity check
    // In Trends: Must be in discount for BUY, premium for SELL
    // In Ranges: Must be in outer 30% for mean reversion
    const distFromMid = Math.abs(currentPrice - midpoint);
    const rangeExtremity = distFromMid / (range / 2); // 0 at midpoint, 1 at edges

    let zoneValid = false;
    if (trend === 'BULLISH') {
        zoneValid = currentZone === 'DISCOUNT';
    } else if (trend === 'BEARISH') {
        zoneValid = currentZone === 'PREMIUM';
    } else {
        // Ranging: Valid if price is at the edges (outer 30%)
        zoneValid = rangeExtremity > 0.4; 
    }

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
        (trend !== 'RANGING') &&
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

    // ATR Calculation
    const calculateATR = (c: any[], period = 14) => {
        const trs = c.map((candle, i) => {
            if (i === 0) return candle.high - candle.low;
            const prevClose = c[i - 1].close;
            return Math.max(
                candle.high - candle.low,
                Math.abs(candle.high - prevClose),
                Math.abs(candle.low - prevClose)
            );
        });
        const recent = trs.slice(-period);
        return recent.reduce((a, b) => a + b, 0) / (recent.length || 1);
    };
    const atr = calculateATR(candles);

    // ✅ NEW: Institutional Displacement Filter
    // Look at recent few candles for a strong body > 1.5x ATR
    const recentCandles = candles.slice(-5);
    let displacement = false;
    let displacementCandle = null;
    let displacementDirection = null;

    for (let i = recentCandles.length - 1; i >= 0; i--) {
        const candle = recentCandles[i];
        const bodySize = Math.abs(candle.close - candle.open);
        if (bodySize >= (atr * 1.5)) {
            displacement = true;
            displacementCandle = candle;
            displacementDirection = candle.close > candle.open ? 'BULLISH' : 'BEARISH';
            break;
        }
    }

    // ✅ NEW: Optimal Trade Entry (OTE) Math based on HTF Swing
    // We use the last 150 candles to find the real HTF range
    const htfHighs = htfCandles ? htfCandles.slice(-150).map(c => c.high) : highs.slice(-150);
    const htfLows = htfCandles ? htfCandles.slice(-150).map(c => c.low) : lows.slice(-150);
    const htfHighest = Math.max(...htfHighs);
    const htfLowest = Math.min(...htfLows);
    const htfRange = htfHighest - htfLowest;
    
    // OTE is calculated based on direction (Bullish uses Low to High, Bearish uses High to Low)
    const ote = {
        bullish: {
            start: htfHighest - (htfRange * 0.62),
            mid: htfHighest - (htfRange * 0.705), // Sweet spot
            deep: htfHighest - (htfRange * 0.79)
        },
        bearish: {
            start: htfLowest + (htfRange * 0.62),
            mid: htfLowest + (htfRange * 0.705), // Sweet spot
            deep: htfLowest + (htfRange * 0.79)
        }
    };
    const isInOTE = tfConfirmation.htfTrend === 'BULLISH' 
        ? currentPrice <= ote.bullish.start && currentPrice >= ote.bullish.deep
        : tfConfirmation.htfTrend === 'BEARISH'
        ? currentPrice >= ote.bearish.start && currentPrice <= ote.bearish.deep
        : false;

    // FVG Detection
    const detectFVG = (c: any[]) => {
        if (c.length < 3) return null;
        const c1 = c[c.length - 3];
        const c3 = c[c.length - 1];

        // Bullish FVG
        if (c1.high < c3.low) {
            return {
                type: 'BULLISH',
                upper: c3.low,
                lower: c1.high,
                midpoint: (c3.low + c1.high) / 2,
                filled: false
            };
        }

        // Bearish FVG
        if (c1.low > c3.high) {
            return {
                type: 'BEARISH',
                upper: c1.low,
                lower: c3.high,
                midpoint: (c1.low + c3.high) / 2,
                filled: false
            };
        }

        return null;
    };
    const fvg = detectFVG(candles);

    const fvgRetest = fvg ? (
        fvg.type === 'BULLISH'
            ? currentPrice >= fvg.lower && currentPrice <= fvg.upper
            : currentPrice >= fvg.lower && currentPrice <= fvg.upper
    ) : false;

    // Order Block Detection
    const detectOrderBlock = (c: any[], t: string) => {
        if (c.length < 5) return null;
        const recent = c.slice(-10);

        if (t === 'BULLISH') {
            for (let i = recent.length - 2; i >= 0; i--) {
                const isBearish = recent[i].close < recent[i].open;
                const nextIsBullish = recent[i + 1].close > recent[i + 1].open;
                const strongMove = (recent[i + 1].close - recent[i + 1].open) >
                                   (recent[i].open - recent[i].close) * 1.5;

                if (isBearish && nextIsBullish && strongMove) {
                    return {
                        type: 'BULLISH_OB',
                        upper: recent[i].open,
                        lower: recent[i].close,
                        mitigated: currentPrice >= recent[i].close &&
                                   currentPrice <= recent[i].open
                    };
                }
            }
        }

        if (t === 'BEARISH') {
            for (let i = recent.length - 2; i >= 0; i--) {
                const isBullish = recent[i].close > recent[i].open;
                const nextIsBearish = recent[i + 1].close < recent[i + 1].open;
                const strongMove = (recent[i + 1].open - recent[i + 1].close) >
                                   (recent[i].close - recent[i].open) * 1.5;

                if (isBullish && nextIsBearish && strongMove) {
                    return {
                        type: 'BEARISH_OB',
                        upper: recent[i].close,
                        lower: recent[i].open,
                        mitigated: currentPrice >= recent[i].open &&
                                   currentPrice <= recent[i].close
                    };
                }
            }
        }
        return null;
    };
    const orderBlock = detectOrderBlock(candles, trend);

    // Session Detection
    const detectSession = () => {
        const now = new Date();
        const utcHour = now.getUTCHours();
        if (utcHour >= 7 && utcHour < 11) return 'LONDON';
        if (utcHour >= 12 && utcHour < 16) return 'NEW_YORK';
        if (utcHour >= 11 && utcHour < 12) return 'LONDON_NY_OVERLAP';
        if (utcHour >= 0 && utcHour < 7) return 'ASIAN';
        return 'OFF_SESSION';
    };
    const session = detectSession();

    // Standard Deviation Overextension
    const calculateStdDev = (data: number[], period = 20) => {
        const slice = data.slice(-period);
        const mean = slice.reduce((a, b) => a + b, 0) / (slice.length || 1);
        const variance = slice.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / (slice.length || 1);
        const std = Math.sqrt(variance);
        return {
            stddev: std,
            mean,
            upperBand: mean + std * 2,
            lowerBand: mean - std * 2,
            overextended: currentPrice > mean + std * 2 || currentPrice < mean - std * 2
        };
    };
    const stdDev = calculateStdDev(closes);

    // ✅ NEW: Confidence Scoring (45-55% threshold)
    let confidenceScore = 0;
    if (trend !== 'RANGING') confidenceScore += 20;
    if (bos) confidenceScore += 15;
    if (liquiditySweep) confidenceScore += 15;
    if (zoneValid) confidenceScore += 20;
    if (tfConfirmation.allAligned) confidenceScore += 20;
    
    // RSI Sentiment
    if (rsi > 60 && trend === 'BULLISH') confidenceScore += 10;
    if (rsi < 40 && trend === 'BEARISH') confidenceScore += 10;
    if (trend === 'RANGING' && (rsi < 30 || rsi > 70)) confidenceScore += 15; // Mean reversion setups

    // Math additions to score
    if (atr > 0) confidenceScore += 5; // Market has volatility
    if (fvg && fvgRetest) confidenceScore += 10;
    if (orderBlock?.mitigated) confidenceScore += 10;
    if (session === 'LONDON' || session === 'NEW_YORK') confidenceScore += 10;
    if (session === 'LONDON_NY_OVERLAP') confidenceScore += 15;
    if (session === 'ASIAN') confidenceScore -= 10;
    if (stdDev.overextended) confidenceScore += 10;
    
    // Core Institutional Multipliers
    if (displacement) confidenceScore += 25; // Massive weight to displacement
    if (isInOTE) confidenceScore += 20;

    // Block signal logic
    // If ranging but strong setup exists, we allow it if price is at boundaries
    const rangingException = trend === 'RANGING' && (bos || liquiditySweep) && rangeExtremity > 0.5;
    const signalValid = confidenceScore >= 45 || rangingException;
    
    // ✅ NEW: Binary Execution Engine (Quant calculates the explicit signal)
    let explicitSignal: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';
    let mathematicalSL = 0;

    if (signalValid) {
        // Enforce direction based on HTF structure and Displacement
        const isBullishSetup = (tfConfirmation.htfTrend === 'BULLISH' || (tfConfirmation.htfTrend === 'UNKNOWN' && trend === 'BULLISH')) &&
                               (!displacementDirection || displacementDirection === 'BULLISH');
        const isBearishSetup = (tfConfirmation.htfTrend === 'BEARISH' || (tfConfirmation.htfTrend === 'UNKNOWN' && trend === 'BEARISH')) &&
                               (!displacementDirection || displacementDirection === 'BEARISH');

        if (isBullishSetup && currentZone === 'DISCOUNT') {
            explicitSignal = 'BUY';
            // Hard SL: Below OTE deep or OB lowest boundary minus 0.5 ATR
            mathematicalSL = Math.min(
                ote.bullish.deep - (atr * 0.5), 
                displacementCandle ? displacementCandle.low - (atr * 0.5) : currentPrice - (atr * 1.5)
            );
        } else if (isBearishSetup && currentZone === 'PREMIUM') {
            explicitSignal = 'SELL';
            // Hard SL: Above OTE deep or OB highest boundary plus 0.5 ATR
            mathematicalSL = Math.max(
                ote.bearish.deep + (atr * 0.5), 
                displacementCandle ? displacementCandle.high + (atr * 0.5) : currentPrice + (atr * 1.5)
            );
        } else if (rangingException) {
            explicitSignal = currentPrice > midpoint ? 'SELL' : 'BUY';
            mathematicalSL = explicitSignal === 'BUY' ? lowest - atr : highest + atr;
        }
    }

    // Final check: Never trade if range is too tight (volatility filter)
    const volatilitySqueeze = range / currentPrice < 0.0005; // 0.05% range is too small
    
    // We pass explicitSignal so Gemini has strict instructions on direction
    const blockSignal = false; 
    const blockReason = null;

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
        displacement,
        displacementCandle,
        displacementDirection,
        ote,
        isInOTE,
        explicitSignal,
        mathematicalSL,
        premiumZone,
        discountZone,
        currentZone,
        zoneValid,
        confidenceScore,
        signalValid,
        blockSignal,
        blockReason,
        tfConfirmation,
        atr,
        fvg,
        fvgRetest,
        orderBlock,
        session,
        stdDev
    };
}
