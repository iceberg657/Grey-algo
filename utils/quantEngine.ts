export interface OHLC {
    epoch: number;
    open: number;
    high: number;
    low: number;
    close: number;
    tick_volume?: number;
}

export interface SwingPoint {
    index: number;
    price: number;
    type: 'HIGH' | 'LOW';
}

export interface OrderBlock {
    type: 'BULLISH' | 'BEARISH';
    top: number;
    bottom: number;
    index: number;
    mitigated: boolean;
}

export interface HTFRange {
    rangeHigh: number;
    rangeLow: number;
    range: number;
    equilibrium: number;
    premiumZone: { upper: number; lower: number };
    discountZone: { upper: number; lower: number };
    deepBuyZone: { upper: number; lower: number };   // 78.6% fib
    deepSellZone: { upper: number; lower: number };  // 21.4% fib
    extremeBuyOB: OrderBlock | null;
    extremeSellOB: OrderBlock | null;
}

export interface InstitutionalBOS {
    type: 'BULLISH' | 'BEARISH';
    confirmed: boolean;
    displacement: number;    // Ratio vs ATR
    bosCandle: OHLC;
    isInstitutional: boolean; // Body > 1.5x ATR + volume
    volumeConfirmed: boolean;
}

export interface OTELevels {
    swingHigh: number;
    swingLow: number;
    impulseRange: number;
    ote62: number;   // 62% retracement
    ote705: number;  // 70.5% sweet spot
    ote79: number;   // 79% deep entry
    priceInOTE: boolean;
    oteZone: { upper: number; lower: number };
}

export interface SMCResult {
    // Trend
    trend: 'BULLISH' | 'BEARISH' | 'RANGING';
    ema50: number;
    ema200: number;
    rsi: number;

    // Swing Points
    swingHighs: SwingPoint[];
    swingLows: SwingPoint[];
    lastSwingHigh: number;
    lastSwingLow: number;

    // HTF BOS & Range
    htfBOS: InstitutionalBOS | null;
    htfRange: HTFRange | null;

    // LTF Institutional BOS
    ltfBOS: InstitutionalBOS | null;

    // ATR
    atr: number;

    // FVG
    fvg: { type: 'BULLISH' | 'BEARISH'; upper: number; lower: number } | null;

    // StdDev
    stdDev: {
        value: number;
        mean: number;
        upperBand: number;
        lowerBand: number;
        overextended: boolean;
    };

    // Killzone Session
    killzone: {
        multiplier: number;
        active: boolean;
        label: string;
    };

    // OTE & Confluence
    ote: OTELevels | null;
    oteOBConfluence: { classA: boolean; reason: string } | null;

    // RR Check
    rrCheck: { valid: boolean; ratio: number; reason: string } | null;

    // Zone
    currentZone: 'PREMIUM' | 'DISCOUNT' | 'EQUILIBRIUM';
    zoneValid: boolean;
    currentPrice: number;

    // 3TF Confirmation
    tfConfirmation: {
        entryTrend: string;
        confirmTrend: string;
        htfTrend: string;
        allAligned: boolean;
    };

    // Signal Decision
    institutionalSignal: {
        signal: 'BUY' | 'SELL';
        quality: 'A+' | 'A' | 'B' | 'C' | 'D';
        entry: number;
        stopLoss: number;
        tp1: number;
        tp2: number;
        tp3: number;
        reason: string;
        slBasis: string;
        tpBasis: string;
    } | null;

    // Confidence
    confidenceScore: number;
    normalizedScore: number;
    signalStrength: 'A+ SETUP' | 'VALID SETUP' | 'WEAK SETUP' | 'NO TRADE';
    blockSignal: boolean;
    blockReason: string | null;
}

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

function calcEMA(data: number[], period: number): number {
    if (!data.length) return 0;
    const k = 2 / (period + 1);
    let ema = data[0];
    for (let i = 1; i < data.length; i++) {
        ema = data[i] * k + ema * (1 - k);
    }
    return ema;
}

