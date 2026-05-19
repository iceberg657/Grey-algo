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

export interface VolumeNode {
    priceLevel: number;
    volume: number;
    type: 'HVN' | 'LVN'; // High/Low Volume Node
}

export interface VolumeProfile {
    poc: number; // Price with highest volume
    vah: number; // Value Area High (70% volume above)
    val: number; // Value Area Low (70% volume below)
    hvns: VolumeNode[]; // High Volume Nodes
    lvns: VolumeNode[]; // Low Volume Nodes
    valueArea: { upper: number; lower: number };
}

export interface LiquidityLevel {
    price: number;
    type: 'BSL' | 'SSL'; // Buy-side or Sell-side liquidity
    strength: number; // How many equal highs/lows stacked
    swept: boolean; // Has price already taken it
    distanceFromPrice: number;
}

export interface LiquidityHeatmap {
    bslLevels: LiquidityLevel[]; // Sell-stop clusters above price
    sslLevels: LiquidityLevel[]; // Buy-stop clusters below price
    nearestBSL: LiquidityLevel | null;
    nearestSSL: LiquidityLevel | null;
    priceJustSweptBSL: boolean;
    priceJustSweptSSL: boolean;
    nextLiquidityTarget: LiquidityLevel | null;
}

export interface KillzoneResult {
    session: string;
    active: boolean;
    minutesIntoSession: number;
    minutesUntilOpen: number | null;
    multiplier: number;
    score: number; // Points for scoring model
    allowEntry: boolean;
    reason: string;
}

export interface CorrelationRule {
    asset: string;
    driver: string; // e.g. 'DXY', 'US10Y'
    relationship: 'INVERSE' | 'DIRECT';
    weight: number; // How strongly they correlate
}

export interface WeightedScore {
    smcStructure: number; // Max 30pts
    volumeProfile: number; // Max 20pts
    globalTrend: number; // Max 20pts
    newsSentiment: number; // Max 20pts
    sessionTiming: number; // Max 10pts
    correlationPenalty: number;
    liquiditySweepBonus: number;
    totalScore: number;        // Out of 100
    grade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'NO TRADE';
    riskTier: 'FULL' | 'HALF' | 'QUARTER' | 'SKIP';
    suggestedRiskPercent: number;
    breakdown: string[];
}

