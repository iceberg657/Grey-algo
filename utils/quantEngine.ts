import { calculateEMA, calculateRSI, findSwings } from './analyticsEngine';
import { calculateMarkovRegime, MarkovRegimeResult } from './markovEngine';
import { analyzeOrderflow, OrderflowMetrics, predictStopClusters, StopCluster, calculateL2OrderbookMetrics, L2Metrics, calculateSessionOpeningAnchors } from './orderflowEngine';
import { executeRiskOptimization, RiskOptimization } from './riskOptimizer';
import { predictNextLiquiditySweep, LiquidityPrediction } from './liquidityPrediction';
import { NeuralEngine, NeuralAnalysis } from '../services/neuralEngine';
import { MathEngine } from '../services/mathEngine';
import { calculateInstitutionalExecution, InstitutionalExecutionData } from './institutionalEngine';
import { KalmanFilter } from './kalmanFilter';
import { GaussianMixtureModel, LSTMMath, MarkovDecisionProcess, MSGARCH } from './advancedMath';
import { calculateGM11 } from './greyModel';

export function getAssetPrecision(symbol: string = ''): number {
    const sym = symbol.toUpperCase();
    if (sym.includes('BTC') || sym.includes('NAS') || sym.includes('SPX') || sym.includes('DJI') || sym.includes('US30') || sym.includes('US100') || sym.includes('US500') || sym.includes('GOLD') || sym.includes('XAU') || sym.includes('SILVER') || sym.includes('XAG') || sym.includes('BRENT') || sym.includes('WTI')) {
        return 2;
    }
    if (sym.includes('JPY')) return 3;
    if (sym.startsWith('BOOM') || sym.startsWith('CRAS') || sym.startsWith('STEP') || sym.startsWith('R_') || sym.startsWith('VOLATILITY') || sym.startsWith('1HZ') || sym.startsWith('STP') || sym.startsWith('RB_')) {
        if (sym.includes('STEP') || sym.includes('STP')) return 3;
        return 2;
    }
    return 5;
}

export function formatAssetPrice(price: number | string | undefined | null, symbol: string = ''): string {
    if (price === undefined || price === null || price === '') return 'N/A';
    const num = typeof price === 'number' ? price : parseFloat(String(price));
    if (isNaN(num)) return String(price);
    const prec = getAssetPrecision(symbol);
    return num.toFixed(prec);
}

export function roundAssetPrice(price: number, symbol: string = ''): number {
    if (price === undefined || price === null || isNaN(price)) return price;
    const prec = getAssetPrecision(symbol);
    const factor = Math.pow(10, prec);
    return Math.round(price * factor) / factor;
}

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
    direction?: 'BUY' | 'SELL';
    smcStructure: number; // Max 35pts
    volumeProfile: number; // Max 25pts
    globalTrend: number; // Max 25pts
    newsSentiment: number; // Max 10pts
    sessionTiming: number; // Max 5pts
    correlationPenalty: number;
    liquiditySweepBonus: number;
    totalScore: number;        // Out of 100 (Deterministic Quant Engine Confidence)
    grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'NO TRADE';
    riskTier: 'FULL' | 'HALF' | 'QUARTER' | 'SKIP';
    suggestedRiskPercent: number;
    isHighProbability: boolean; // true if totalScore >= 80
    breakdown: string[];
}

export interface OrderBlock {
    type: 'BULLISH_OB' | 'BEARISH_OB';
    upper: number;
    lower: number;
    mitigated: boolean;
}


// --- ADVANCED SNIPER MODULES ---

// 1. VOLUME PROFILE
export interface QuantMathematics {
    zScoreDispersion: number;
    hurstExponentApproximation: number;
    regimeProbability: 'TRENDING' | 'MEAN_REVERTING' | 'RANDOM_WALK';
    fakeoutProbability: number; // 0 to 1
    statisticalNoiseRatio: number;
    kalmanEstimate?: number;
    gmmRegime?: number;
    msGarchVol?: number;
    lstmState?: number;
}

/**
 * Institutional Lead-Lag Context
 */
