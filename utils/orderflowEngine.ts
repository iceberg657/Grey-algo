import type { OHLC } from './quantEngine';

export interface OrderflowMetrics {
    buyingPressure: number;
    sellingPressure: number;
    imbalanceRatio: number; // >1 means buyer dominated, <1 means seller dominated
    institutionalFootprint: 'STRONG_BUY' | 'WEAK_BUY' | 'NEUTRAL' | 'WEAK_SELL' | 'STRONG_SELL';
    exhaustionWarning: boolean;
    l2Metrics?: L2Metrics;
    absorptions?: AbsorptionLevel[];
}

export interface StopCluster {
    price: number;
    size: number;
    type: 'BUY_STOP_LIQUIDITY' | 'SELL_STOP_LIQUIDITY';
    probability: 'HIGH' | 'MEDIUM' | 'LOW';
    distancePips: number;
}

export interface L2Metrics {
    bidDepth: number;
    askDepth: number;
    imbalanceRatio: number; // Bid / Ask
    imbalancePercent: number; // (Bid-Ask)/(Bid+Ask) * 100
    skew: 'BULLISH_SUPPORT' | 'BEARISH_RESISTANCE' | 'NEUTRAL';
    detectedStopClusters: StopCluster[];
}

export interface AbsorptionLevel {
    price: number;
    volume: number;
    type: 'BULLISH_ABSORPTION' | 'BEARISH_ABSORPTION';
    time: number;
    strength: number; // 1-100 scale
}

// 1. L2 ORDERBOOK ANALYSIS
export const calculateL2OrderbookMetrics = (
    depth: { bids: [number, number][], asks: [number, number][] } | null,
    currentPrice: number
): L2Metrics => {
    if (!depth || (!depth.bids?.length && !depth.asks?.length)) {
        return {
            bidDepth: 0,
            askDepth: 0,
            imbalanceRatio: 1,
            imbalancePercent: 0,
            skew: 'NEUTRAL',
            detectedStopClusters: []
        };
    }

    const bids = depth.bids || [];
    const asks = depth.asks || [];

    const bidDepth = bids.reduce((acc, b) => acc + (b[1] || 0), 0);
    const askDepth = asks.reduce((acc, a) => acc + (a[1] || 0), 0);

    const totalDepth = bidDepth + askDepth;
    const imbalanceRatio = askDepth > 0 ? bidDepth / askDepth : bidDepth > 0 ? 10 : 1;
    const imbalancePercent = totalDepth > 0 ? ((bidDepth - askDepth) / totalDepth) * 100 : 0;

    const skew = imbalanceRatio > 1.5 ? 'BULLISH_SUPPORT' : imbalanceRatio < 0.66 ? 'BEARISH_RESISTANCE' : 'NEUTRAL';

    // 2. DETECT STOP CLUSTERS / LIQUIDITY POOLS FROM L2 DEPTH
    // Look for price levels with massive relative size spikes compared to the average size
    const allBidsAvg = bids.length > 0 ? bidDepth / bids.length : 1;
    const allAsksAvg = asks.length > 0 ? askDepth / asks.length : 1;

    const detectedStopClusters: StopCluster[] = [];

    // Bids - Potential Sell Stops Liquidity Pool (sitting below current price)
    bids.forEach(([price, size]) => {
        if (size > allBidsAvg * 1.8 && price < currentPrice) {
            const distancePips = Math.abs(currentPrice - price) * 10000;
            detectedStopClusters.push({
                price,
                size,
                type: 'SELL_STOP_LIQUIDITY',
                probability: size > allBidsAvg * 3 ? 'HIGH' : 'MEDIUM',
                distancePips
            });
        }
    });

    // Asks - Potential Buy Stops Liquidity Pool (sitting above current price)
    asks.forEach(([price, size]) => {
        if (size > allAsksAvg * 1.8 && price > currentPrice) {
            const distancePips = Math.abs(currentPrice - price) * 10000;
            detectedStopClusters.push({
                price,
                size,
                type: 'BUY_STOP_LIQUIDITY',
                probability: size > allAsksAvg * 3 ? 'HIGH' : 'MEDIUM',
                distancePips
            });
        }
    });

    // Sort detected stop clusters by size (largest pool first)
    detectedStopClusters.sort((a, b) => b.size - a.size);

    return {
        bidDepth,
        askDepth,
        imbalanceRatio,
        imbalancePercent,
        skew,
        detectedStopClusters: detectedStopClusters.slice(0, 4) // Return top 4 major pools
    };
};