function calcRSI(data: number[], period = 14): number {
    if (data.length <= period) return 50;
    let gains = 0, losses = 0;
    for (let i = 1; i <= period; i++) {
        const diff = data[i] - data[i - 1];
        if (diff > 0) gains += diff;
        else losses -= diff;
    }
    let avgGain = gains / period;
    let avgLoss = losses / period;
    for (let i = period + 1; i < data.length; i++) {
        const diff = data[i] - data[i - 1];
        avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period;
        avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period;
    }
    const rs = avgGain / (avgLoss || 1);
    return 100 - 100 / (1 + rs);
}

function calcATR(candles: OHLC[], period = 14): number {
    if (candles.length < period) return 0;
    const trs = candles.map((c, i) => {
        if (i === 0) return c.high - c.low;
        const prev = candles[i - 1].close;
        return Math.max(
            c.high - c.low,
            Math.abs(c.high - prev),
            Math.abs(c.low - prev)
        );
    });
    return trs.slice(-period).reduce((a, b) => a + b, 0) / period;
}

function calcStdDev(closes: number[], period = 20, currentPrice: number) {
    if (closes.length < period) return { value: 0, mean: currentPrice, upperBand: currentPrice, lowerBand: currentPrice, overextended: false };
    const slice = closes.slice(-period);
    const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
    const variance = slice.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / slice.length;
    const stddev = Math.sqrt(variance);
    return {
        value: stddev,
        mean,
        upperBand: mean + stddev * 2,
        lowerBand: mean - stddev * 2,
        overextended:
            currentPrice > mean + stddev * 2 ||
            currentPrice < mean - stddev * 2
    };
}

const getKillzoneMultiplier = (hour: number): { multiplier: number, active: boolean, label: string } => {
    if (hour >= 7 && hour < 11)  return { multiplier: 1.0, active: true,  label: 'London Killzone ✅' };
    if (hour >= 12 && hour < 16) return { multiplier: 1.0, active: true,  label: 'New York Killzone ✅' };
    if (hour >= 11 && hour < 12) return { multiplier: 1.2, active: true,  label: 'London/NY Overlap 🔥' };
    if (hour >= 0 && hour < 7)   return { multiplier: 0.5, active: false, label: 'Asian Session ⚠️' };
    return { multiplier: 0.7, active: false, label: 'Off Session ⚠️' };
};

const calcAvgVolume = (candles: OHLC[], period = 20): number => {
    const vols = candles.slice(-period).map((c: any) => c.tick_volume || 0);
    return vols.reduce((a, b) => a + b, 0) / period;
};

// ─────────────────────────────────────────
// SWING POINT DETECTION
// ─────────────────────────────────────────
function detectSwings(candles: OHLC[], N = 3): {
    swingHighs: SwingPoint[];
    swingLows: SwingPoint[];
} {
    const swingHighs: SwingPoint[] = [];
    const swingLows: SwingPoint[]  = [];

    if (candles.length < N * 2 + 1) return { swingHighs, swingLows };

    for (let i = N; i < candles.length - N; i++) {
        const c = candles[i];

        // Swing High
        const leftHighs  = candles.slice(i - N, i).map(x => x.high);
        const rightHighs = candles.slice(i + 1, i + N + 1).map(x => x.high);
        if (c.high > Math.max(...leftHighs) && c.high > Math.max(...rightHighs)) {
            swingHighs.push({ index: i, price: c.high, type: 'HIGH' });
        }

        // Swing Low
        const leftLows  = candles.slice(i - N, i).map(x => x.low);
        const rightLows = candles.slice(i + 1, i + N + 1).map(x => x.low);
        if (c.low < Math.min(...leftLows) && c.low < Math.min(...rightLows)) {
            swingLows.push({ index: i, price: c.low, type: 'LOW' });
        }
    }

    return { swingHighs, swingLows };
}