export interface LeadLagContext {
    correlation: number;
    divergenceDetected: boolean; // SMT Divergence
    leadingBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

export const calculateQuantMathematics = (
    candles: OHLC[],
    depth?: { bids: [number, number][], asks: [number, number][] } | null
): QuantMathematics => {
    if (candles.length < 50) return {
        zScoreDispersion: 0, hurstExponentApproximation: 0.5, regimeProbability: 'RANDOM_WALK', fakeoutProbability: 0.5, statisticalNoiseRatio: 1
    };

    const closes = candles.map(c => c.close);
    const returns = [];
    for (let i = 1; i < closes.length; i++) {
        returns.push(closes[i] - closes[i - 1]);
    }

    // 1. Kalman Filter implementation applied to price
    const kalman = new KalmanFilter(0.01, 0.001, 1, 1);
    let kalmanEstimate = closes[0];
    closes.forEach((price, i) => {
        kalmanEstimate = kalman.filter(price, i === 0);
    });

    // 2. Gaussian Mixture Model for Returns Clustering
    const gmm = new GaussianMixtureModel(2);
    gmm.fit(returns);
    const gmmRegime = gmm.predict(returns[returns.length - 1]);

    // 3. LSTM mock step (Sequential memory on returns)
    const lstm = new LSTMMath();
    let lstmState = 0;
    returns.slice(-20).forEach(r => {
        lstmState = lstm.step(r);
    });

    // 4. MS-GARCH Volatility
    const msGarch = new MSGARCH();
    let msGarchVol = msGarch.predictVolatility(returns, gmmRegime as 0 | 1);

    const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    let variance = returns.reduce((acc, val) => acc + Math.pow(val - meanReturn, 2), 0) / returns.length;
    if (variance === 0) variance = 0.00000001;
    const stdDev = Math.sqrt(variance);

    const currentReturn = returns[returns.length - 1];
    const zScoreDispersion = (currentReturn - meanReturn) / stdDev;

    // Simplified Hurst Exponent Approximation (Rescaled Range approach subset)
    let cumulativeDeviations = 0;
    let maxCum = -Infinity;
    let minCum = Infinity;
    for (const r of returns) {
        cumulativeDeviations += (r - meanReturn);
        if (cumulativeDeviations > maxCum) maxCum = cumulativeDeviations;
        if (cumulativeDeviations < minCum) minCum = cumulativeDeviations;
    }
    const R = Math.max(maxCum - minCum, 0.0001);
    const hurstExponentApproximation = Math.log(R / stdDev) / Math.log(returns.length);

    let regimeProbability: 'TRENDING' | 'MEAN_REVERTING' | 'RANDOM_WALK' = 'RANDOM_WALK';
    if (hurstExponentApproximation > 0.6) regimeProbability = 'TRENDING';
    else if (hurstExponentApproximation < 0.4) regimeProbability = 'MEAN_REVERTING';

    const atr = Math.abs(currentReturn) * 1.5;
    const statisticalNoiseRatio = stdDev === 0 ? 1 : Math.min(1.0, atr / (stdDev * 3));

    // Fakeout probability increases when Z-Score is extremely high but Hurst shows Mean Reverting
    let fakeoutProbability = 0.1;
    if (Math.abs(zScoreDispersion) > 2.5 && regimeProbability === 'MEAN_REVERTING') {
        fakeoutProbability = 0.85; // High trap probability
    } else if (Math.abs(zScoreDispersion) > 2.0 && regimeProbability === 'RANDOM_WALK') {
        fakeoutProbability = 0.65;
    }

    // --- REAL-TIME LEVEL 2 FOREX DEPTH CALIBRATION ---
    if (depth && (depth.bids?.length || depth.asks?.length)) {
        const bids = depth.bids || [];
        const asks = depth.asks || [];
        const totalBids = bids.reduce((sum, b) => sum + (b[1] || 0), 0);
        const totalAsks = asks.reduce((sum, a) => sum + (a[1] || 0), 0);
        const totalL2Depth = totalBids + totalAsks;
        const currentPrice = closes[closes.length - 1];
        
        if (totalL2Depth > 0) {
            const l2Imbalance = (totalBids - totalAsks) / totalL2Depth; // -1 to +1
            
            // Adjust LSTM sequential memory state with real-time leading order book imbalance
            lstmState = lstmState * 0.7 + l2Imbalance * 0.3;
            
            // Refine GMM classification when there's an overwhelming orderbook bias
            if (Math.abs(l2Imbalance) > 0.4) {
                // Skew towards trending regime
                regimeProbability = 'TRENDING';
            }

            // Adjust fakeout probability based on actual Level 2 DOM imbalances
            const isBullishBreakout = zScoreDispersion > 1.5;
            const isBearishBreakout = zScoreDispersion < -1.5;
            
            if (isBullishBreakout) {
                if (l2Imbalance > 0.15) {
                    // Bids are supporting breakout, reduce trap risk
                    fakeoutProbability = Math.max(0.05, fakeoutProbability - 0.25);
                } else if (l2Imbalance < -0.15) {
                    // Asks holding a sell wall, high risk of fakeout rejection
                    fakeoutProbability = Math.min(0.95, fakeoutProbability + 0.3);
                }
            } else if (isBearishBreakout) {
                if (l2Imbalance < -0.15) {
                    // Asks are pushing breakdown, reduce trap risk
                    fakeoutProbability = Math.max(0.05, fakeoutProbability - 0.25);
                } else if (l2Imbalance > 0.15) {
                    // Bids holding a buy wall, high risk of fakeout rejection
                    fakeoutProbability = Math.min(0.95, fakeoutProbability + 0.3);
                }
            }
        }

        // Adjust MS-GARCH volatility based on spread widening (highly critical for Forex during news/rollover)
        if (bids.length > 0 && asks.length > 0) {
            const spread = Math.max(0, asks[0][0] - bids[0][0]);
            const avgSpreadHeuristic = currentPrice * 0.00015; // standard forex spread baseline ~1.5 pips
            if (spread > avgSpreadHeuristic * 2.0) {
                msGarchVol = (msGarchVol || 0.02) * 1.5; // Scale up volatility to handle tail risk
            }
        }
    }

    return { 
        zScoreDispersion, 
        hurstExponentApproximation, 
        regimeProbability, 
        fakeoutProbability, 
        statisticalNoiseRatio,
        kalmanEstimate,
        gmmRegime,
        msGarchVol,
        lstmState
    };
};

export const calculateVolumeProfile = (
    candles: OHLC[],
    tickSize: number = 0.0001,
    valueAreaPercent: number = 0.70
): VolumeProfile => {
    // Step 1: Build price buckets
    const highest = Math.max(...candles.map(c => c.high));
    const lowest = Math.min(...candles.map(c => c.low));
    const range = highest - lowest;

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
                const bodyLow = Math.min(candle.open, candle.close);
                const inBody = priceLevel >= bodyLow && priceLevel <= bodyHigh;

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
    const targetVol = totalVolume * valueAreaPercent;

    let vaVol = buckets.get(poc) || 0;
    let vah = poc;
    let val = poc;
    const sortedPrices = Array.from(buckets.keys()).sort((a, b) => a - b);
    const pocIndex = sortedPrices.indexOf(poc);

    let upperIdx = pocIndex;
    let lowerIdx = pocIndex;

    while (vaVol < targetVol) {
        const upperVol = upperIdx + 1 < sortedPrices.length
            ? buckets.get(sortedPrices[upperIdx + 1]) || 0 : 0;
        const lowerVol = lowerIdx - 1 >= 0
            ? buckets.get(sortedPrices[lowerIdx - 1]) || 0 : 0;

        if (upperVol >= lowerVol && upperIdx + 1 < sortedPrices.length) {
            upperIdx++;
            vah = sortedPrices[upperIdx];
            vaVol += upperVol;
        } else if (lowerIdx - 1 >= 0) {
            lowerIdx--;
            val = sortedPrices[lowerIdx];
            vaVol += lowerVol;
        } else break;
    }

    // Step 5: Identify HVN and LVN
    const avgVol = totalVolume / (buckets.size || 1);
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
        obTop >= volumeProfile.val;

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

    let numerator = 0;
    let denomA = 0;
    let denomB = 0;

    for (let i = 0; i < n; i++) {
        const diffA = sliceA[i] - meanA;
        const diffB = sliceB[i] - meanB;
        numerator += diffA * diffB;
        denomA += diffA * diffA;
        denomB += diffB * diffB;
    }

    const denominator = Math.sqrt(denomA * denomB);
    return denominator === 0 ? 0 : numerator / denominator;
};

export const getKillzoneScore = (): KillzoneResult => {
    const now = new Date();
    const hour = now.getUTCHours();
    const minute = now.getUTCMinutes();

    // London Open (06:00 - 09:00 UTC) 
    if (hour >= 6 && hour < 9) {
        const minutesIn = (hour - 6) * 60 + minute;
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
    const lows = candles.map(c => c.low);

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
                else sslLevels.push(level);
            }
        });
    };

    groupLevels(highs, 'BSL');
    groupLevels(lows, 'SSL');

    bslLevels.sort((a, b) => a.distanceFromPrice - b.distanceFromPrice);
    sslLevels.sort((a, b) => a.distanceFromPrice - b.distanceFromPrice);

    const recentCandles = candles.slice(-3);
    const recentHighs = recentCandles.map(c => c.high);
    const recentLows = recentCandles.map(c => c.low);
    const recentClose = candles[candles.length - 1].close;

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
        bslLevels: bslLevels.slice(0, 5),
        sslLevels: sslLevels.slice(0, 5),
        nearestBSL: unsweptBSL[0] || null,
        nearestSSL: unsweptSSL[0] || null,
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
    liquiditySweptBonus: number,
    quantMath?: QuantMathematics,
    usedBroker: string = 'Deriv',
    direction?: 'BUY' | 'SELL' | 'NEUTRAL',
    l2Metrics?: L2Metrics | null
): WeightedScore => {
    const breakdown: string[] = [];

    // 1. SMC STRUCTURE (35 pts max)
    let smcScore = 0;
    if (smcFactors.htfBOS) { smcScore += 12; breakdown.push('HTF BOS confirmed +12'); }
    if (smcFactors.bosInstitutional) { smcScore += 8; breakdown.push('Institutional displacement +8'); }
    if (smcFactors.zoneValid) { smcScore += 7; breakdown.push('Correct Premium/Discount zone +7'); }
    if (smcFactors.otePrecise) { smcScore += 4; breakdown.push('Price in OTE 70.5% zone +4'); }
    if (smcFactors.obConfluence) { smcScore += 4; breakdown.push('OB confluence +4'); }

    // DOM L2 Skew Influence on SMC Structure (confluence / conflict checking)
    if (usedBroker === 'cTrader' && l2Metrics && direction && direction !== 'NEUTRAL') {
        if (direction === 'BUY') {
            if (l2Metrics.skew === 'BULLISH_SUPPORT') {
                smcScore += 5;
                breakdown.push('DOM Bullish Support (L2 Depth) confirms SMC demand zone +5');
            } else if (l2Metrics.skew === 'BEARISH_RESISTANCE') {
                smcScore -= 5;
                breakdown.push('DOM Bearish Resistance (L2 Depth) conflicts with SMC demand zone -5');
            }
        } else if (direction === 'SELL') {
            if (l2Metrics.skew === 'BEARISH_RESISTANCE') {
                smcScore += 5;
                breakdown.push('DOM Bearish Resistance (L2 Depth) confirms SMC supply zone +5');
            } else if (l2Metrics.skew === 'BULLISH_SUPPORT') {
                smcScore -= 5;
                breakdown.push('DOM Bullish Support (L2 Depth) conflicts with SMC supply zone -5');
            }
        }
    }
    smcScore = Math.max(0, Math.min(smcScore, 35));

    // 2. VOLUME PROFILE / DOM DEPTH (25 pts max)
    let volScore = usedBroker === 'cTrader' ? Math.min(vpScore, 13) : Math.min(Math.round(vpScore * 0.8), 10);
    let domDepthScore = 0;

    if (volScore > 0) {
        breakdown.push(`Volume Profile Confluence (${usedBroker === 'cTrader' ? 'cTrader Actual Vol' : 'Deriv Tick Vol'}) +${volScore}`);
    } else {
        breakdown.push(`${usedBroker} Vol Profile Aligned`);
    }

    if (l2Metrics && direction && direction !== 'NEUTRAL') {
        const imbalancePercent = l2Metrics.imbalancePercent;
        if (direction === 'BUY') {
            if (imbalancePercent > 10) {
                domDepthScore = Math.min(12, Math.round(imbalancePercent / 4));
                breakdown.push(`DOM Bullish Imbalance (+${imbalancePercent.toFixed(1)}%) confirmed +${domDepthScore}`);
            } else if (imbalancePercent < -10) {
                domDepthScore = 0;
                breakdown.push(`DOM Warning: Bearish Imbalance (${imbalancePercent.toFixed(1)}%) in BUY setup`);
            }
        } else if (direction === 'SELL') {
            if (imbalancePercent < -10) {
                domDepthScore = Math.min(12, Math.round(Math.abs(imbalancePercent) / 4));
                breakdown.push(`DOM Bearish Imbalance (${imbalancePercent.toFixed(1)}%) confirmed +${domDepthScore}`);
            } else if (imbalancePercent > 10) {
                domDepthScore = 0;
                breakdown.push(`DOM Warning: Bullish Imbalance (+${imbalancePercent.toFixed(1)}%) in SELL setup`);
            }
        }
    }
    volScore = Math.max(0, Math.min(volScore + domDepthScore, 25));

    // 3. GLOBAL TREND / CORRELATION / DOM CONFLUENCE (25 pts max)
    let trendScore = 0;
    if (trendAligned) { trendScore += 15; breakdown.push('3TF trend aligned +15'); }
    trendScore += Math.min(correlationScore, 10);
    if (correlationScore > 0) breakdown.push(`Correlation score +${Math.min(correlationScore, 10)}`);

    if (usedBroker === 'cTrader' && l2Metrics && direction && direction !== 'NEUTRAL') {
        const imbalancePercent = l2Metrics.imbalancePercent;
        if (direction === 'BUY') {
            if (imbalancePercent > 20) {
                trendScore += 3;
                breakdown.push('DOM Bullish Depth confirms positive Trend bias +3');
            } else if (imbalancePercent < -20) {
                trendScore -= 5;
                breakdown.push('DOM Bearish Depth opposes positive Trend bias -5 ⚠️');
            }
        } else if (direction === 'SELL') {
            if (imbalancePercent < -20) {
                trendScore += 3;
                breakdown.push('DOM Bearish Depth confirms negative Trend bias +3');
            } else if (imbalancePercent > 20) {
                trendScore -= 5;
                breakdown.push('DOM Bullish Depth opposes negative Trend bias -5 ⚠️');
            }
        }
    }
    trendScore = Math.max(0, Math.min(trendScore, 25));

    // 4. NEWS SENTIMENT (10 pts max)
    let newsScore = 0;
    switch (newsRiskLevel) {
        case 'CLEAR': newsScore = 10; breakdown.push('No news risk +10'); break;
        case 'LOW': newsScore = 8; breakdown.push('Low news risk +8'); break;
        case 'MEDIUM': newsScore = 4; breakdown.push('Medium news risk +4'); break;
        case 'HIGH': newsScore = 0; breakdown.push('HIGH NEWS RISK +0 ⚠️'); break;
    }

    // 5. SESSION TIMING (5 pts max - Neutral base for off-session as requested)
    const sessScore = killzoneScore > 0 ? 5 : 3;
    if (killzoneScore > 0) {
        breakdown.push('Active Killzone session alignment +5');
    } else {
        breakdown.push('Off-session execution: Evaluated on pure SMC & Orderbook depth +3');
    }

    // CORRELATION PENALTY
    if (correlationPenalty > 0) {
        breakdown.push(`Correlation conflict -${correlationPenalty} ⚠️`);
    }

    // LIQUIDITY SWEEP BONUS
    if (liquiditySweptBonus > 0) {
        breakdown.push(`Liquidity sweep bonus +${liquiditySweptBonus} 🎯`);
    }

    // STATISTICAL & MATH PENALTIES
    let quantPenalty = 0;
    if (quantMath) {
        if (quantMath.fakeoutProbability > 0.7) {
            quantPenalty += 20;
            breakdown.push(`STATISTICAL FAKEOUT WARNING: High probability of trap (-20)`);
        }
        if (quantMath.regimeProbability === 'MEAN_REVERTING' && smcFactors.htfBOS) {
            quantPenalty += 10;
            breakdown.push(`Mathematical Regime Conflict: Mean-Reverting market attempting breakout (-10)`);
        }
        if (quantMath.statisticalNoiseRatio > 0.8) {
            quantPenalty += 10;
            breakdown.push(`High Market Noise Ratio detected (-10)`);
        }

        if (quantMath.msGarchVol !== undefined && quantMath.msGarchVol > 0.05) {
            quantPenalty += 10;
            breakdown.push(`MS-GARCH Volatility Regime indicates erratic tail risk (-10)`);
        }
    }

    const rawTotal = smcScore + volScore + trendScore + newsScore + sessScore + liquiditySweptBonus;
    let rawScore = Math.max(0, Math.min(rawTotal - correlationPenalty - quantPenalty, 100));

    if (quantMath && quantMath.lstmState !== undefined) {
        if (quantMath.lstmState > 0.8 || quantMath.lstmState < -0.8) {
            breakdown.push(`LSTM Recurrent Sequence confirms directional momentum (+5)`);
            rawScore = Math.min(100, rawScore + 5); 
        }
    }

    // Instant Reject / Veto if fakeout probability is too high (>=80%)
    if (quantMath && quantMath.fakeoutProbability >= 0.80) {
        rawScore = 0;
        breakdown.push(`ALGORITHMIC VETO: Trade Rejected by Quant Engine (Fakeout > 80%)`);
    }

    // --- DETERMINISTIC SETUP GRADING & CONFIDENCE SCORE MAPPING ---
    // Scale 60 (lowest) to 85 (highest) - All setups across the full spectrum are ranked and graded
    const totalScore = Math.min(85, Math.max(60, Math.round(60 + (rawScore / 100) * 25)));

    let grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'NO TRADE' = 'D';
    if (quantMath && quantMath.fakeoutProbability >= 0.80) {
        grade = 'NO TRADE';
    } else if (totalScore >= 83) {
        grade = 'A+';
    } else if (totalScore >= 78) {
        grade = 'A';
    } else if (totalScore >= 73) {
        grade = 'B';
    } else if (totalScore >= 67) {
        grade = 'C';
    } else {
        grade = 'D';
    }

    const isHighProbability = totalScore >= 80;

    const riskTier =
        grade === 'A+' ? 'FULL' :
            grade === 'A' ? 'FULL' :
                grade === 'B' ? 'HALF' :
                    grade === 'C' ? 'QUARTER' : 'SKIP';

    const suggestedRiskPercent =
        grade === 'A+' ? 2.0 :
            grade === 'A' ? 1.0 :
                grade === 'B' ? 0.75 :
                    grade === 'C' ? 0.25 :
                        grade === 'D' ? 0.1 : 0;

    return {
        smcStructure: smcScore,
        volumeProfile: volScore,
        globalTrend: trendScore,
        newsSentiment: newsScore,
        sessionTiming: sessScore,
        correlationPenalty,
        liquiditySweepBonus: liquiditySweptBonus,
        totalScore,
        grade,
        riskTier,
        suggestedRiskPercent,
        isHighProbability,
        breakdown
    };
};

