
import { detectFVG, detectOrderBlock } from './sharedEngine';
import { calculateEMA, calculateRSI } from './analyticsEngine';

export interface FibonacciLevels {
    equilibrium: number;   // 0.50
    oteStart: number;      // 0.62
    oteSweetSpot: number;  // 0.705 (Apex Entry)
    oteDeep: number;       // 0.79
    swingHigh: number;
    swingLow: number;
}

export interface FTALevels {
    primaryTarget: number; // Price of the closest friction point (FTA)
    targetType: 'FVG_BOUNDARY' | 'OB_BOUNDARY' | 'SWING_HIGH_LOW' | 'EQUILIBRIUM';
    description: string;
}

export interface StarvationFilter {
    preventStarvation: boolean;
    suggestedEntryStyle: 'MOMENTUM_SCALED' | 'SNIPER_OTE' | 'CONSERVATIVE_OB';
    reason: string;
    splits: {
        aggressiveEntryPortion: number; // Limit order at 0.50 or FVG upper
        conservativeEntryPortion: number; // Limit order at 0.705 OTE
    };
}

export interface RCAMetrics {
    trend: 'BULLISH' | 'BEARISH' | 'RANGING';
    ema50: number;
    ema200: number;
    rsi: number;
    bos: boolean;
    fvg: any;
    ob: any;
    fibonacciOTE: FibonacciLevels;
    firstTroubleArea: FTALevels;
    starvationPrevention: StarvationFilter;
    confluenceConfidence: number; // Out of 100
    message: string;
}