// ─────────────────────────────────────────
// BOS DETECTION
// ─────────────────────────────────────────
function detectBOS(
    candles: OHLC[],
    swingHighs: SwingPoint[],
    swingLows: SwingPoint[],
    atr: number
): InstitutionalBOS | null {
    if (!swingHighs.length || !swingLows.length || candles.length < 2) return null;

    const current = candles[candles.length - 1];
    const lastSwingHigh = swingHighs[swingHighs.length - 1].price;
    const lastSwingLow  = swingLows[swingLows.length - 1].price;

    // Body size of current candle
    const body = Math.abs(current.close - current.open);

    const avgVol = calcAvgVolume(candles);
    const candleVol = current.tick_volume || 0;
    const volumeConfirmed = avgVol > 0 ? candleVol >= avgVol * 1.5 : true;

    // Institutional check: body > 1.5x ATR + Volume confirmation
    const isInstitutional = body >= atr * 1.5 && volumeConfirmed;
    const displacement    = body / (atr || 1);

    // Bullish BOS
    if (current.close > lastSwingHigh) {
        return {
            type: 'BULLISH',
            confirmed: true,
            displacement,
            bosCandle: current,
            isInstitutional,
            volumeConfirmed
        };
    }

    // Bearish BOS
    if (current.close < lastSwingLow) {
        return {
            type: 'BEARISH',
            confirmed: true,
            displacement,
            bosCandle: current,
            isInstitutional,
            volumeConfirmed
        };
    }

    return null;
}

// ─────────────────────────────────────────
// HTF RANGE MAPPING
// ─────────────────────────────────────────
function mapHTFRange(
    candles: OHLC[],
    swingHighs: SwingPoint[],
    swingLows: SwingPoint[],
    bosTrend: 'BULLISH' | 'BEARISH'
): HTFRange | null {
    if (!swingHighs.length || !swingLows.length) return null;

    const rangeHigh = swingHighs[swingHighs.length - 1].price;
    const rangeLow  = swingLows[swingLows.length - 1].price;
    const range     = Math.abs(rangeHigh - rangeLow);

    if (range <= 0) return null;

    const equilibrium = rangeLow + range * 0.5;

    const premiumZone  = { upper: rangeHigh, lower: equilibrium };
    const discountZone = { upper: equilibrium, lower: rangeLow };

    const deepBuyZone  = { upper: rangeHigh - range * 0.705, lower: rangeLow };
    const deepSellZone = { upper: rangeHigh, lower: rangeLow + range * 0.705 };

    let extremeBuyOB:  OrderBlock | null = null;
    let extremeSellOB: OrderBlock | null = null;
    const lookback = candles.slice(-30);

    if (bosTrend === 'BULLISH') {
        for (let i = lookback.length - 2; i >= 0; i--) {
            const c = lookback[i];
            const isBearish = c.close < c.open;
            const inDiscount = c.low <= equilibrium;
            if (isBearish && inDiscount) {
                extremeBuyOB = {
                    type: 'BULLISH',
                    top: c.open,
                    bottom: c.low,
                    index: i,
                    mitigated: false
                };
                break;
            }
        }
    }

    if (bosTrend === 'BEARISH') {
        for (let i = lookback.length - 2; i >= 0; i--) {
            const c = lookback[i];
            const isBullish = c.close > c.open;
            const inPremium = c.high >= equilibrium;
            if (isBullish && inPremium) {
                extremeSellOB = {
                    type: 'BEARISH',
                    top: c.high,
                    bottom: c.open,
                    index: i,
                    mitigated: false
                };
                break;
            }
        }
    }

    const currentPrice = candles[candles.length - 1].close;
    if (extremeBuyOB) extremeBuyOB.mitigated = currentPrice >= extremeBuyOB.bottom && currentPrice <= extremeBuyOB.top;
    if (extremeSellOB) extremeSellOB.mitigated = currentPrice >= extremeSellOB.bottom && currentPrice <= extremeSellOB.top;

    return {
        rangeHigh,
        rangeLow,
        range,
        equilibrium,
        premiumZone,
        discountZone,
        deepBuyZone,
        deepSellZone,
        extremeBuyOB,
        extremeSellOB
    };
}