/**
 * ADVANCED: Lead-Lag Divergence (SMT)
 * Institutions use this to find traps between correlated assets (e.g. EURUSD vs GBPUSD)
 */
export const detectSMTDivergence = (
    assetA: OHLC[],
    assetB: OHLC[],
    trend: 'BULLISH' | 'BEARISH'
): { divergence: boolean, reasoning: string } => {
    const lastA = assetA.slice(-10);
    const lastB = assetB.slice(-10);

    const highA = Math.max(...lastA.map(c => c.high));
    const lowA = Math.min(...lastA.map(c => c.low));
    const highB = Math.max(...lastB.map(c => c.high));
    const lowB = Math.min(...lastB.map(c => c.low));

    if (trend === 'BULLISH') {
        // If Asset A made a Lower Low but Asset B failed to (Higher Low)
        const aMadeLL = lastA[lastA.length - 1].low <= lowA;
        const bMadeHL = lastB[lastB.length - 1].low > lowB;
        if (aMadeLL && bMadeHL) return { divergence: true, reasoning: 'SMT Divergence: Bullish Accumulation detected.' };
    }

    if (trend === 'BEARISH') {
        // If Asset A made a Higher High but Asset B failed to (Lower High)
        const aMadeHH = lastA[lastA.length - 1].high >= highA;
        const bMadeLH = lastB[lastB.length - 1].high < highB;
        if (aMadeHH && bMadeLH) return { divergence: true, reasoning: 'SMT Divergence: Bearish Distribution detected.' };
    }

    return { divergence: false, reasoning: 'Correlated assets are structurally aligned.' };
};