// 2. VOLUMETRIC ABSORPTION DETECTION
// Scans historical candles for high-volume, compressed range bars representing large order absorption
export const detectAbsorptions = (candles: OHLC[]): AbsorptionLevel[] => {
    if (!candles || candles.length < 15) return [];

    const absorptions: AbsorptionLevel[] = [];
    
    // Calculate average volume & candle range (high-low) over the last 15 candles
    let totalVolume = 0;
    let totalRange = 0;
    
    candles.forEach(c => {
        totalVolume += (c as any).tick_volume || (c as any).volume || 1;
        totalRange += (c.high - c.low) || 0.0001;
    });

    const avgVolume = totalVolume / candles.length;
    const avgRange = totalRange / candles.length;

    // Detect absorption nodes
    for (let i = 2; i < candles.length; i++) {
        const c = candles[i];
        const vol = (c as any).tick_volume || (c as any).volume || 1;
        const range = c.high - c.low;

        if (range === 0) continue;

        // Condition 1: High Volume (at least 1.5x average)
        // Condition 2: Compressed candle range (spread is below average or open/close are extremely close relative to volume)
        const volumeScore = vol / avgVolume;
        const rangeScore = range / avgRange;

        if (volumeScore > 1.5 && rangeScore < 0.8) {
            const isBullish = c.close > c.open || (c.close === c.open && c.close > candles[i - 1].close);
            const strength = Math.min(100, Math.round((volumeScore / Math.max(0.1, rangeScore)) * 15));

            absorptions.push({
                price: parseFloat(((c.high + c.low) / 2).toFixed(5)),
                volume: vol,
                type: isBullish ? 'BULLISH_ABSORPTION' : 'BEARISH_ABSORPTION',
                time: c.epoch,
                strength
            });
        }
    }

    // Sort by absorption strength (highest first)
    return absorptions.sort((a, b) => b.strength - a.strength).slice(0, 5);
};

// 3. STATISTICAL STOP CLUSTER PREDICTOR
// If live L2 depth is unavailable, predicts likely stop clusters based on Swing Highs/Lows and ATR
export const predictStopClusters = (candles: OHLC[]): StopCluster[] => {
    if (!candles || candles.length < 30) return [];

    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const currentPrice = candles[candles.length - 1].close;

    // Calculate ATR (Average True Range)
    let totalTrueRange = 0;
    for (let i = 1; i < candles.length; i++) {
        const tr = Math.max(
            highs[i] - lows[i],
            Math.abs(highs[i] - candles[i - 1].close),
            Math.abs(lows[i] - candles[i - 1].close)
        );
        totalTrueRange += tr;
    }
    const atr = totalTrueRange / (candles.length - 1);

    const predicted: StopCluster[] = [];

    // Find major swing high/low points in the last 30 candles
    const getSwingPoints = () => {
        const swingHighs: { price: number, age: number }[] = [];
        const swingLows: { price: number, age: number }[] = [];

        for (let i = 2; i < candles.length - 2; i++) {
            if (highs[i] > highs[i - 1] && highs[i] > highs[i - 2] && highs[i] > highs[i + 1] && highs[i] > highs[i + 2]) {
                swingHighs.push({ price: highs[i], age: candles.length - 1 - i });
            }
            if (lows[i] < lows[i - 1] && lows[i] < lows[i - 2] && lows[i] < lows[i + 1] && lows[i] < lows[i + 2]) {
                swingLows.push({ price: lows[i], age: candles.length - 1 - i });
            }
        }
        return { swingHighs, swingLows };
    };

    const { swingHighs, swingLows } = getSwingPoints();

    // Buy Stops Liquidity Pool (just above major swing highs)
    swingHighs.forEach(sh => {
        const stopPrice = sh.price + (atr * 0.3); // Typically 0.3 ATR above swing high
        if (stopPrice > currentPrice) {
            const distancePips = Math.abs(currentPrice - stopPrice) * 10000;
            predicted.push({
                price: parseFloat(stopPrice.toFixed(5)),
                size: Math.round(100 - sh.age), // Higher probability if fresher
                type: 'BUY_STOP_LIQUIDITY',
                probability: sh.age < 10 ? 'HIGH' : 'MEDIUM',
                distancePips
            });
        }
    });

    // Sell Stops Liquidity Pool (just below major swing lows)
    swingLows.forEach(sl => {
        const stopPrice = sl.price - (atr * 0.3); // Typically 0.3 ATR below swing low
        if (stopPrice < currentPrice) {
            const distancePips = Math.abs(currentPrice - stopPrice) * 10000;
            predicted.push({
                price: parseFloat(stopPrice.toFixed(5)),
                size: Math.round(100 - sl.age),
                type: 'SELL_STOP_LIQUIDITY',
                probability: sl.age < 10 ? 'HIGH' : 'MEDIUM',
                distancePips
            });
        }
    });

    // Sort by fresh and major swing points
    return predicted.sort((a, b) => b.size - a.size).slice(0, 4);
};