export function analyzeRCA(candles: any[]): RCAMetrics | null {
    if (!candles || candles.length < 50) return null;

    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);

    // Standard indicator computations
    const ema50 = calculateEMA(closes, 50)[calculateEMA(closes, 50).length - 1];
    const ema200 = calculateEMA(closes, 200)[calculateEMA(closes, 200).length - 1];
    const rsi = calculateRSI(closes)[calculateRSI(closes).length - 1];
    const currentPrice = closes[closes.length - 1];

    const trend = ema50 > ema200 && currentPrice > ema50 ? 'BULLISH' :
                  ema50 < ema200 && currentPrice < ema50 ? 'BEARISH' : 'RANGING';

    const prevHigh = Math.max(...highs.slice(-12, -1));
    const prevLow = Math.min(...lows.slice(-12, -1));
    
    let bos = false;
    if (trend === 'BULLISH') bos = currentPrice > prevHigh;
    else if (trend === 'BEARISH') bos = currentPrice < prevLow;

    const fvg = detectFVG(candles);
    const ob = detectOrderBlock(candles, trend, currentPrice);

    // --- 1. ADVANCED FIBONACCI OTE (OPTIMAL TRADE ENTRY) CALCULATIONS ---
    // Scan recent lookback boundaries to isolate the dealing range (the market impulse)
    const lookbackHigh = Math.max(...highs.slice(-40));
    const lookbackLow = Math.min(...lows.slice(-40));
    const impulseRange = lookbackHigh - lookbackLow;

    let fibonacciOTE: FibonacciLevels;
    if (trend === 'BULLISH') {
        // Pullback is measured from the bottom of the move up to the top
        fibonacciOTE = {
            swingHigh: lookbackHigh,
            swingLow: lookbackLow,
            equilibrium: lookbackHigh - (impulseRange * 0.50),
            oteStart: lookbackHigh - (impulseRange * 0.620),
            oteSweetSpot: lookbackHigh - (impulseRange * 0.705), // Apex sweet spot
            oteDeep: lookbackHigh - (impulseRange * 0.790)
        };
    } else {
        // Correction is measured from the top of the move down to the bottom
        fibonacciOTE = {
            swingHigh: lookbackHigh,
            swingLow: lookbackLow,
            equilibrium: lookbackLow + (impulseRange * 0.50),
            oteStart: lookbackLow + (impulseRange * 0.620),
            oteSweetSpot: lookbackLow + (impulseRange * 0.705), // Apex sweet spot
            oteDeep: lookbackLow + (impulseRange * 0.790)
        };
    }

    // --- 2. FIRST TROUBLE AREA (FTA) TARGETING FOR TP1 ---
    // Mathematically calculates the nearest logical friction point to maximize TP1 hitting probability.
    let firstTroubleArea: FTALevels = {
        primaryTarget: currentPrice,
        targetType: 'EQUILIBRIUM',
        description: 'Standard Equilibrium Target'
    };

    if (trend === 'BULLISH') {
        if (fvg && fvg.type === 'BEARISH') {
            // Target the lower boundary of the nearest Bearish FVG (first trouble area)
            firstTroubleArea = {
                primaryTarget: fvg.lower - (currentPrice * 0.0002), // Small buffer
                targetType: 'FVG_BOUNDARY',
                description: 'Target placed right below the lower lip of the nearest Bearish FVG.'
            };
        } else if (ob && ob.type === 'BEARISH_OB') {
            // Target the lower boundary (open/high) of the opposite structure
            firstTroubleArea = {
                primaryTarget: ob.lower - (currentPrice * 0.0003),
                targetType: 'OB_BOUNDARY',
                description: 'Target positioned immediately preceding the Bearish Order Block supply lip.'
            };
        } else {
            // Fallback to recent local swing high
            firstTroubleArea = {
                primaryTarget: prevHigh,
                targetType: 'SWING_HIGH_LOW',
                description: 'Target placed at local resistance (Swing High).'
            };
        }
    } else if (trend === 'BEARISH') {
        if (fvg && fvg.type === 'BULLISH') {
            // Target the upper boundary of the nearest Bullish FVG
            firstTroubleArea = {
                primaryTarget: fvg.upper + (currentPrice * 0.0002),
                targetType: 'FVG_BOUNDARY',
                description: 'Target placed right above the upper lip of the nearest Bullish FVG.'
            };
        } else if (ob && ob.type === 'BULLISH_OB') {
            firstTroubleArea = {
                primaryTarget: ob.upper + (currentPrice * 0.0003),
                targetType: 'OB_BOUNDARY',
                description: 'Target positioned immediately preceding the Bullish Order Block demand lip.'
            };
        } else {
            firstTroubleArea = {
                primaryTarget: prevLow,
                targetType: 'SWING_HIGH_LOW',
                description: 'Target placed at local support (Swing Low).'
            };
        }
    }

    // --- 3. STARVATION PREVENTION FILTER (DUAL-ZONE SCALING) ---
    // Evaluates speed, RSI intensity, and momentum to detect if a runaway market is likely.
    // If momentum is high, we split execution to avoid trade starvation.
    let preventStarvation = false;
    let suggestedEntryStyle: 'MOMENTUM_SCALED' | 'SNIPER_OTE' | 'CONSERVATIVE_OB' = 'SNIPER_OTE';
    let starvationReason = 'Pullbacks expected to reach the optimal Fibonacci 0.705 sweet spot.';
    let aggressiveEntryPortion = 0.0;
    let conservativeEntryPortion = 1.0;

    // Detect extreme trend acceleration 
    const isRSIOverExtended = (trend === 'BULLISH' && rsi > 62) || (trend === 'BEARISH' && rsi < 38);
    const hasDisplacementBreak = bos && fvg !== null;

    if (hasDisplacementBreak && isRSIOverExtended) {
        preventStarvation = true;
        suggestedEntryStyle = 'MOMENTUM_SCALED';
        starvationReason = 'High velocity displacement has broken structure. To prevent trade starvation, we split orders at the Equilibrium (50%) zone and the OTE (70.5%) sweet spot.';
        aggressiveEntryPortion = 0.35; // 35% of lot allocation at aggressive level
        conservativeEntryPortion = 0.65; // 65% at conservative sniper limit OTE
    } else if (ob) {
        suggestedEntryStyle = 'CONSERVATIVE_OB';
        starvationReason = 'Fresh Order Block detected. Wait for deeper retest of key institutional demand/supply.';
    }

    const starvationPrevention: StarvationFilter = {
        preventStarvation,
        suggestedEntryStyle,
        reason: starvationReason,
        splits: {
            aggressiveEntryPortion,
            conservativeEntryPortion
        }
    };

    // --- 4. CONFLUENCE CONFIDENCE SCORE CALCULATION ---
    let score = 50; // Starting baseline
    if (trend !== 'RANGING') score += 10;
    if (bos) score += 15;
    if (fvg) score += 10;
    if (ob) score += 10;
    
    // Check if price resides in the discount/premium region corresponding to trend
    const inDiscountBuy = trend === 'BULLISH' && currentPrice < fibonacciOTE.equilibrium;
    const inPremiumSell = trend === 'BEARISH' && currentPrice > fibonacciOTE.equilibrium;
    if (inDiscountBuy || inPremiumSell) score += 15;

    // Verify RSI alignment
    const isRsiBullishAlign = trend === 'BULLISH' && rsi > 50 && rsi < 70;
    const isRsiBearishAlign = trend === 'BEARISH' && rsi < 50 && rsi > 30;
    if (isRsiBullishAlign || isRsiBearishAlign) score += 10;

    return {
        trend,
        ema50,
        ema200,
        rsi,
        bos,
        fvg,
        ob,
        fibonacciOTE,
        firstTroubleArea,
        starvationPrevention,
        confluenceConfidence: Math.min(100, score),
        message: "RCA Advanced Confluence & Target Analysis Complete"
    };
}