// Master SMC Analysis
export function analyzeSMC(
    candles: any[], 
    confirmCandles?: any[], 
    htfCandles?: any[], 
    assetSymbol: string = 'UNKNOWN', 
    usedBroker: string = 'Deriv',
    depth?: { bids: [number, number][], asks: [number, number][] } | null
) {
    const day = new Date().getDay(); // 0=Sun, 1=Mon, 5=Fri, 6=Sat
    const isSynthetic = ['VOLATILITY', 'BOOM', 'CRASH', 'STEP', 'JUMP', 'RANGE', 'R_', 'RB_', 'STP'].some(s => assetSymbol.toUpperCase().includes(s));
    const isCrypto = ['BTC', 'ETH', 'LTC', 'SOL', 'CRYPTO'].some(s => assetSymbol.toUpperCase().includes(s));
    const isWeekend = (day === 0 || day === 6); // Sunday = 0, Saturday = 6
    const isOffDay = isWeekend && !isSynthetic && !isCrypto;

    if (!candles || candles.length < 50) return null;

    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);

    const ema20Arr = calculateEMA(closes, 20);
    const ema50Arr = calculateEMA(closes, 50);
    const ema200Arr = calculateEMA(closes, 200);

    const ema20 = ema20Arr.length > 0 ? ema20Arr[ema20Arr.length - 1] : closes[closes.length - 1];
    const prevEma20 = ema20Arr.length > 1 ? ema20Arr[ema20Arr.length - 2] : ema20;
    
    const ema50 = ema50Arr.length > 0 ? ema50Arr[ema50Arr.length - 1] : closes[closes.length - 1];
    const prevEma50 = ema50Arr.length > 1 ? ema50Arr[ema50Arr.length - 2] : ema50;
    
    const ema200 = ema200Arr.length > 0 ? ema200Arr[ema200Arr.length - 1] : closes[closes.length - 1];

    const ema20Dir = ema20 > prevEma20 ? 'UP' : 'DOWN';
    const ema50Dir = ema50 > prevEma50 ? 'UP' : 'DOWN';

    const rsiArr = calculateRSI(closes);
    const rsi = rsiArr.length > 0 ? rsiArr[rsiArr.length - 1] : 50;

    // Swing Highs and Lows
    const lastSwingHigh = Math.max(...highs.slice(-20));
    const lastSwingLow = Math.min(...lows.slice(-20));
    const currentPrice = closes[closes.length - 1];

    // Trend & Regime Detection
    let trend = 'RANGING';
    let regime = 'CHOPPY';
    
    if (currentPrice > ema20 && ema20 > ema50 && ema20Dir === 'UP' && ema50Dir === 'UP') {
        trend = 'BULLISH';
        regime = 'STRONG_BULLISH';
    } else if (currentPrice < ema20 && ema20 < ema50 && ema20Dir === 'DOWN' && ema50Dir === 'DOWN') {
        trend = 'BEARISH';
        regime = 'STRONG_BEARISH';
    } else if (ema20Dir === 'UP' && ema50Dir === 'DOWN') {
        trend = 'BEARISH'; // HTF is down
        regime = 'COUNTER_TREND_PULLBACK';
    } else if (ema20Dir === 'DOWN' && ema50Dir === 'UP') {
        trend = 'BULLISH'; // HTF is up
        regime = 'BULLISH_DIP';
    } else {
        trend = 'RANGING';
        regime = 'CHOPPY';
    }

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
        tfConfirmation.confirmTrend = confirmEma50[confirmEma50.length - 1] > confirmEma200[confirmEma200.length - 1] && confirmPrice > confirmEma50[confirmEma50.length - 1]
            ? 'BULLISH' : confirmEma50[confirmEma50.length - 1] < confirmEma200[confirmEma200.length - 1] && confirmPrice < confirmEma50[confirmEma50.length - 1]
                ? 'BEARISH' : 'RANGING';
    }

    if (htfCandles && htfCandles.length >= 50) {
        const htfCloses = htfCandles.map((c: any) => c.close);
        const htfEma50 = calculateEMA(htfCloses, 50);
        const htfEma200 = calculateEMA(htfCloses, 200);
        const htfPrice = htfCloses[htfCloses.length - 1];
        tfConfirmation.htfTrend = htfEma50[htfEma50.length - 1] > htfEma200[htfEma200.length - 1] && htfPrice > htfEma50[htfEma50.length - 1]
            ? 'BULLISH' : htfEma50[htfEma50.length - 1] < htfEma200[htfEma200.length - 1] && htfPrice < htfEma50[htfEma50.length - 1]
                ? 'BEARISH' : 'RANGING';
    }

    // Require true macro alignment across timeframes to get the 10-point bonus
    tfConfirmation.allAligned = (
        (trend !== 'RANGING') &&
        (tfConfirmation.entryTrend === tfConfirmation.confirmTrend) &&
        (tfConfirmation.confirmTrend === tfConfirmation.htfTrend)
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

    // ✅ NEW: Strict Mathematical HTF POI Tracking & LTF Mitigation
    interface POI {
        id: string;
        type: 'FVG' | 'OB';
        direction: 'BULLISH' | 'BEARISH';
        topEdge: number;
        bottomEdge: number;
        timestamp: number;
        isActive: boolean;
    }

    const activeHTF_POIs: POI[] = [];

    if (htfCandles && htfCandles.length > 5) {
        for (let i = 2; i < htfCandles.length - 1; i++) {
            const c0 = htfCandles[i];
            const c1 = htfCandles[i - 1];
            const c2 = htfCandles[i - 2];

            // 1. Detect HTF Bullish FVG (Low_C0 > High_C2)
            if (c0.low > c2.high) {
                activeHTF_POIs.push({
                    id: `HTF_BULL_FVG_${i}`,
                    type: 'FVG',
                    direction: 'BULLISH',
                    topEdge: c0.low,
                    bottomEdge: c2.high,
                    timestamp: c0.epoch || i,
                    isActive: true
                });
            }

            // 2. Detect HTF Bearish FVG (High_C0 < Low_C2)
            if (c0.high < c2.low) {
                activeHTF_POIs.push({
                    id: `HTF_BEAR_FVG_${i}`,
                    type: 'FVG',
                    direction: 'BEARISH',
                    topEdge: c2.low,
                    bottomEdge: c0.high,
                    timestamp: c0.epoch || i,
                    isActive: true
                });
            }

            // 3. Detect HTF Bullish Order Block (Down close followed by strong displacement/FVG)
            // C_k = c1 (Down close), followed by C_0 (Up close)
            if (c1.close < c1.open && c0.close > c0.open) {
                const nextC = htfCandles[i + 1]; // Look ahead one candle to confirm FVG
                if (nextC && nextC.low > c1.high) {
                    activeHTF_POIs.push({
                        id: `HTF_BULL_OB_${i}`,
                        type: 'OB',
                        direction: 'BULLISH',
                        topEdge: c1.high,
                        bottomEdge: c1.low,
                        timestamp: c1.epoch || i,
                        isActive: true
                    });
                }
            }
            
            // 4. Detect HTF Bearish Order Block
            if (c1.close > c1.open && c0.close < c0.open) {
                const nextC = htfCandles[i + 1];
                if (nextC && nextC.high < c1.low) {
                    activeHTF_POIs.push({
                        id: `HTF_BEAR_OB_${i}`,
                        type: 'OB',
                        direction: 'BEARISH',
                        topEdge: c1.high,
                        bottomEdge: c1.low,
                        timestamp: c1.epoch || i,
                        isActive: true
                    });
                }
            }
        }

        // Mitigation Pass: Invalidate POIs that have been breached
        for (let p = 0; p < activeHTF_POIs.length; p++) {
            const poi = activeHTF_POIs[p];
            const poiIndex = htfCandles.findIndex(c => (c.epoch || 0) === poi.timestamp);
            if (poiIndex === -1) continue;

            for (let k = poiIndex + 1; k < htfCandles.length; k++) {
                const checkCandle = htfCandles[k];
                if (poi.direction === 'BULLISH' && checkCandle.close < poi.bottomEdge) {
                    poi.isActive = false;
                    break;
                }
                if (poi.direction === 'BEARISH' && checkCandle.close > poi.topEdge) {
                    poi.isActive = false;
                    break;
                }
            }
        }
    }

    const validPOIs = activeHTF_POIs.filter(p => p.isActive);
    
    // 15M Proximity Check
    const isMitigatingBullishPOI = validPOIs.some(p => p.direction === 'BULLISH' && currentPrice <= p.topEdge && currentPrice >= p.bottomEdge);
    const isMitigatingBearishPOI = validPOIs.some(p => p.direction === 'BEARISH' && currentPrice <= p.topEdge && currentPrice >= p.bottomEdge);

    const ltfChochBullish = choch && trend === 'BULLISH'; // Or whatever indicates an upward structural shift
    const ltfChochBearish = choch && trend === 'BEARISH'; // Needs refinement based on your BOS/CHOCH logic

    // High Conviction Mechanical Trigger
    const isMechanicalBuy = isMitigatingBullishPOI && choch && currentPrice > ema20;
    const isMechanicalSell = isMitigatingBearishPOI && choch && currentPrice < ema20;

    // FVG Detection (LTF - Legacy for reference)
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

    // --- LUXALGO SMC STRUCTURE ENHANCEMENTS ---
    // 1. Equal Highs & Lows (EQH / EQL) Detection
    const eqhThreshold = (atr || currentPrice * 0.001) * 0.15;
    const equalHighsLows: { type: 'EQH' | 'EQL'; price: number; barCount: number; liquidityPool: 'BSL' | 'SSL' }[] = [];
    for (let i = candles.length - 15; i < candles.length - 1; i++) {
        if (i < 2) continue;
        const cCurr = candles[i];
        const cPrev = candles[i - 1];
        if (Math.abs(cCurr.high - cPrev.high) <= eqhThreshold) {
            equalHighsLows.push({
                type: 'EQH',
                price: (cCurr.high + cPrev.high) / 2,
                barCount: 2,
                liquidityPool: 'BSL'
            });
        }
        if (Math.abs(cCurr.low - cPrev.low) <= eqhThreshold) {
            equalHighsLows.push({
                type: 'EQL',
                price: (cCurr.low + cPrev.low) / 2,
                barCount: 2,
                liquidityPool: 'SSL'
            });
        }
    }

    // --- INSTITUTIONAL HIGH-CLARITY MULTI-TIMEFRAME FVG & ORDER BLOCK ENGINE ---

    // A. High-Clarity Fair Value Gap (FVG) Detector (Noise Filtering)
    const scanHighClarityFVGs = (
        cArray: any[], 
        tfLabel: '4H' | '1H' | 'LTF',
        lookback = 35
    ) => {
        if (!cArray || cArray.length < 5) return [];
        const results: Array<{
            type: 'BULLISH' | 'BEARISH';
            top: number;
            bottom: number;
            consequentEncroachment: number; // 50% midpoint CE
            fillPercent: number;
            mitigated: boolean;
            isInverseFVG: boolean;
            timeframe: '4H' | '1H' | 'LTF';
            clarityGrade: 'INSTITUTIONAL_PRIME' | 'STANDARD_HIGH_CLARITY';
            gapAtrRatio: number;
            volumeExpansion: boolean;
            description: string;
        }> = [];

        const len = Math.min(lookback, cArray.length - 1);
        const recentSlice = cArray.slice(-len);
        const avgBody = recentSlice.reduce((sum, c) => sum + Math.abs(c.close - c.open), 0) / (recentSlice.length || 1);
        const avgVol = recentSlice.reduce((sum, c) => sum + ((c as any).tick_volume || (c as any).volume || 1), 0) / (recentSlice.length || 1);

        for (let i = 2; i < recentSlice.length; i++) {
            const c0 = recentSlice[i - 2];
            const c1 = recentSlice[i - 1]; // Displacement candle
            const c2 = recentSlice[i];

            const c1Body = Math.abs(c1.close - c1.open);
            const c1Vol = (c1 as any).tick_volume || (c1 as any).volume || 1;
            const hasVolExpansion = c1Vol >= avgVol * 1.10 || c1Body >= avgBody * 1.15;

            // Bullish FVG
            if (c0.high < c2.low) {
                const gap = c2.low - c0.high;
                // Minimum noise threshold: gap must be >= 0.20 ATR (or >= 0.02% price) to filter out choppy micro gaps
                const minGapThreshold = Math.max((atr || currentPrice * 0.001) * 0.20, currentPrice * 0.0002);
                
                if (gap >= minGapThreshold && hasVolExpansion) {
                    const mitigated = currentPrice <= c0.high;
                    const isInverseFVG = currentPrice < c0.high - (atr * 0.15);
                    const fillPercent = mitigated ? 100 : Math.max(0, Math.min(100, ((c2.low - currentPrice) / gap) * 100));
                    const ce = (c2.low + c0.high) / 2;
                    const gapRatio = gap / (atr || 1);
                    const clarityGrade = (tfLabel === '4H' || gapRatio >= 0.35) ? 'INSTITUTIONAL_PRIME' : 'STANDARD_HIGH_CLARITY';

                    results.push({
                        type: 'BULLISH',
                        top: c2.low,
                        bottom: c0.high,
                        consequentEncroachment: ce,
                        fillPercent,
                        mitigated,
                        isInverseFVG,
                        timeframe: tfLabel,
                        clarityGrade,
                        gapAtrRatio: gapRatio,
                        volumeExpansion: hasVolExpansion,
                        description: `[${tfLabel}] ${clarityGrade} Bullish FVG [${c0.high.toFixed(5)} - ${c2.low.toFixed(5)}]. 50% CE: ${ce.toFixed(5)}`
                    });
                }
            } 
            // Bearish FVG
            else if (c0.low > c2.high) {
                const gap = c0.low - c2.high;
                const minGapThreshold = Math.max((atr || currentPrice * 0.001) * 0.20, currentPrice * 0.0002);

                if (gap >= minGapThreshold && hasVolExpansion) {
                    const mitigated = currentPrice >= c0.low;
                    const isInverseFVG = currentPrice > c0.low + (atr * 0.15);
                    const fillPercent = mitigated ? 100 : Math.max(0, Math.min(100, ((currentPrice - c2.high) / gap) * 100));
                    const ce = (c0.low + c2.high) / 2;
                    const gapRatio = gap / (atr || 1);
                    const clarityGrade = (tfLabel === '4H' || gapRatio >= 0.35) ? 'INSTITUTIONAL_PRIME' : 'STANDARD_HIGH_CLARITY';

                    results.push({
                        type: 'BEARISH',
                        top: c0.low,
                        bottom: c2.high,
                        consequentEncroachment: ce,
                        fillPercent,
                        mitigated,
                        isInverseFVG,
                        timeframe: tfLabel,
                        clarityGrade,
                        gapAtrRatio: gapRatio,
                        volumeExpansion: hasVolExpansion,
                        description: `[${tfLabel}] ${clarityGrade} Bearish FVG [${c2.high.toFixed(5)} - ${c0.low.toFixed(5)}]. 50% CE: ${ce.toFixed(5)}`
                    });
                }
            }
        }
        return results;
    };

    // B. High-Clarity Order Block Detector with Strict Break and Close Body Validation
    const scanHighClarityOBs = (
        cArray: any[],
        tfLabel: '4H' | '1H' | 'LTF',
        lookback = 45
    ) => {
        if (!cArray || cArray.length < 5) return [];
        const results: Array<{
            type: 'BULLISH_OB' | 'BEARISH_OB';
            high: number;
            low: number;
            open: number;
            close: number;
            meanThreshold: number; // 50% midpoint
            timeframe: '4H' | '1H' | 'LTF';
            mitigated: boolean;
            breached: boolean;
            bodyBreakConfirmed: boolean;
            volumeConfirmed: boolean;
            clarityGrade: 'INSTITUTIONAL_PRIME' | 'STANDARD_HIGH_CLARITY';
            sizeAtrRatio: number;
            description: string;
        }> = [];

        const len = Math.min(lookback, cArray.length - 1);
        const recentSlice = cArray.slice(-len);
        const avgVol = recentSlice.reduce((sum, c) => sum + ((c as any).tick_volume || (c as any).volume || 1), 0) / (recentSlice.length || 1);

        for (let i = 1; i < recentSlice.length - 1; i++) {
            const c0 = recentSlice[i - 1]; // Candidate Order Block candle
            const c1 = recentSlice[i];     // Displacement candle
            const c2 = i + 1 < recentSlice.length ? recentSlice[i + 1] : c1;

            const c1Vol = (c1 as any).tick_volume || (c1 as any).volume || 1;
            const volumeConfirmed = c1Vol >= avgVol * 1.05;

            // Bullish Order Block: c0 is down candle, followed by strong up move with BODY CLOSE above c0.high
            if (c0.close < c0.open) {
                // STRICT BREAK AND CLOSE BODY CHECK: c1 or c2 close MUST be > c0.high (not just wick probe)
                const bodyBreakConfirmed = c1.close > c0.high || c2.close > c0.high;
                const strongImbalance = (c1.close - c1.open) > (c0.open - c0.close) * 1.2;

                if (bodyBreakConfirmed && strongImbalance) {
                    const meanThreshold = (c0.high + c0.low) / 2;
                    const breached = currentPrice < c0.low; // Body close or price below OB low invalidates
                    const mitigated = currentPrice <= c0.high;
                    const sizeAtrRatio = (c0.high - c0.low) / (atr || 1);
                    const clarityGrade = (tfLabel === '4H' || (volumeConfirmed && sizeAtrRatio >= 0.25)) ? 'INSTITUTIONAL_PRIME' : 'STANDARD_HIGH_CLARITY';

                    if (!breached) {
                        results.push({
                            type: 'BULLISH_OB',
                            high: c0.high,
                            low: c0.low,
                            open: c0.open,
                            close: c0.close,
                            meanThreshold,
                            timeframe: tfLabel,
                            mitigated,
                            breached,
                            bodyBreakConfirmed,
                            volumeConfirmed,
                            clarityGrade,
                            sizeAtrRatio,
                            description: `[${tfLabel}] ${clarityGrade} Bullish OB [${c0.low.toFixed(5)} - ${c0.high.toFixed(5)}]. 50% Mean Threshold: ${meanThreshold.toFixed(5)}. Body Close Confirmed: YES`
                        });
                    }
                }
            }
            // Bearish Order Block: c0 is up candle, followed by strong down move with BODY CLOSE below c0.low
            else if (c0.close > c0.open) {
                // STRICT BREAK AND CLOSE BODY CHECK: c1 or c2 close MUST be < c0.low (not just wick probe)
                const bodyBreakConfirmed = c1.close < c0.low || c2.close < c0.low;
                const strongImbalance = (c0.open - c0.close) > (c0.close - c0.open) * 1.2;

                if (bodyBreakConfirmed && strongImbalance) {
                    const meanThreshold = (c0.high + c0.low) / 2;
                    const breached = currentPrice > c0.high; // Price above OB high invalidates
                    const mitigated = currentPrice >= c0.low;
                    const sizeAtrRatio = (c0.high - c0.low) / (atr || 1);
                    const clarityGrade = (tfLabel === '4H' || (volumeConfirmed && sizeAtrRatio >= 0.25)) ? 'INSTITUTIONAL_PRIME' : 'STANDARD_HIGH_CLARITY';

                    if (!breached) {
                        results.push({
                            type: 'BEARISH_OB',
                            high: c0.high,
                            low: c0.low,
                            open: c0.open,
                            close: c0.close,
                            meanThreshold,
                            timeframe: tfLabel,
                            mitigated,
                            breached,
                            bodyBreakConfirmed,
                            volumeConfirmed,
                            clarityGrade,
                            sizeAtrRatio,
                            description: `[${tfLabel}] ${clarityGrade} Bearish OB [${c0.low.toFixed(5)} - ${c0.high.toFixed(5)}]. 50% Mean Threshold: ${meanThreshold.toFixed(5)}. Body Close Confirmed: YES`
                        });
                    }
                }
            }
        }
        return results;
    };

    // Scan HTF (4H/1H) and LTF (15m/5m) FVGs & Order Blocks
    const htfFVGs = htfCandles ? scanHighClarityFVGs(htfCandles, '4H') : [];
    const confirmFVGs = confirmCandles ? scanHighClarityFVGs(confirmCandles, '1H') : [];
    const ltfFVGs = scanHighClarityFVGs(candles, 'LTF');

    const htfOBs = htfCandles ? scanHighClarityOBs(htfCandles, '4H') : [];
    const confirmOBs = confirmCandles ? scanHighClarityOBs(confirmCandles, '1H') : [];
    const ltfOBs = scanHighClarityOBs(candles, 'LTF');

    // Combined High-Clarity FVGs and OBs
    const highClarityFVGs = [...htfFVGs, ...confirmFVGs, ...ltfFVGs];
    const highClarityOBs = [...htfOBs, ...confirmOBs, ...ltfOBs];

    // Maintain LuxAlgo compatibility arrays
    const luxAlgoFVGs = highClarityFVGs.map(f => ({
        type: f.type,
        top: f.top,
        bottom: f.bottom,
        fillPercent: f.fillPercent,
        mitigated: f.mitigated,
        timeframe: f.timeframe,
        clarityGrade: f.clarityGrade,
        consequentEncroachment: f.consequentEncroachment
    }));

    const luxAlgoOrderBlocks = highClarityOBs.map(ob => ({
        type: ob.type,
        high: ob.high,
        low: ob.low,
        level: (ob.timeframe === '4H' || ob.timeframe === '1H') ? ('SWING' as const) : ('INTERNAL' as const),
        mitigated: ob.mitigated,
        sizeAtrRatio: ob.sizeAtrRatio,
        meanThreshold: ob.meanThreshold,
        bodyBreakConfirmed: ob.bodyBreakConfirmed,
        timeframe: ob.timeframe
    }));

    // Multi-Timeframe Reaction Zone Hierarchy Matrix
    const findActiveReactionZone = () => {
        // Priority 1: High-Clarity Unmitigated 4H HTF FVGs / OBs
        const unmitigatedHTF_FVG = htfFVGs.find(f => !f.mitigated);
        const unmitigatedHTF_OB = htfOBs.find(ob => !ob.mitigated);

        // Priority 2: Unmitigated LTF FVGs / OBs
        const unmitigatedLTF_FVG = ltfFVGs.find(f => !f.mitigated);
        const unmitigatedLTF_OB = ltfOBs.find(ob => !ob.mitigated);

        const primaryAnchor = unmitigatedHTF_OB || unmitigatedHTF_FVG || unmitigatedLTF_OB || unmitigatedLTF_FVG || null;

        return {
            primaryHTF_FVG: unmitigatedHTF_FVG || null,
            primaryHTF_OB: unmitigatedHTF_OB || null,
            primaryLTF_FVG: unmitigatedLTF_FVG || null,
            primaryLTF_OB: unmitigatedLTF_OB || null,
            activeAnchorZone: primaryAnchor ? primaryAnchor.description : 'NO_UNMITIGATED_HTF_ZONE'
        };
    };

    const mtfReactionZones = findActiveReactionZone();

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

    // --- ENHANCED INSTITUTIONAL PRICE ACTION & VOLUME NODE ANALYSIS ---
    // A. Strong & Weak Highs/Lows Engine
    const findStrongWeakLevels = () => {
        const recentHighs = highs.slice(-30);
        const recentLows = lows.slice(-30);
        const maxH = Math.max(...recentHighs);
        const minL = Math.min(...recentLows);
        const maxHIdx = candles.length - 30 + recentHighs.indexOf(maxH);
        const minLIdx = candles.length - 30 + recentLows.indexOf(minL);

        // Strong Low: swept liquidity / reacted at demand & led to bullish structure
        const strongLow = (minLIdx < candles.length - 2 && currentPrice > minL + (atr * 1.5)) ? {
            price: minL,
            type: 'STRONG_LOW',
            reason: 'Swept sell-side liquidity & initiated bullish displacement. Protected demand floor.',
            status: 'PROTECTED'
        } : null;

        // Weak Low: EQL or failed to create a higher high
        const weakLow = (equalHighsLows.some(e => e.type === 'EQL') || (minLIdx >= candles.length - 10 && currentPrice < minL + (atr * 0.5))) ? {
            price: minL,
            type: 'WEAK_LOW',
            reason: 'Inducement pool / EQL. Vulnerable to sell-side sweep.',
            status: 'TARGET_SSL'
        } : null;

        // Strong High: swept BSL / tapped supply & led to bearish structure
        const strongHigh = (maxHIdx < candles.length - 2 && currentPrice < maxH - (atr * 1.5)) ? {
            price: maxH,
            type: 'STRONG_HIGH',
            reason: 'Tapped institutional supply & initiated bearish displacement. Protected ceiling.',
            status: 'PROTECTED'
        } : null;

        // Weak High: EQH or failed to create a lower low
        const weakHigh = (equalHighsLows.some(e => e.type === 'EQH') || (maxHIdx >= candles.length - 10 && currentPrice > maxH - (atr * 0.5))) ? {
            price: maxH,
            type: 'WEAK_HIGH',
            reason: 'Inducement pool / EQH. Vulnerable to buy-side sweep.',
            status: 'TARGET_BSL'
        } : null;

        return { strongLow, weakLow, strongHigh, weakHigh };
    };

    const strongWeakLevels = findStrongWeakLevels();

    // Enhanced Multi-Layered Institutional Support & Resistance Engine
    const calculateSupportAndResistance = () => {
        const hvns = volumeProfile.hvns || [];
        const highPrice = Math.max(...candles.map(c => c.high));
        const lowPrice = Math.min(...candles.map(c => c.low));
        const closePrice = candles[candles.length - 1].close;

        // Standard & Fibonacci Pivot Points
        const pivotPoint = (highPrice + lowPrice + closePrice) / 3;
        const range = highPrice - lowPrice;

        // Classic Pivots
        const r1 = (2 * pivotPoint) - lowPrice;
        const s1 = (2 * pivotPoint) - highPrice;
        const r2 = pivotPoint + range;
        const s2 = pivotPoint - range;
        const r3 = highPrice + 2 * (pivotPoint - lowPrice);
        const s3 = lowPrice - 2 * (highPrice - pivotPoint);

        // Collect Resistance candidates (Levels above current price)
        const resistanceCandidates: Array<{ price: number; type: string; weight: number; label: string }> = [];
        // Collect Support candidates (Levels below current price)
        const supportCandidates: Array<{ price: number; type: string; weight: number; label: string }> = [];

        // 1. Swing Highs/Lows
        if (lastSwingHigh) resistanceCandidates.push({ price: lastSwingHigh, type: 'SWING_HIGH', weight: 8, label: `Last Swing High @ ${lastSwingHigh.toFixed(5)}` });
        if (lastSwingLow) supportCandidates.push({ price: lastSwingLow, type: 'SWING_LOW', weight: 8, label: `Last Swing Low @ ${lastSwingLow.toFixed(5)}` });

        // 2. High Volume Absorption Nodes (HVNs)
        hvns.forEach(hvn => {
            if (hvn.priceLevel > currentPrice) {
                resistanceCandidates.push({ price: hvn.priceLevel, type: 'HVN_RESISTANCE', weight: 9, label: `High Volume Node Resistance @ ${hvn.priceLevel.toFixed(5)}` });
            } else if (hvn.priceLevel < currentPrice) {
                supportCandidates.push({ price: hvn.priceLevel, type: 'HVN_SUPPORT', weight: 9, label: `High Volume Node Support @ ${hvn.priceLevel.toFixed(5)}` });
            }
        });

        // 3. Unmitigated Order Blocks
        highClarityOBs.forEach(ob => {
            if (ob.type === 'BEARISH_OB' && ob.low > currentPrice) {
                resistanceCandidates.push({ price: ob.meanThreshold, type: 'BEARISH_OB_SUPPLY', weight: 10, label: `[${ob.timeframe}] Bearish OB Supply Zone @ ${ob.meanThreshold.toFixed(5)}` });
            } else if (ob.type === 'BULLISH_OB' && ob.high < currentPrice) {
                supportCandidates.push({ price: ob.meanThreshold, type: 'BULLISH_OB_DEMAND', weight: 10, label: `[${ob.timeframe}] Bullish OB Demand Zone @ ${ob.meanThreshold.toFixed(5)}` });
            }
        });

        // 4. Standard Pivots
        if (r1 > currentPrice) resistanceCandidates.push({ price: r1, type: 'PIVOT_R1', weight: 6, label: `Pivot R1 @ ${r1.toFixed(5)}` });
        if (r2 > currentPrice) resistanceCandidates.push({ price: r2, type: 'PIVOT_R2', weight: 7, label: `Pivot R2 @ ${r2.toFixed(5)}` });
        if (s1 < currentPrice) supportCandidates.push({ price: s1, type: 'PIVOT_S1', weight: 6, label: `Pivot S1 @ ${s1.toFixed(5)}` });
        if (s2 < currentPrice) supportCandidates.push({ price: s2, type: 'PIVOT_S2', weight: 7, label: `Pivot S2 @ ${s2.toFixed(5)}` });

        // Sort Resistances ascending (nearest to farthest above price)
        resistanceCandidates.sort((a, b) => a.price - b.price);
        // Sort Supports descending (nearest to farthest below price)
        supportCandidates.sort((a, b) => b.price - a.price);

        const primaryResistance = resistanceCandidates[0]?.price || r1;
        const secondaryResistance = resistanceCandidates[1]?.price || r2;
        const primarySupport = supportCandidates[0]?.price || s1;
        const secondarySupport = supportCandidates[1]?.price || s2;

        return {
            pivotPoint: roundAssetPrice(pivotPoint, assetSymbol),
            supports: [
                { level: 'S1', price: roundAssetPrice(primarySupport, assetSymbol), description: supportCandidates[0]?.label || `Primary Support @ ${primarySupport.toFixed(5)}` },
                { level: 'S2', price: roundAssetPrice(secondarySupport, assetSymbol), description: supportCandidates[1]?.label || `Secondary Support @ ${secondarySupport.toFixed(5)}` },
                { level: 'S3', price: roundAssetPrice(s3, assetSymbol), description: `Major Structural Floor @ ${s3.toFixed(5)}` }
            ],
            resistances: [
                { level: 'R1', price: roundAssetPrice(primaryResistance, assetSymbol), description: resistanceCandidates[0]?.label || `Primary Resistance @ ${primaryResistance.toFixed(5)}` },
                { level: 'R2', price: roundAssetPrice(secondaryResistance, assetSymbol), description: resistanceCandidates[1]?.label || `Secondary Resistance @ ${secondaryResistance.toFixed(5)}` },
                { level: 'R3', price: roundAssetPrice(r3, assetSymbol), description: `Major Structural Ceiling @ ${r3.toFixed(5)}` }
            ],
            closestSupport: roundAssetPrice(primarySupport, assetSymbol),
            closestResistance: roundAssetPrice(primaryResistance, assetSymbol),
            keyZoneDescription: `Current Price ${currentPrice.toFixed(5)} is sandwiched between Support ${primarySupport.toFixed(5)} and Resistance ${primaryResistance.toFixed(5)}.`
        };
    };

    const supportResistanceLevels = calculateSupportAndResistance();

    // B. Volume Voids, High Volume Reversal Nodes & Fading Momentum Engine
    const analyzeVolumeFadingAndNodes = () => {
        const hvns = volumeProfile.hvns || [];
        const lvns = volumeProfile.lvns || [];
        
        // Low Volume Nodes = Weak Volume Voids (Price Acceleration Zones)
        const weakVolumeVoids = lvns.slice(0, 4).map(node => ({
            price: node.priceLevel,
            volume: node.volume,
            type: currentPrice < node.priceLevel ? 'PUMP_ZONE_VOID' : 'DUMP_ZONE_VOID',
            description: currentPrice < node.priceLevel 
                ? `Low volume void above @ ${node.priceLevel.toFixed(5)}. Rapid pump zone expected upon breakout.`
                : `Low volume void below @ ${node.priceLevel.toFixed(5)}. Rapid dump zone expected upon breakdown.`
        }));

        // High Volume Nodes = Heavy Order Absorption & Reversal Nodes
        const reversalVolumeNodes = hvns.slice(0, 4).map(node => ({
            price: node.priceLevel,
            volume: node.volume,
            type: currentPrice > node.priceLevel ? 'REVERSAL_SUPPORT' : 'REVERSAL_RESISTANCE',
            description: `Heavy institutional volume node @ ${node.priceLevel.toFixed(5)}. High order absorption & reversal expected.`
        }));

        // Momentum Fading Detection
        const recentCandles = candles.slice(-5);
        const lastC = recentCandles[recentCandles.length - 1];
        const prevC = recentCandles[recentCandles.length - 2];
        const lastVol = (lastC as any).tick_volume || (lastC as any).volume || 1;
        const prevVol = (prevC as any).tick_volume || (prevC as any).volume || 1;
        
        const topWickRatio = (lastC.high - Math.max(lastC.open, lastC.close)) / Math.max(0.00001, lastC.high - lastC.low);
        const bottomWickRatio = (Math.min(lastC.open, lastC.close) - lastC.low) / Math.max(0.00001, lastC.high - lastC.low);

        let momentumFading: { isFading: boolean; direction: 'UPWARD_EXHAUSTION' | 'DOWNWARD_EXHAUSTION' | 'NONE'; text: string; confidence: number } = {
            isFading: false,
            direction: 'NONE',
            text: 'Volume momentum is steady.',
            confidence: 0
        };

        if (rsi > 62 && topWickRatio > 0.40 && lastVol < prevVol * 0.9) {
            momentumFading = {
                isFading: true,
                direction: 'UPWARD_EXHAUSTION',
                text: `Upward momentum fading near ${lastC.high.toFixed(5)}. Declining volume & top wick rejection signal imminent BEARISH reversal.`,
                confidence: 88
            };
        } else if (rsi < 38 && bottomWickRatio > 0.40 && lastVol < prevVol * 0.9) {
            momentumFading = {
                isFading: true,
                direction: 'DOWNWARD_EXHAUSTION',
                text: `Downward momentum fading near ${lastC.low.toFixed(5)}. Declining volume & bottom wick rejection signal imminent BULLISH reversal.`,
                confidence: 88
            };
        }

        return { weakVolumeVoids, reversalVolumeNodes, momentumFading };
    };

    const volumeNodesAnalysis = analyzeVolumeFadingAndNodes();

    // C. SMC Structures Summary (BOS, CHoCH, FVGs)
    const smcStructuresSummary = {
        bos: {
            isDetected: bos,
            type: trend === 'BULLISH' ? 'BULLISH_BOS' : trend === 'BEARISH' ? 'BEARISH_BOS' : 'RANGE_BREAK',
            price: trend === 'BULLISH' ? prevHigh : prevLow,
            label: trend === 'BULLISH' ? `Bullish BOS @ ${prevHigh.toFixed(5)}` : `Bearish BOS @ ${prevLow.toFixed(5)}`
        },
        choch: {
            isDetected: choch,
            type: trend === 'BULLISH' ? 'BEARISH_CHOCH' : 'BULLISH_CHOCH',
            price: trend === 'BULLISH' ? prevLow : prevHigh,
            label: trend === 'BULLISH' ? `Bearish CHoCH Shift @ ${prevLow.toFixed(5)}` : `Bullish CHoCH Shift @ ${prevHigh.toFixed(5)}`
        },
        fvgs: luxAlgoFVGs
    };

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
    let recommendedExecution: 'MARKET' | 'LIMIT' = 'MARKET';

    // Performance Optimization for UK100/EUR indices
    const isLondonAsset =
        assetSymbol.includes('UK100') ||
        assetSymbol.includes('FTSE') ||
        assetSymbol.includes('GER40') ||
        assetSymbol.includes('DAX') ||
        assetSymbol.includes('STOXX') ||
        assetSymbol.includes('EUR') ||
        assetSymbol.includes('GBP') ||
        assetSymbol.includes('CHF');

    // Advanced Institutional ATR Buffer & Trap Avoidance
    let baseSlBuffer = 1.5; // Starts at 1.5x ATR
    if (killzone.session === 'LONDON_NY_OVERLAP' || killzone.session === 'NEW_YORK') {
        baseSlBuffer = 2.0;
    } else if (isLondonAsset && killzone.session === 'LONDON') {
        baseSlBuffer = 2.5;
    }

    // --- WEIGHTED SCORING MODEL ---
    const smcFactors = {
        // Institutional Rule: BOS is only valid if backed by HTF Alignment or Leading Divergence
        htfBOS: (tfConfirmation.allAligned && bos),
        bosInstitutional: displacement,
        zoneValid: zoneValid,
        otePrecise: isInOTE,
        obConfluence: !!orderBlock
    };

    const liquidityBonus = (liquidityHeatmap.priceJustSweptSSL && trend === 'BULLISH') ||
        (liquidityHeatmap.priceJustSweptBSL && trend === 'BEARISH') ? 15 : 0;

    const quantMath = calculateQuantMathematics(candles, depth);

    // Mock news risk since no API is connected
    let newsRisk: 'HIGH' | 'MEDIUM' | 'LOW' | 'CLEAR' = 'CLEAR';
    const nowHour = new Date().getUTCHours();
    // High impact news usually drops at 13:30 UTC and 14:00 UTC, especially Wed/Thu
    if ((nowHour === 13 || nowHour === 14) && (day === 2 || day === 3 || day === 4)) {
        newsRisk = 'HIGH';
    } else if (day === 3) {
        // Wednesday is historically high impact volatility day
        newsRisk = 'MEDIUM'; 
    }

    // Enforce direction based on HTF structure and Displacement
    // ✅ OVERRIDE: If Mechanical POI logic fires, it supersedes generic trend alignment.
    const isBullishSetup = isMechanicalBuy || ((tfConfirmation.htfTrend === 'BULLISH' || (tfConfirmation.htfTrend === 'UNKNOWN' && trend === 'BULLISH')) &&
        (!displacementDirection || displacementDirection === 'BULLISH'));
    const isBearishSetup = isMechanicalSell || ((tfConfirmation.htfTrend === 'BEARISH' || (tfConfirmation.htfTrend === 'UNKNOWN' && trend === 'BEARISH')) &&
        (!displacementDirection || displacementDirection === 'BEARISH'));

    const directionOfSetup: 'BUY' | 'SELL' | 'NEUTRAL' = 
        isBullishSetup ? 'BUY' : (isBearishSetup ? 'SELL' : 'NEUTRAL');

    // Parse L2 Orderbook DOM Depth if available
    const l2Metrics = depth ? calculateL2OrderbookMetrics(depth, currentPrice) : null;
    if (l2Metrics && depth) {
        const bids = depth.bids || [];
        const asks = depth.asks || [];
        const bestBid = bids.length > 0 ? bids[0][0] : currentPrice;
        const bestAsk = asks.length > 0 ? asks[0][0] : currentPrice;
        const spread = Math.max(0, bestAsk - bestBid);
        
        const totalBidSize = bids.reduce((sum, b) => sum + (b[1] || 0), 0);
        const totalAskSize = asks.reduce((sum, a) => sum + (a[1] || 0), 0);
        
        const avgBidSize = bids.length > 0 ? totalBidSize / bids.length : 1;
        const avgAskSize = asks.length > 0 ? totalAskSize / asks.length : 1;
        
        const walls = [
            ...bids.filter(b => (b[1] || 0) > avgBidSize * 2.5).map(b => ({ price: b[0], size: b[1], type: 'SUPPORT' })),
            ...asks.filter(a => (a[1] || 0) > avgAskSize * 2.5).map(a => ({ price: a[0], size: a[1], type: 'RESISTANCE' }))
        ].sort((a, b) => b.size - a.size).slice(0, 5);

        // Estimate Price Impact for 50 lots
        const getImpact = (size: number, isBuy: boolean) => {
            let remaining = size;
            let cost = 0;
            const levels = isBuy ? asks : bids;
            for (const [p, s] of levels) {
                const matched = Math.min(remaining, s || 0);
                cost += matched * p;
                remaining -= matched;
                if (remaining <= 0) break;
            }
            if (remaining > 0) {
                cost += remaining * currentPrice * (isBuy ? 1.002 : 0.998);
            }
            const avgPrice = cost / size;
            const slippagePercent = Math.abs(avgPrice - currentPrice) / currentPrice * 100;
            return { avgPrice, slippagePercent };
        };

        const impactBuy = getImpact(50, true);
        const impactSell = getImpact(50, false);

        // Add to l2Metrics
        (l2Metrics as any).bestBid = bestBid;
        (l2Metrics as any).bestAsk = bestAsk;
        (l2Metrics as any).spread = spread;
        (l2Metrics as any).multipleBids = bids.slice(0, 10);
        (l2Metrics as any).multipleAsks = asks.slice(0, 10);
        (l2Metrics as any).marketDepth = { totalBidSize, totalAskSize };
        (l2Metrics as any).liquidityWalls = walls;
        (l2Metrics as any).slippageBuy = impactBuy;
        (l2Metrics as any).slippageSell = impactSell;
    }

    const weightedScore = calculateWeightedScore(
        smcFactors,
        obVolConfluence.score,
        tfConfirmation.allAligned,
        0, // Correlation Score (need driver data)
        0, // Correlation Penalty
        newsRisk, // News Sentiment mocked based on day/time
        killzone.score,
        liquidityBonus,
        quantMath,
        usedBroker,
        directionOfSetup,
        l2Metrics
    );

    let signalValid = weightedScore.totalScore >= 50;

    const mdp = new MarkovDecisionProcess();
    // Pass momentum state (-1 to 1 based on zScore and lstm) and zScore directly
    const mdpState = (quantMath.lstmState || 0) * 0.5 + (quantMath.hurstExponentApproximation > 0.5 ? 0.5 : -0.5);
    const mdpAction = mdp.evaluatePolicy(mdpState, quantMath.zScoreDispersion);

    if (signalValid) {
        // Evaluate if market execution is safe or if limit order is required

        // RULE: MDP Veto overrules SMC if excessive tail risk is detected
        if (mdpAction === 'REDUCE') {
            weightedScore.breakdown.push(`MDP Policy Violation: Extreme tail risk out-of-bounds. Execution downgraded to LIMIT.`);
            recommendedExecution = 'LIMIT';
            weightedScore.suggestedRiskPercent = Math.max(0.1, weightedScore.suggestedRiskPercent * 0.5); // Chop risk
            explicitSignal = 'NEUTRAL'; // Temporarily neutralize market orders
        }

        // RULE: If Market is in "MEAN_REVERTING" regime, FORBID Market Execution

        if (quantMath.regimeProbability === 'MEAN_REVERTING') {
            recommendedExecution = 'LIMIT';
        }

        // Avoid market execution during dead zones or overextended bands
        if (killzone.session === 'OFF_SESSION' || killzone.session === 'ASIAN') {
            recommendedExecution = 'LIMIT';
        }

        if (isBullishSetup && (currentZone === 'DISCOUNT' || isMechanicalBuy)) {
            explicitSignal = 'BUY';
            if (stdDev.overextended && currentPrice > stdDev.upperBand) {
                recommendedExecution = 'LIMIT'; // Protect against overextension trap
            }
            const baseLow = displacementCandle ? displacementCandle.low : ote.bullish.deep;
            const bufferedSL = baseLow - (atr * baseSlBuffer);
            // Ensure SL is securely below standard deviation noise floor
            mathematicalSL = Math.min(bufferedSL, stdDev.lowerBand - (atr * 0.5));
            if (liquidityHeatmap.priceJustSweptSSL && liquidityHeatmap.nearestSSL) {
                mathematicalSL = Math.min(mathematicalSL, liquidityHeatmap.nearestSSL.price - atr);
            }
        } else if (isBearishSetup && (currentZone === 'PREMIUM' || isMechanicalSell)) {
            explicitSignal = 'SELL';
            if (stdDev.overextended && currentPrice < stdDev.lowerBand) {
                recommendedExecution = 'LIMIT'; // Protect against overextension trap
            }
            const baseHigh = displacementCandle ? displacementCandle.high : ote.bearish.deep;
            const bufferedSL = baseHigh + (atr * baseSlBuffer);
            // Ensure SL is securely above standard deviation noise ceiling
            mathematicalSL = Math.max(bufferedSL, stdDev.upperBand + (atr * 0.5));
            if (liquidityHeatmap.priceJustSweptBSL && liquidityHeatmap.nearestBSL) {
                mathematicalSL = Math.max(mathematicalSL, liquidityHeatmap.nearestBSL.price + atr);
            }
        }
    }

    // 5. Markov Chain Regime Engine
    const markovRegime = calculateMarkovRegime(candles, 20, depth);
    if (markovRegime && signalValid) {
        // Boost score if markov aligns with the setup
        if (explicitSignal === 'BUY' && markovRegime.signal === 'BUY' && quantMath.regimeProbability !== 'MEAN_REVERTING') {
            weightedScore.totalScore = Math.min(100, weightedScore.totalScore + 15);
        } else if (explicitSignal === 'SELL' && markovRegime.signal === 'SELL' && quantMath.regimeProbability !== 'MEAN_REVERTING') {
            weightedScore.totalScore = Math.min(100, weightedScore.totalScore + 15);
        } else if (markovRegime.signal !== 'NEUTRAL' && explicitSignal !== markovRegime.signal) {
            // Penalize conflicting markov regime
            weightedScore.totalScore = Math.max(0, weightedScore.totalScore - 10);
            weightedScore.breakdown.push(`Markov conflict penalization -10`);
        }
    }

    // 6. Advanced Micro-Decisions
    const orderflowMetrics = analyzeOrderflow(candles, depth);
    if (l2Metrics) {
        orderflowMetrics.l2Metrics = l2Metrics;
        orderflowMetrics.imbalanceRatio = l2Metrics.imbalanceRatio;
        if (l2Metrics.skew === 'BULLISH_SUPPORT') {
            orderflowMetrics.institutionalFootprint = 'STRONG_BUY';
        } else if (l2Metrics.skew === 'BEARISH_RESISTANCE') {
            orderflowMetrics.institutionalFootprint = 'STRONG_SELL';
        }
    }

    // Process Order Flow Absorption impact on Scoring
    if (orderflowMetrics.orderFlowAbsorption && orderflowMetrics.orderFlowAbsorption.confidence >= 55) {
        const abs = orderflowMetrics.orderFlowAbsorption;
        if (abs.type === 'SELL_ABSORPTION' && (explicitSignal === 'SELL' || explicitSignal === 'NEUTRAL')) {
            const bonus = Math.round(abs.confidence * 0.2);
            weightedScore.totalScore = Math.min(100, weightedScore.totalScore + bonus);
            weightedScore.breakdown.push(`Order-Flow Seller Absorption Bonus +${bonus} (Conf: ${abs.confidence}%)`);
            if (explicitSignal === 'NEUTRAL' && abs.confidence >= 75 && abs.confirmation) {
                explicitSignal = 'SELL';
                mathematicalSL = currentPrice + (atr * baseSlBuffer);
                weightedScore.breakdown.push(`Explicit SELL triggered by confirmed Order-Flow Absorption at resistance`);
            }
        } else if (abs.type === 'BUY_ABSORPTION' && (explicitSignal === 'BUY' || explicitSignal === 'NEUTRAL')) {
            const bonus = Math.round(abs.confidence * 0.2);
            weightedScore.totalScore = Math.min(100, weightedScore.totalScore + bonus);
            weightedScore.breakdown.push(`Order-Flow Buyer Absorption Bonus +${bonus} (Conf: ${abs.confidence}%)`);
            if (explicitSignal === 'NEUTRAL' && abs.confidence >= 75 && abs.confirmation) {
                explicitSignal = 'BUY';
                mathematicalSL = currentPrice - (atr * baseSlBuffer);
                weightedScore.breakdown.push(`Explicit BUY triggered by confirmed Order-Flow Absorption at support`);
            }
        }
    }
    const stopClusters = predictStopClusters(candles);
    if (l2Metrics && l2Metrics.detectedStopClusters && l2Metrics.detectedStopClusters.length > 0) {
        stopClusters.push(...l2Metrics.detectedStopClusters);
    }
    const liquidityPrediction = predictNextLiquiditySweep(liquidityHeatmap, markovRegime, quantMath, currentPrice, trend);

    // Normalize data for NeuralEngine
    const normalizedMomentum = (rsi - 50) / 50;
    let volumeImbalance = orderflowMetrics.imbalanceRatio - 1; // Center around 0
    volumeImbalance = Math.max(-1, Math.min(1, volumeImbalance));

    const timeOfDayWeight = killzone.active ? killzone.multiplier / 2 : 0.2;

    const returnsHistory = [];
    for (let i = 1; i < candles.length; i++) {
        returnsHistory.push((candles[i].close - candles[i - 1].close) / candles[i - 1].close);
    }

    const neuralAnalysis = NeuralEngine.runReasoningCycle(
        returnsHistory,
        normalizedMomentum,
        volumeImbalance,
        timeOfDayWeight
    );

    // Filter signals using Neural Engine Anomaly Detection
    if (neuralAnalysis.anomalyDetected && explicitSignal !== 'NEUTRAL') {
        explicitSignal = 'NEUTRAL'; // Veto the trade
        weightedScore.totalScore = Math.max(0, weightedScore.totalScore - 30);
        weightedScore.breakdown.push(`Neural Engine VETO: Severe Anomaly / Chaos Detected`);
    }

    // Estimate reward to risk based on OTE and structural targets
    let estimatedRewardToRisk = 2.0; // Default
    if (explicitSignal === 'BUY' && ote.bullish && liquidityHeatmap.nearestBSL) {
        const risk = currentPrice - mathematicalSL;
        const reward = liquidityHeatmap.nearestBSL.price - currentPrice;
        estimatedRewardToRisk = risk > 0 ? reward / risk : 2.0;
    } else if (explicitSignal === 'SELL' && ote.bearish && liquidityHeatmap.nearestSSL) {
        const risk = mathematicalSL - currentPrice;
        const reward = currentPrice - liquidityHeatmap.nearestSSL.price;
        estimatedRewardToRisk = risk > 0 ? reward / risk : 2.0;
    }

    // Run Monte Carlo Simulation to find price targets and win rate
    const monteCarloPrediction = MathEngine.monteCarloPredict(currentPrice, returnsHistory, 10, 10000);

    const riskOptimization = executeRiskOptimization(
        monteCarloPrediction.winRate, // Use actual MC statistical win rate instead of fake score ratio
        estimatedRewardToRisk,
        1.0, // default account risk
        weightedScore,
        quantMath.statisticalNoiseRatio
    );

    const institutionalExecution = calculateInstitutionalExecution(candles, currentPrice, atr);

    const adversarialVeto = runAdversarialVeto(assetSymbol, currentPrice, {
        atr,
        displacement,
        monteCarloPrediction,
        weightedScore
    }, returnsHistory);

    // Apply off-day block if needed
    if (isOffDay) {
        explicitSignal = 'NEUTRAL';
        weightedScore.totalScore = 60;
        weightedScore.grade = 'NO TRADE';
        weightedScore.isHighProbability = false;
        weightedScore.breakdown.push('Blueprint: Off-day trading blocked (Monday/Friday/Weekend)');
        signalValid = false;
    } else {
        weightedScore.totalScore = Math.min(85, Math.max(60, Math.round(weightedScore.totalScore)));
        weightedScore.isHighProbability = weightedScore.totalScore >= 80;
    }

    const greyModelPrediction = calculateGM11(closes.slice(-100), 3);

    // Calibrated Stop Loss Distance & Breathing Room for lower timeframes / 1-minute chart
    const upperSym = (assetSymbol || '').toUpperCase();
    let minSafetyDist = currentPrice * 0.0008; // Base 8 pips default on 5-digit forex
    if (upperSym.includes('JPY')) {
        minSafetyDist = Math.max(minSafetyDist, 0.12); // At least 12-15 pips on JPY pairs
    } else if (upperSym.includes('XAU') || upperSym.includes('GOLD')) {
        minSafetyDist = Math.max(minSafetyDist, 2.5); // At least $2.50 on Gold
    } else if (upperSym.includes('BTC')) {
        minSafetyDist = Math.max(minSafetyDist, 200.0); // At least $200 on BTC
    } else if (upperSym.includes('ETH')) {
        minSafetyDist = Math.max(minSafetyDist, 15.0);
    } else if (upperSym.includes('US30') || upperSym.includes('DJI') || upperSym.includes('DOW')) {
        minSafetyDist = Math.max(minSafetyDist, 35.0); // At least 35 points on US30
    } else if (upperSym.includes('NAS') || upperSym.includes('US100') || upperSym.includes('NDX')) {
        minSafetyDist = Math.max(minSafetyDist, 20.0); // At least 20 points on NAS100
    } else if (upperSym.includes('SPX') || upperSym.includes('US500')) {
        minSafetyDist = Math.max(minSafetyDist, 6.0);
    } else if (upperSym.includes('BOOM') || upperSym.includes('CRASH') || upperSym.includes('VOLATILITY') || upperSym.includes('V100') || upperSym.includes('V75')) {
        minSafetyDist = Math.max(minSafetyDist, currentPrice * 0.003);
    } else {
        // Standard Forex pairs like EURUSD, AUDUSD, GBPUSD: minimum 8 to 12 pips (0.0008 - 0.0012)
        minSafetyDist = Math.max(minSafetyDist, 0.0008);
    }

    const effectiveAtr = Math.max(atr || 0, minSafetyDist * 0.8);
    const calibratedAtrMultiplier = 1.8; // Calibrated breathing room for lower timeframes
    const standardMinDist = Math.max(minSafetyDist, effectiveAtr * calibratedAtrMultiplier);

    // Level 2 Liquidity Shielded Stop Loss Protection
    let l2ShieldNote = 'Structural ATR Protection';
    if (l2Metrics && (l2Metrics as any).liquidityWalls && (l2Metrics as any).liquidityWalls.length > 0) {
        const walls = (l2Metrics as any).liquidityWalls;
        if (explicitSignal === 'BUY') {
            const supp = walls.find((w: any) => w.type === 'SUPPORT' && w.price < currentPrice);
            if (supp) {
                const wallSL = supp.price - effectiveAtr * 0.5;
                // Ensure wall SL has adequate calibrated distance from entry
                mathematicalSL = Math.min(currentPrice - standardMinDist, wallSL);
                l2ShieldNote = `Shielded behind Level 2 Orderbook Support Wall @ ${formatAssetPrice(supp.price, assetSymbol)}`;
            }
        } else if (explicitSignal === 'SELL') {
            const res = walls.find((w: any) => w.type === 'RESISTANCE' && w.price > currentPrice);
            if (res) {
                const wallSL = res.price + effectiveAtr * 0.5;
                // Ensure wall SL has adequate calibrated distance from entry
                mathematicalSL = Math.max(currentPrice + standardMinDist, wallSL);
                l2ShieldNote = `Shielded behind Level 2 Orderbook Resistance Wall @ ${formatAssetPrice(res.price, assetSymbol)}`;
            }
        }
    } else if (stopClusters && stopClusters.length > 0) {
        if (explicitSignal === 'BUY') {
            const sellStops = stopClusters.filter(s => s.type === 'SELL_STOP_LIQUIDITY' && s.price < currentPrice);
            if (sellStops.length > 0) {
                const lowestStop = Math.min(...sellStops.map(s => s.price));
                const clusterSL = lowestStop - effectiveAtr * 0.5;
                mathematicalSL = Math.min(currentPrice - standardMinDist, clusterSL);
                l2ShieldNote = `Shielded behind Institutional Sell Stop Liquidity Pool @ ${formatAssetPrice(lowestStop, assetSymbol)}`;
            }
        } else if (explicitSignal === 'SELL') {
            const buyStops = stopClusters.filter(s => s.type === 'BUY_STOP_LIQUIDITY' && s.price > currentPrice);
            if (buyStops.length > 0) {
                const highestStop = Math.max(...buyStops.map(s => s.price));
                const clusterSL = highestStop + effectiveAtr * 0.5;
                mathematicalSL = Math.max(currentPrice + standardMinDist, clusterSL);
                l2ShieldNote = `Shielded behind Institutional Buy Stop Liquidity Pool @ ${formatAssetPrice(highestStop, assetSymbol)}`;
            }
        }
    }

    // Fallback and validation for Stop Loss
    const isBuy = explicitSignal === 'BUY';
    const fallbackSL = isBuy ? currentPrice - standardMinDist : currentPrice + standardMinDist;
    
    if (mathematicalSL > 0) {
        // Enforce that mathematicalSL is not too tight
        const currentDist = Math.abs(currentPrice - mathematicalSL);
        if (currentDist < standardMinDist || (isBuy && mathematicalSL >= currentPrice) || (!isBuy && mathematicalSL <= currentPrice)) {
            mathematicalSL = fallbackSL;
        }
        mathematicalSL = roundAssetPrice(mathematicalSL, assetSymbol);
    } else {
        mathematicalSL = roundAssetPrice(fallbackSL, assetSymbol);
    }

    // Calculate precision Scalp & Market Execution Targets (enforcing ALWAYS 1:2.0 minimum Risk-to-Reward ratio on lower timeframe)
    const finalSL = mathematicalSL;
    const slDist = Math.abs(currentPrice - finalSL);
    const scalpRiskPips = Math.max(slDist, standardMinDist);

    const scalpTargets = {
        entry: roundAssetPrice(currentPrice, assetSymbol),
        marketExecutionRange: {
            minPrice: roundAssetPrice(isBuy ? currentPrice - effectiveAtr * 0.1 : currentPrice, assetSymbol),
            maxPrice: roundAssetPrice(isBuy ? currentPrice : currentPrice + effectiveAtr * 0.1, assetSymbol),
            executionMode: 'IMMEDIATE_MARKET_EXECUTION',
            maxAllowedSlippage: (effectiveAtr * 0.15).toFixed(getAssetPrecision(assetSymbol))
        },
        stopLoss: finalSL,
        l2ShieldNote,
        tp1: roundAssetPrice(isBuy ? currentPrice + scalpRiskPips * 2.0 : currentPrice - scalpRiskPips * 2.0, assetSymbol),
        tp2: roundAssetPrice(isBuy ? currentPrice + scalpRiskPips * 3.0 : currentPrice - scalpRiskPips * 3.0, assetSymbol),
        tp3: roundAssetPrice(isBuy ? currentPrice + scalpRiskPips * 4.5 : currentPrice - scalpRiskPips * 4.5, assetSymbol),
        riskRewardRatio: "1:2.0",
        minScalpRR: "1:2.0 - 1:3.5 (Always 1:2.0 minimum on lower timeframe)",
        pipsAtRisk: scalpRiskPips,
        targetProfitPips: scalpRiskPips * 2.0
    };

    const sessionAnchors = calculateSessionOpeningAnchors(candles, currentPrice);

    return {
        trend,
        regime,
        ema20,
        ema50,
        ema200,
        rsi,
        lastSwingHigh,
        lastSwingLow,
        bos,
        choch,
        validPOIs,
        isMitigatingBullishPOI,
        isMitigatingBearishPOI,
        isMechanicalBuy,
        isMechanicalSell,
        liquiditySweep,
        displacement,
        displacementCandle,
        displacementDirection,
        ote,
        isInOTE,
        explicitSignal,
        recommendedExecution,
        mathematicalSL,
        scalpTargets,
        supportResistanceLevels,
        equalHighsLows,
        luxAlgoOrderBlocks,
        luxAlgoFVGs,
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
        sessionAnchors,
        killzone,
        stdDev,
        volumeProfile,
        liquidityHeatmap,
        weightedScore,
        obVolConfluence,
        markovRegime,
        quantMath,
        orderflowMetrics,
        stopClusters,
        liquidityPrediction,
        riskOptimization,
        neuralAnalysis,
        monteCarloPrediction,
        institutionalExecution,
        adversarialVeto,
        greyModelPrediction,
        strongWeakLevels,
        volumeNodesAnalysis,
        smcStructuresSummary,
        highClarityFVGs,
        highClarityOBs,
        mtfReactionZones
    };
}