export const analyzeOrderflow = (candles: OHLC[]): OrderflowMetrics => {
    if (!candles || candles.length < 5) {
        return {
            buyingPressure: 0,
            sellingPressure: 0,
            imbalanceRatio: 1,
            institutionalFootprint: 'NEUTRAL',
            exhaustionWarning: false,
            absorptions: []
        };
    }

    // Analyze the most recent window for micro-decisions
    const recentCandles = candles.slice(-5);
    
    let totalBuyingPressure = 0;
    let totalSellingPressure = 0;
    
    recentCandles.forEach(c => {
        // Upper wick = selling pressure
        const upperWick = c.high - Math.max(c.open, c.close);
        // Lower wick = buying pressure
        const lowerWick = Math.min(c.open, c.close) - c.low;
        // Body
        const body = Math.abs(c.close - c.open);
        
        if (c.close > c.open) {
            totalBuyingPressure += body + lowerWick;
            totalSellingPressure += upperWick;
        } else {
            totalSellingPressure += body + upperWick;
            totalBuyingPressure += lowerWick;
        }
    });

    // Avoid division by zero
    totalBuyingPressure = Math.max(totalBuyingPressure, 0.000001);
    totalSellingPressure = Math.max(totalSellingPressure, 0.000001);
    
    const imbalanceRatio = totalBuyingPressure / totalSellingPressure;
    
    let institutionalFootprint: 'STRONG_BUY' | 'WEAK_BUY' | 'NEUTRAL' | 'WEAK_SELL' | 'STRONG_SELL' = 'NEUTRAL';
    if (imbalanceRatio > 2.5) institutionalFootprint = 'STRONG_BUY';
    else if (imbalanceRatio > 1.5) institutionalFootprint = 'WEAK_BUY';
    else if (imbalanceRatio < 0.4) institutionalFootprint = 'STRONG_SELL';
    else if (imbalanceRatio < 0.7) institutionalFootprint = 'WEAK_SELL';
    
    // Exhaustion logic: price moving fast but wicks are getting longer
    const lastCandle = recentCandles[recentCandles.length - 1];
    
    let exhaustionWarning = false;
    if (institutionalFootprint.includes('BUY') && lastCandle.high - Math.max(lastCandle.open, lastCandle.close) > Math.abs(lastCandle.close - lastCandle.open) * 1.5) {
        exhaustionWarning = true;
    } else if (institutionalFootprint.includes('SELL') && Math.min(lastCandle.open, lastCandle.close) - lastCandle.low > Math.abs(lastCandle.open - lastCandle.close) * 1.5) {
        exhaustionWarning = true;
    }

    // Capture historical absorptions
    const absorptions = detectAbsorptions(candles);

    return {
        buyingPressure: totalBuyingPressure,
        sellingPressure: totalSellingPressure,
        imbalanceRatio,
        institutionalFootprint,
        exhaustionWarning,
        absorptions
    };
};