// ─────────────────────────────────────────
// FVG & OTE
// ─────────────────────────────────────────
function detectFVG(candles: OHLC[]) {
    if (candles.length < 3) return null;
    const c1 = candles[candles.length - 3];
    const c3 = candles[candles.length - 1];

    if (c1.high < c3.low) {
        return { type: 'BULLISH' as const, upper: c3.low, lower: c1.high, midpoint: (c3.low + c1.high) / 2 };
    }
    if (c1.low > c3.high) {
        return { type: 'BEARISH' as const, upper: c1.low, lower: c3.high, midpoint: (c1.low + c3.high) / 2 };
    }
    return null;
}

const calcOTE = (swingHigh: number, swingLow: number, currentPrice: number, direction: 'BULLISH' | 'BEARISH'): OTELevels => {
    const impulseRange = swingHigh - swingLow;

    if (direction === 'BULLISH') {
        const ote62  = swingHigh - impulseRange * 0.62;
        const ote705 = swingHigh - impulseRange * 0.705;
        const ote79  = swingHigh - impulseRange * 0.79;

        return {
            swingHigh, swingLow, impulseRange, ote62, ote705, ote79,
            priceInOTE: currentPrice <= ote62 && currentPrice >= ote79,
            oteZone: { upper: ote62, lower: ote79 }
        };
    } else {
        const ote62  = swingLow + impulseRange * 0.62;
        const ote705 = swingLow + impulseRange * 0.705;
        const ote79  = swingLow + impulseRange * 0.79;

        return {
            swingHigh, swingLow, impulseRange, ote62, ote705, ote79,
            priceInOTE: currentPrice >= ote62 && currentPrice <= ote79,
            oteZone: { upper: ote79, lower: ote62 }
        };
    }
};

const checkOTEOrderBlockConfluence = (ote: OTELevels, orderBlock: OrderBlock | null): { classA: boolean; reason: string } => {
    if (!orderBlock) return { classA: false, reason: 'No Order Block detected' };

    const ote705InsideOB = ote.ote705 >= orderBlock.bottom && ote.ote705 <= orderBlock.top;
    const oteOverlapsOB = ote.oteZone.lower <= orderBlock.top && ote.oteZone.upper >= orderBlock.bottom;

    if (ote705InsideOB) return { classA: true, reason: `🏆 CLASS A: OTE 70.5% sweet spot (${ote.ote705.toFixed(5)}) confirmed inside Order Block [${orderBlock.bottom} - ${orderBlock.top}]` };
    if (oteOverlapsOB) return { classA: true, reason: `✅ OTE zone overlaps Order Block — strong institutional confluence` };

    return { classA: false, reason: `OTE zone does not overlap OB` };
};

const validateRR = (entry: number, stopLoss: number, tp: number, minRR: number = 1.5): { valid: boolean; ratio: number; reason: string } => {
    const risk   = Math.abs(entry - stopLoss);
    const reward = Math.abs(tp - entry);
    const ratio  = reward / (risk || 1);

    return {
        valid: ratio >= minRR,
        ratio: parseFloat(ratio.toFixed(2)),
        reason: ratio >= minRR ? `RR ${ratio.toFixed(2)}:1 — valid setup` : `RR ${ratio.toFixed(2)}:1 — below minimum ${minRR}:1 — setup discarded`
    };
};