/**
 * NEW: Neural Adversarial Layer
 * Specifically designed to perform "Alpha Veto" checks:
 * 1. Permutation Stability (checks for noise overfitting)
 * 2. Information Asymmetry (Correlation divergence)
 * 3. Robustness vs. Alpha Fallback
 */
export function runAdversarialVeto(
    asset: string,
    currentPrice: number,
    quantData: any,
    returnsHistory: number[]
) {
    const vetoes: string[] = [];
    
    // 1. Permutation Stability (Simplified)
    // We check if a small perturbation in recent volatility suggests the signal is noise
    const recentVol = quantData.atr / currentPrice;
    if (recentVol > 0.05) { // 5% vol is extreme noise
        vetoes.push("Extreme statistical noise detected. Permutation testing suggests signal might be a statistical ghost.");
    }

    // 2. Correlation Divergence (Information Asymmetry)
    // Use the internal correlation map to find "Echo Chamber" risks
    const rules = CORRELATION_MAP[asset] || [];
    for (const rule of rules) {
        // Only trigger veto if we had live macro driver data indicating divergence (e.g. DXY breaking out against EURUSD).
        // Without live macro data, a static weight > 0.7 triggers on every pair and penalizes valid setups.
        // We leave the rules mapped but skip the hard veto.
        // if (rule.weight > 0.7 && liveDriverDataShowsDivergence) { ... }
    }

    // 3. Alpha vs. Robustness Fallback
    // If Monte Carlo is strong (High win rate) but actual market displacement (predictive power) is low
    if (quantData.monteCarloPrediction?.winRate > 0.75 && quantData.displacement < 1.2) {
        vetoes.push("Monte Carlo Robustness Fallacy: Setup is mathematically robust but lacks predictive Alpha (Zero Momentum).");
    }

    return {
        vetoTriggered: vetoes.length > 0,
        vetoReasons: vetoes,
        adversarialConfidence: Math.max(0, 100 - (vetoes.length * 25))
    };
}