export interface OrderBlock {
    type: 'BULLISH_OB' | 'BEARISH_OB';
    upper: number;
    lower: number;
    mitigated: boolean;
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

// --- ADVANCED SNIPER MODULES ---

// 1. VOLUME PROFILE
export const calculateVolumeProfile = (
    candles: OHLC[],
    tickSize: number = 0.0001,
    valueAreaPercent: number = 0.70
): VolumeProfile => {
    // Step 1: Build price buckets
    const highest = Math.max(...candles.map(c => c.high));
    const lowest  = Math.min(...candles.map(c => c.low));
    const range   = highest - lowest;

    // Number of price levels (rows in profile)
    const numLevels = Math.min(Math.round(range / tickSize), 200);
    const levelSize = range / Math.max(numLevels, 1);

    // Initialize volume buckets
    const buckets: Map<number, number> = new Map();
    for (let i = 0; i <= numLevels; i++) {
        const price = parseFloat((lowest + i * levelSize).toFixed(5));
        buckets.set(price, 0);
    }

    // Step 2: Distribute volume across price levels
    candles.forEach(candle => {
        const candleRange = candle.high - candle.low;
        if (candleRange === 0) return;

        const vol = (candle as any).tick_volume || (candle as any).volume || 1;

        buckets.forEach((_, priceLevel) => {
            if (priceLevel >= candle.low && priceLevel <= candle.high) {
                // Weight: price proximity to candle body
                const bodyHigh = Math.max(candle.open, candle.close);
                const bodyLow  = Math.min(candle.open, candle.close);
                const inBody   = priceLevel >= bodyLow && priceLevel <= bodyHigh;

                // Body gets 70% of volume, wicks get 30%
                const weight = inBody ? 0.7 : 0.3;
                const levelsInBody = Math.max(
                    Math.round((bodyHigh - bodyLow) / levelSize), 1
                );
                const levelsInWick = Math.max(numLevels - levelsInBody, 1);

                const volPerLevel = inBody
                    ? (vol * weight) / levelsInBody
                    : (vol * (1 - weight)) / levelsInWick;

                buckets.set(priceLevel, (buckets.get(priceLevel) || 0) + volPerLevel);
            }
        });
    });

    // Step 3: Find POC (highest volume price)
    let poc = lowest;
    let maxVol = 0;
    buckets.forEach((vol, price) => {
        if (vol > maxVol) { maxVol = vol; poc = price; }
    });

    // Step 4: Value Area (70% of total volume around POC)
    const totalVolume = Array.from(buckets.values()).reduce((a, b) => a + b, 0);
    const targetVol   = totalVolume * valueAreaPercent;

    let vaVol = buckets.get(poc) || 0;
    let vah   = poc;
    let val   = poc;
    const sortedPrices = Array.from(buckets.keys()).sort((a, b) => a - b);
    const pocIndex      = sortedPrices.indexOf(poc);

    let upperIdx = pocIndex;
    let lowerIdx = pocIndex;

    while (vaVol < targetVol) {
        const upperVol = upperIdx + 1 < sortedPrices.length
            ? buckets.get(sortedPrices[upperIdx + 1]) || 0 : 0;
        const lowerVol = lowerIdx - 1 >= 0
            ? buckets.get(sortedPrices[lowerIdx - 1]) || 0 : 0;

        if (upperVol >= lowerVol && upperIdx + 1 < sortedPrices.length) {
            upperIdx++;
            vah   = sortedPrices[upperIdx];
            vaVol += upperVol;
        } else if (lowerIdx - 1 >= 0) {
            lowerIdx--;
            val   = sortedPrices[lowerIdx];
            vaVol += lowerVol;
        } else break;
    }

    // Step 5: Identify HVN and LVN
    const avgVol  = totalVolume / (buckets.size || 1);
    const hvns: VolumeNode[] = [];
    const lvns: VolumeNode[] = [];

    buckets.forEach((vol, price) => {
        if (vol >= avgVol * 1.5) {
            hvns.push({ priceLevel: price, volume: vol, type: 'HVN' });
        } else if (vol <= avgVol * 0.5) {
            lvns.push({ priceLevel: price, volume: vol, type: 'LVN' });
        }
    });

    return {
        poc,
        vah,
        val,
        hvns: hvns.sort((a, b) => b.volume - a.volume).slice(0, 5),
        lvns: lvns.sort((a, b) => a.volume - b.volume).slice(0, 5),
        valueArea: { upper: vah, lower: val }
    };
};

export const checkOBVolumeConfluence = (
    orderBlock: OrderBlock,
    volumeProfile: VolumeProfile,
    tolerance: number = 0.0005
): { aligned: boolean; score: number; reason: string } => {
    // Check POC alignment
    const obBottom = Math.min(orderBlock.upper, orderBlock.lower);
    const obTop = Math.max(orderBlock.upper, orderBlock.lower);

    const pocInOB = volumeProfile.poc >= obBottom - tolerance &&
                    volumeProfile.poc <= obTop + tolerance;

    // Check HVN alignment
    const hvnInOB = volumeProfile.hvns.some(hvn =>
        hvn.priceLevel >= obBottom - tolerance &&
        hvn.priceLevel <= obTop + tolerance
    );

    // Check Value Area alignment
    const vaOverlap =
        obBottom <= volumeProfile.vah &&
        obTop    >= volumeProfile.val;

    if (pocInOB) {
        return {
            aligned: true,
            score: 20, 
            reason: `POC (${volumeProfile.poc.toFixed(5)}) confirmed inside Order Block institutional volume cluster`
        };
    }
    if (hvnInOB) {
        return {
            aligned: true,
            score: 15,
            reason: `HVN aligned with Order Block strong volume support`
        };
    }
    if (vaOverlap) {
        return {
            aligned: true,
            score: 10,
            reason: `Order Block within Value Area (${volumeProfile.val.toFixed(5)} - ${volumeProfile.vah.toFixed(5)})`
        };
    }

    return { aligned: false, score: 0, reason: 'No volume confluence at Order Block' };
};

// 2. CROSS-ASSET CORRELATION
const CORRELATION_MAP: Record<string, CorrelationRule[]> = {
    'EURUSD': [{ asset: 'EURUSD', driver: 'DXY', relationship: 'INVERSE', weight: 0.85 }],
    'GBPUSD': [{ asset: 'GBPUSD', driver: 'DXY', relationship: 'INVERSE', weight: 0.80 }],
    'AUDUSD': [{ asset: 'AUDUSD', driver: 'DXY', relationship: 'INVERSE', weight: 0.75 }],
    'NZDUSD': [{ asset: 'NZDUSD', driver: 'DXY', relationship: 'INVERSE', weight: 0.75 }],
    'USDJPY': [{ asset: 'USDJPY', driver: 'DXY', relationship: 'DIRECT', weight: 0.80 }],
    'USDCHF': [{ asset: 'USDCHF', driver: 'DXY', relationship: 'DIRECT', weight: 0.80 }],
    'XAUUSD': [{ asset: 'XAUUSD', driver: 'DXY', relationship: 'INVERSE', weight: 0.70 }],
    'OTC_DJI': [{ asset: 'OTC_DJI', driver: 'US10Y', relationship: 'INVERSE', weight: 0.65 }],
    'OTC_NDX': [{ asset: 'OTC_NDX', driver: 'US10Y', relationship: 'INVERSE', weight: 0.70 }],
};

export const calculatePearsonCorrelation = (
    seriesA: number[],
    seriesB: number[]
): number => {
    const n = Math.min(seriesA.length, seriesB.length);
    if (n < 10) return 0;

    const sliceA = seriesA.slice(-n);
    const sliceB = seriesB.slice(-n);

    const meanA = sliceA.reduce((a, b) => a + b, 0) / n;
    const meanB = sliceB.reduce((a, b) => a + b, 0) / n;

    let numerator   = 0;
    let denomA      = 0;
    let denomB      = 0;

    for (let i = 0; i < n; i++) {
        const diffA  = sliceA[i] - meanA;
        const diffB  = sliceB[i] - meanB;
        numerator   += diffA * diffB;
        denomA      += diffA * diffA;
        denomB      += diffB * diffB;
    }

    const denominator = Math.sqrt(denomA * denomB);
    return denominator === 0 ? 0 : numerator / denominator;
};

export const getKillzoneScore = (): KillzoneResult => {
    const now = new Date();
    const hour = now.getUTCHours();
    const minute = now.getUTCMinutes();

    // London Open (07:00 - 09:00 UTC) 
    if (hour >= 7 && hour < 9) {
        const minutesIn = (hour - 7) * 60 + minute;
        return {
            session: 'LONDON_OPEN',
            active: true,
            minutesIntoSession: minutesIn,
            minutesUntilOpen: null,
            multiplier: 1.2,
            score: 10,
            allowEntry: true,
            reason: `London Open Killzone ${minutesIn}min in. Prime institutional activity.`
        };
    }

    // London/NY Overlap (11:00 - 12:00 UTC)
    if (hour >= 11 && hour < 12) {
        return {
            session: 'LONDON_NY_OVERLAP',
            active: true,
            minutesIntoSession: (hour - 11) * 60 + minute,
            minutesUntilOpen: null,
            multiplier: 1.3,
            score: 10,
            allowEntry: true,
            reason: 'London/NY Overlap Highest institutional volume of the day.'
        };
    }

    // New York Open (12:00 - 14:00 UTC)
    if (hour >= 12 && hour < 14) {
        const minutesIn = (hour - 12) * 10 + minute;
        return {
            session: 'NY_OPEN',
            active: true,
            minutesIntoSession: minutesIn,
            minutesUntilOpen: null,
            multiplier: 1.2,
            score: 10,
            allowEntry: true,
            reason: `New York Open Killzone ${minutesIn}min in. High probability zone.`
        };
    }

    // London Peak (09:00 - 11:00 UTC)
    if (hour >= 9 && hour < 11) {
        return {
            session: 'LONDON_PEAK',
            active: true,
            minutesIntoSession: (hour - 9) * 60 + minute,
            minutesUntilOpen: null,
            multiplier: 1.0,
            score: 8,
            allowEntry: true,
            reason: 'London Peak Good volume, trend continuation phase.'
        };
    }

    if (hour >= 14 && hour < 16) {
        return {
            session: 'NY_PEAK',
            active: true,
            minutesIntoSession: (hour - 14) * 60 + minute,
            minutesUntilOpen: null,
            multiplier: 1.0,
            score: 8,
            allowEntry: true,
            reason: 'New York Peak Trend continuation, good for runners.'
        };
    }

    if (hour >= 0 && hour < 7) {
        const minutesUntilLondon = (7 - hour) * 60 - minute;
        return {
            session: 'ASIAN',
            active: false,
            minutesIntoSession: hour * 60 + minute,
            minutesUntilOpen: minutesUntilLondon,
            multiplier: 0.5,
            score: 2,
            allowEntry: false, 
            reason: `Asian Session Low institutional volume. London opens in ${minutesUntilLondon}min.`
        };
    }

    const minutesUntilAsian = hour >= 16 ? (24 - hour) * 60 - minute : 0;
    const minutesUntilLondon = minutesUntilAsian + 7 * 60;

    return {
        session: 'DEAD_ZONE',
        active: false,
        minutesIntoSession: (hour - 16) * 60 + minute,
        minutesUntilOpen: minutesUntilLondon,
        multiplier: 0.3,
        score: 0,
        allowEntry: false,
        reason: `Dead Zone Institutional algorithms offline. London opens in ~${Math.round(minutesUntilLondon / 60)}hrs.`
    };
};

export const buildLiquidityHeatmap = (
    candles: OHLC[],
    currentPrice: number,
    tolerance: number = 0.0003
): LiquidityHeatmap => {
    const bslLevels: LiquidityLevel[] = [];
    const sslLevels: LiquidityLevel[] = [];

    const highs = candles.map(c => c.high);
    const lows  = candles.map(c => c.low);

    const groupLevels = (prices: number[], type: 'BSL' | 'SSL') => {
        const clusters: Map<number, number> = new Map();

        prices.forEach(price => {
            let foundCluster = false;
            clusters.forEach((count, level) => {
                if (Math.abs(price - level) <= tolerance) {
                    clusters.set(level, count + 1);
                    foundCluster = true;
                }
            });
            if (!foundCluster) clusters.set(price, 1);
        });

        clusters.forEach((strength, price) => {
            if (strength >= 2) {
                const swept = type === 'BSL'
                    ? currentPrice > price   
                    : currentPrice < price;  

                const level: LiquidityLevel = {
                    price,
                    type,
                    strength,
                    swept,
                    distanceFromPrice: Math.abs(currentPrice - price)
                };

                if (type === 'BSL') bslLevels.push(level);
                else                sslLevels.push(level);
            }
        });
    };

    groupLevels(highs, 'BSL');
    groupLevels(lows, 'SSL');

    bslLevels.sort((a, b) => a.distanceFromPrice - b.distanceFromPrice);
    sslLevels.sort((a, b) => a.distanceFromPrice - b.distanceFromPrice);

    const recentCandles  = candles.slice(-3);
    const recentHighs    = recentCandles.map(c => c.high);
    const recentLows     = recentCandles.map(c => c.low);
    const recentClose    = candles[candles.length - 1].close;

    const priceJustSweptBSL = bslLevels.some(level =>
        Math.max(...recentHighs) > level.price &&
        recentClose < level.price
    );

    const priceJustSweptSSL = sslLevels.some(level =>
        Math.min(...recentLows) < level.price &&
        recentClose > level.price
    );

    const unsweptBSL = bslLevels.filter(l => !l.swept && l.price > currentPrice);
    const unsweptSSL = sslLevels.filter(l => !l.swept && l.price < currentPrice);

    return {
        bslLevels:          bslLevels.slice(0, 5),
        sslLevels:          sslLevels.slice(0, 5),
        nearestBSL:         unsweptBSL[0] || null,
        nearestSSL:         unsweptSSL[0] || null,
        priceJustSweptBSL,
        priceJustSweptSSL,
        nextLiquidityTarget: priceJustSweptSSL
            ? unsweptBSL[0] || null  
            : priceJustSweptBSL
            ? unsweptSSL[0] || null  
            : null
    };
};

export const calculateWeightedScore = (
    smcFactors: {
        htfBOS: boolean,
        bosInstitutional: boolean,
        zoneValid: boolean,
        otePrecise: boolean,
        obConfluence: boolean
    },
    vpScore: number,
    trendAligned: boolean,
    correlationScore: number,
    correlationPenalty: number,
    newsRiskLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'CLEAR',
    killzoneScore: number,
    liquiditySweptBonus: number
): WeightedScore => {
    const breakdown: string[] = [];

    // 1. SMC STRUCTURE (30 pts)
    let smcScore = 0;
    if (smcFactors.htfBOS)          { smcScore += 10; breakdown.push('HTF BOS confirmed +10'); }
    if (smcFactors.bosInstitutional){ smcScore += 8;  breakdown.push('Institutional displacement +8'); }
    if (smcFactors.zoneValid)       { smcScore += 7;  breakdown.push('Correct Premium/Discount zone +7'); }
    if (smcFactors.otePrecise)      { smcScore += 3;  breakdown.push('Price in OTE 70.5% zone +3'); }
    if (smcFactors.obConfluence)    { smcScore += 2;  breakdown.push('OB confluence +2'); }
    smcScore = Math.min(smcScore, 30);

    // 2. VOLUME PROFILE (20 pts)
    const volScore = Math.min(vpScore, 20);
    if (vpScore > 0) breakdown.push(`Volume Profile +${volScore}`);

    // 3. GLOBAL TREND / CORRELATION (20 pts)
    let trendScore = 0;
    if (trendAligned) { trendScore += 10; breakdown.push('3TF trend aligned +10'); }
    trendScore += Math.min(correlationScore, 10);
    if (correlationScore > 0) breakdown.push(`Correlation score +${Math.min(correlationScore, 10)}`);
    trendScore = Math.min(trendScore, 20);

    // 4. NEWS SENTIMENT (20 pts)
    let newsScore = 0;
    switch (newsRiskLevel) {
        case 'CLEAR':  newsScore = 20; breakdown.push('No news risk +20'); break;
        case 'LOW':    newsScore = 15; breakdown.push('Low news risk +15'); break;
        case 'MEDIUM': newsScore = 8;  breakdown.push('Medium news risk +8'); break;
        case 'HIGH':   newsScore = 0;  breakdown.push('HIGH NEWS RISK +0 ⚠️'); break;
    }

    // 5. SESSION TIMING (10 pts)
    const sessScore = Math.min(killzoneScore, 10);
    if (killzoneScore > 0) breakdown.push(`Session score +${sessScore}`);

    // CORRELATION PENALTY
    if (correlationPenalty > 0) {
        breakdown.push(`Correlation conflict -${correlationPenalty} ⚠️`);
    }

    // LIQUIDITY SWEEP BONUS
    if (liquiditySweptBonus > 0) {
        breakdown.push(`Liquidity sweep bonus +${liquiditySweptBonus} 🎯`);
    }

    const rawTotal = smcScore + volScore + trendScore + newsScore + sessScore + liquiditySweptBonus;
    const totalScore = Math.max(0, Math.min(rawTotal - correlationPenalty, 100));

    const grade =
        totalScore >= 90 ? 'A+' :
        totalScore >= 80 ? 'A'  :
        totalScore >= 75 ? 'B+' :
        totalScore >= 65 ? 'B'  :
        totalScore >= 50 ? 'C'  : 'NO TRADE';

    const riskTier =
        grade === 'A+' ? 'FULL'    :
        grade === 'A'  ? 'FULL'    :
        grade === 'B+' ? 'HALF'    :
        grade === 'B'  ? 'QUARTER' : 'SKIP';

    const suggestedRiskPercent =
        grade === 'A+' ? 2.0  :
        grade === 'A'  ? 1.0  :
        grade === 'B+' ? 0.5  :
        grade === 'B'  ? 0.25 :
        grade === 'C'  ? 0.1  : 0;

    return {
        smcStructure:        smcScore,
        volumeProfile:       volScore,
        globalTrend:         trendScore,
        newsSentiment:       newsScore,
        sessionTiming:       sessScore,
        correlationPenalty,
        liquiditySweepBonus: liquiditySweptBonus,
        totalScore,
        grade,
        riskTier,
        suggestedRiskPercent,
        breakdown
    };
};

// Master SMC Analysis
export function analyzeSMC(candles: any[], confirmCandles?: any[], htfCandles?: any[], assetSymbol: string = 'UNKNOWN') {
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

    // --- NEW SNIPER INTEGRATIONS ---
    
    // 1. Volume Profile
    // Heuristic for tick size: 0.0001 for Forex, larger for indices/crypto
    let tickSize = 0.0001;
    if (currentPrice > 1000) tickSize = 0.1;
    else if (currentPrice > 100) tickSize = 0.01;
    
    const volumeProfile = calculateVolumeProfile(candles, tickSize);
    
    // 2. Liquidity Heatmap
    const liquidityHeatmap = buildLiquidityHeatmap(candles, currentPrice);
    
    // 3. Session Killzone
    const killzone = getKillzoneScore();
    
    // 4. OB Volume Confluence
    let obVolConfluence = { aligned: false, score: 0, reason: 'No OB detected' };
    if (orderBlock) {
        obVolConfluence = checkOBVolumeConfluence(orderBlock as any, volumeProfile);
    }

    // ✅ NEW: Binary Execution Engine (Quant calculates the explicit signal)
    let explicitSignal: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';
    let mathematicalSL = 0;

    // Performance Optimization for UK100/EUR indices
    const isLondonAsset = 
        assetSymbol.includes('UK100') || 
        assetSymbol.includes('FTSE') || 
        assetSymbol.includes('GER40') || 
        assetSymbol.includes('DAX') || 
        assetSymbol.includes('EUR');

    // Increase SL buffer for London assets during volatile sessions (Stop Hunting Protection)
    const slMultiplier = (isLondonAsset && (killzone.session.includes('LONDON'))) ? 1.0 : 0.5;

    // --- WEIGHTED SCORING MODEL ---
    const smcFactors = {
        htfBOS: tfConfirmation.allAligned && bos,
        bosInstitutional: displacement,
        zoneValid: zoneValid,
        otePrecise: isInOTE,
        obConfluence: !!orderBlock
    };

    const liquidityBonus = (liquidityHeatmap.priceJustSweptSSL && trend === 'BULLISH') || 
                          (liquidityHeatmap.priceJustSweptBSL && trend === 'BEARISH') ? 15 : 0;

    const weightedScore = calculateWeightedScore(
        smcFactors,
        obVolConfluence.score,
        tfConfirmation.allAligned,
        0, // Correlation Score (need driver data)
        0, // Correlation Penalty
        'CLEAR', // News Sentiment (need API)
        killzone.score,
        liquidityBonus
    );

    // Enforce direction based on HTF structure and Displacement
    const isBullishSetup = (tfConfirmation.htfTrend === 'BULLISH' || (tfConfirmation.htfTrend === 'UNKNOWN' && trend === 'BULLISH')) &&
                           (!displacementDirection || displacementDirection === 'BULLISH');
    const isBearishSetup = (tfConfirmation.htfTrend === 'BEARISH' || (tfConfirmation.htfTrend === 'UNKNOWN' && trend === 'BEARISH')) &&
                           (!displacementDirection || displacementDirection === 'BEARISH');

    const signalValid = weightedScore.totalScore >= 50;

    if (signalValid) {
        if (isBullishSetup && currentZone === 'DISCOUNT') {
            explicitSignal = 'BUY';
            mathematicalSL = Math.min(
                ote.bullish.deep - (atr * slMultiplier), 
                displacementCandle ? displacementCandle.low - (atr * slMultiplier) : currentPrice - (atr * 1.5)
            );
        } else if (isBearishSetup && currentZone === 'PREMIUM') {
            explicitSignal = 'SELL';
            mathematicalSL = Math.max(
                ote.bearish.deep + (atr * slMultiplier), 
                displacementCandle ? displacementCandle.high + (atr * slMultiplier) : currentPrice + (atr * 1.5)
            );
        }
    }

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
        confidenceScore: weightedScore.totalScore, // Map total score to confidence
        signalValid,
        tfConfirmation,
        atr,
        fvg,
        fvgRetest,
        orderBlock,
        session: killzone.session,
        killzone,
        stdDev,
        volumeProfile,
        liquidityHeatmap,
        weightedScore,
        obVolConfluence
    };
}