// ─────────────────────────────────────────
// MASTER FUNCTION: analyzeSMC
// ─────────────────────────────────────────
export function analyzeSMC(candles: OHLC[], confirmCandles?: OHLC[], htfCandles?: OHLC[]): SMCResult | null {
    if (!candles || candles.length < 50) return null;

    const closes = candles.map(c => c.close);
    const currentPrice = closes[closes.length - 1];

    const ema50  = calcEMA(closes, 50);
    const ema200 = calcEMA(closes, 200);
    const rsi    = calcRSI(closes);
    const atr    = calcATR(candles);
    const stdDev = calcStdDev(closes, 20, currentPrice);
    
    // Killzone Setup
    const currentHour = new Date().getUTCHours();
    const killzone = getKillzoneMultiplier(currentHour);
    
    const fvg    = detectFVG(candles);

    const trend = ema50 > ema200 && currentPrice > ema50 ? 'BULLISH' :
                  ema50 < ema200 && currentPrice < ema50 ? 'BEARISH' : 'RANGING';

    const { swingHighs, swingLows } = detectSwings(candles, 3);
    const lastSwingHigh = swingHighs.length ? swingHighs[swingHighs.length - 1].price : currentPrice;
    const lastSwingLow  = swingLows.length  ? swingLows[swingLows.length - 1].price  : currentPrice;

    const ltfBOS = detectBOS(candles, swingHighs, swingLows, atr);

    const htfTrend = 'UNKNOWN'; // Will override if htfCandles available
    let htfBOS: InstitutionalBOS | null = null;
    let htfRange: HTFRange | null = null;

    // Use entry timeframe HTF proxy if higher timeframes not provided
    const proxyHtfCandles = htfCandles && htfCandles.length > 50 ? htfCandles : candles;
    const htfSwings = detectSwings(proxyHtfCandles, 5);
    htfBOS = detectBOS(proxyHtfCandles, htfSwings.swingHighs, htfSwings.swingLows, atr);
    if (htfBOS) {
        htfRange = mapHTFRange(proxyHtfCandles, htfSwings.swingHighs, htfSwings.swingLows, htfBOS.type);
    }

    const currentZone = htfRange ? (currentPrice > htfRange.equilibrium ? 'PREMIUM' : 'DISCOUNT') : 'EQUILIBRIUM';
    const zoneValid = trend === 'BULLISH' ? currentZone === 'DISCOUNT' : trend === 'BEARISH' ? currentZone === 'PREMIUM' : true;

    // Compute OTE & Confluence
    let ote: OTELevels | null = null;
    let oteOBConfluence: { classA: boolean; reason: string } | null = null;
    if (htfBOS && htfRange) {
        ote = calcOTE(htfRange.rangeHigh, htfRange.rangeLow, currentPrice, htfBOS.type);
        const extremeOB = htfBOS.type === 'BULLISH' ? htfRange.extremeBuyOB : htfRange.extremeSellOB;
        oteOBConfluence = checkOTEOrderBlockConfluence(ote, extremeOB);
    }

    const tfConfirmation = {
        entryTrend: trend,
        confirmTrend: confirmCandles ? (calcEMA(confirmCandles.map(c=>c.close), 50) > calcEMA(confirmCandles.map(c=>c.close), 200) ? 'BULLISH' : 'BEARISH') : 'UNKNOWN',
        htfTrend: htfCandles ? (calcEMA(htfCandles.map(c=>c.close), 50) > calcEMA(htfCandles.map(c=>c.close), 200) ? 'BULLISH' : 'BEARISH') : 'UNKNOWN',
        allAligned: false
    };

    let signal: 'BUY' | 'SELL' = currentPrice > ema200 ? 'BUY' : 'SELL';
    let quality: 'A+' | 'A' | 'B' | 'C' | 'D' = 'D';
    let reason = 'Trend assumption based on EMA200 due to lack of class-A setup';
    let slBasis = 'ATR buffer';
    let tpBasis = 'TP1: 1:2 RR | TP2: Equilibrium';
    let stopLoss = signal === 'BUY' ? currentPrice - (atr * 1.5) : currentPrice + (atr * 1.5);
    const riskInit = Math.abs(currentPrice - stopLoss);
    let tp1 = signal === 'BUY' ? currentPrice + (riskInit * 2) : currentPrice - (riskInit * 2);
    let tp2 = htfRange ? htfRange.equilibrium : tp1;
    let tp3 = signal === 'BUY' ? (htfRange ? htfRange.rangeHigh : currentPrice + (riskInit * 4)) : (htfRange ? htfRange.rangeLow : currentPrice - (riskInit * 4));

    if (htfBOS && htfRange) {
        const inDiscount   = currentPrice <= htfRange.discountZone.upper;
        const inPremium    = currentPrice >= htfRange.premiumZone.lower;
        const atDeepBuy    = currentPrice <= htfRange.deepBuyZone.upper;
        const atDeepSell   = currentPrice >= htfRange.deepSellZone.lower;
        const atBuyOB      = htfRange.extremeBuyOB?.mitigated || false;
        const atSellOB     = htfRange.extremeSellOB?.mitigated || false;
        const ltfBullish   = ltfBOS?.type === 'BULLISH' && ltfBOS?.isInstitutional;
        const ltfBearish   = ltfBOS?.type === 'BEARISH' && ltfBOS?.isInstitutional;

        if (htfBOS.type === 'BULLISH' && (inDiscount || atDeepBuy || atBuyOB) && ltfBullish) {
            signal = 'BUY';
            const obBottom = htfRange.extremeBuyOB?.bottom || htfRange.discountZone.lower;
            stopLoss = parseFloat((obBottom - atr * 0.5).toFixed(5));
            const r = currentPrice - stopLoss;
            tp1 = currentPrice + r * 2.0; tp2 = htfRange.equilibrium; tp3 = htfRange.rangeHigh;
            quality = oteOBConfluence?.classA && ote?.priceInOTE ? 'A+' : 'A';
            reason = `4H Bullish BOS confirmed. Price in ${atDeepBuy ? 'deep discount' : 'discount zone'}. LTF displacement confirmed. ${oteOBConfluence?.reason || ''}`;
            slBasis = `Outside ${atBuyOB ? 'extreme buy OB' : 'discount zone'} with 0.5x ATR buffer`;
        } else if (htfBOS.type === 'BEARISH' && (inPremium || atDeepSell || atSellOB) && ltfBearish) {
            signal = 'SELL';
            const obTop = htfRange.extremeSellOB?.top || htfRange.premiumZone.upper;
            stopLoss = parseFloat((obTop + atr * 0.5).toFixed(5));
            const r = stopLoss - currentPrice;
            tp1 = currentPrice - r * 2.0; tp2 = htfRange.equilibrium; tp3 = htfRange.rangeLow;
            quality = oteOBConfluence?.classA && ote?.priceInOTE ? 'A+' : 'A';
            reason = `4H Bearish BOS confirmed. Price in ${atDeepSell ? 'deep premium' : 'premium zone'}. LTF displacement confirmed. ${oteOBConfluence?.reason || ''}`;
            slBasis = `Outside ${atSellOB ? 'extreme sell OB' : 'premium zone'} with 0.5x ATR buffer`;
        }
    }

    const rrCheck = validateRR(currentPrice, stopLoss, tp1, 1.5);
    
    let confidenceScore = 50 * killzone.multiplier;
    if (quality === 'A+') confidenceScore += 45;
    if (quality === 'A') confidenceScore += 30;
    if (ote?.priceInOTE) confidenceScore += 15;
    if (rrCheck.valid) confidenceScore += 10;
    
    // Normalize safely to max 100
    const normalizedScore = Math.min(100, Math.floor(confidenceScore));
    let signalStrength: 'A+ SETUP' | 'VALID SETUP' | 'WEAK SETUP' | 'NO TRADE' = 'NO TRADE';
    if (normalizedScore >= 85) signalStrength = 'A+ SETUP';
    else if (normalizedScore >= 60) signalStrength = 'VALID SETUP';
    else if (normalizedScore >= 40) signalStrength = 'WEAK SETUP';

    return {
        trend, ema50, ema200, rsi,
        swingHighs, swingLows, lastSwingHigh, lastSwingLow,
        htfBOS, htfRange, ltfBOS, atr, fvg, stdDev, killzone,
        ote, oteOBConfluence, rrCheck, currentZone, zoneValid, currentPrice,
        tfConfirmation,
        institutionalSignal: { signal, quality, entry: currentPrice, stopLoss, tp1, tp2, tp3, reason, slBasis, tpBasis },
        confidenceScore, normalizedScore, signalStrength,
        blockSignal: !rrCheck.valid,
        blockReason: !rrCheck.valid ? rrCheck.reason : null
    };
}

