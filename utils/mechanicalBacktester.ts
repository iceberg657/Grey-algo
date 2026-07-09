import { QuantEnginePipeline, MarketSeries } from './advancedExecutionEngines';
import { autoSelectStrategy } from './quantStrategiesLibrary';
import { KalmanFilter } from './kalmanFilter';

export interface MechanicalTradeSetup {
    asset: string;
    timeframe: string; // "15m", "30m", "1h", "5m"
    direction: 'BUY' | 'SELL' | 'FLAT';
    entryRange: { min: number; max: number };
    stopLoss: number;
    takeProfit: number;
    riskRewardRatio: number;
    timestamp: number;
    pattern: string;
    logic: string;
    strategyName?: string;
}

/**
 * Mechanical Backtester for Sniper Page
 * Incorporates 50+ Quant Trading Strategies auto-selected by asset and market condition.
 */
export const runMechanicalAnalysis = (
    asset: string,
    timeframe: string,
    candles: any[],
    isMonday: boolean,
    selectedRR?: number,
    selectedSystem?: string,
    selectedStrategy?: string
): MechanicalTradeSetup => {
    if (!candles || candles.length < 50) {
        return {
            asset,
            timeframe,
            direction: 'FLAT',
            entryRange: { min: 0, max: 0 },
            stopLoss: 0,
            takeProfit: 0,
            riskRewardRatio: 2.0,
            timestamp: Date.now(),
            pattern: 'NONE',
            logic: 'Not enough candle data for hybrid scanner',
            strategyName: 'CMP + OHLC Hybrid Strategy'
        };
    }

    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const currentPrice = closes[closes.length - 1] || 0;
    const currentCandle = candles[candles.length - 1];

    // Determine compression factor for OHLC Compression Strategy
    let compressionFactor = 4;
    if (timeframe === '5m') compressionFactor = 12;
    else if (timeframe === '15m') compressionFactor = 4;
    else if (timeframe === '30m') compressionFactor = 2;
    else if (timeframe === '1h') compressionFactor = 4;

    // 1. Compress raw candles to synthetic higher-timeframe candles
    const compressedCandles: any[] = [];
    for (let i = 0; i < candles.length; i += compressionFactor) {
        const slice = candles.slice(i, i + compressionFactor);
        if (slice.length === 0) continue;
        const open = slice[0].open;
        const close = slice[slice.length - 1].close;
        const high = Math.max(...slice.map(c => c.high));
        const low = Math.min(...slice.map(c => c.low));
        const epoch = slice[0].epoch;
        compressedCandles.push({ open, high, low, close, epoch });
    }

    // 2. Identify the most recent synthetic Order Blocks (OB) on the synthetic HTF chart
    let bullishOB: { min: number, max: number } | null = null;
    let bearishOB: { min: number, max: number } | null = null;
    
    if (compressedCandles.length >= 4) {
        for (let i = compressedCandles.length - 3; i >= 1; i--) {
            const prev = compressedCandles[i];
            const next1 = compressedCandles[i + 1];
            
            if (!bullishOB && prev.close < prev.open && next1.close > prev.high) {
                bullishOB = { min: prev.low, max: prev.high };
            }
            
            if (!bearishOB && prev.close > prev.open && next1.close < prev.low) {
                bearishOB = { min: prev.low, max: prev.high };
            }
            
            if (bullishOB && bearishOB) break;
        }
    }

    // 3. Find structural Swing Points across raw candles (excluding current active candle)
    const rawHistory = candles.slice(0, -1);
    const swingHighs: { index: number, price: number }[] = [];
    const swingLows: { index: number, price: number }[] = [];
    const leftBars = 3;
    const rightBars = 3;

    for (let i = leftBars; i < rawHistory.length - rightBars; i++) {
        const currentHigh = rawHistory[i].high;
        const currentLow = rawHistory[i].low;
        
        let isSwingHigh = true;
        let isSwingLow = true;
        
        for (let j = i - leftBars; j <= i + rightBars; j++) {
            if (j === i) continue;
            if (rawHistory[j].high >= currentHigh) isSwingHigh = false;
            if (rawHistory[j].low <= currentLow) isSwingLow = false;
        }
        
        if (isSwingHigh) swingHighs.push({ index: i, price: currentHigh });
        if (isSwingLow) swingLows.push({ index: i, price: currentLow });
    }

    // Sort to get the most recent swing points first
    swingHighs.sort((a, b) => b.index - a.index);
    swingLows.sort((a, b) => b.index - a.index);

    // 4. Evaluate combined CMP and OHLC strategies, and Mean Reversion
    let direction: 'BUY' | 'SELL' | 'FLAT' = 'FLAT';
    let logic = '';
    let pattern = 'NONE';
    let strategyName = 'CMP + OHLC Hybrid Strategy';
    
    let isSwingSweepTriggered = false;
    const exactEntry = currentPrice;
    const atr = calculateATR(highs, lows, closes, 14);
    let stopLoss = 0;
    let takeProfit = 0;

    // Check Mean Reversion (Category 1: Price Level Mean Reversion)
    const sma20 = calculateSMA(closes, 20);
    const sma50 = calculateSMA(closes, 50);
    const sd20 = calculateStandardDeviation(closes, 20, sma20);
    const rsi14 = calculateRSI(closes, 14);
    
    // Kalman Filter implementation
    const kalman = new KalmanFilter(0.01, 0.001, 1, 1);
    let kalmanEstimate = closes[0];
    let prevKalmanEstimate = closes[0];
    for (let i = 0; i < closes.length; i++) {
        prevKalmanEstimate = kalmanEstimate;
        kalmanEstimate = kalman.filter(closes[i], i === 0);
    }
    const kalmanSlope = kalmanEstimate - prevKalmanEstimate;
    
    // Kill-Switch: Highly Trending Regime Filter
    // If the difference between fast and slow SMA is massive, it indicates a heavy one-way trend
    const isHighlyTrending = Math.abs(sma20 - sma50) > (atr * 2.0);
    
    const upperBB3 = kalmanEstimate + (sd20 * 2.5); // Using Kalman for center
    const lowerBB3 = kalmanEstimate - (sd20 * 2.5);

    // Category 2: Return Mean Reversion (Signature Leg)
    const current4H = candles.slice(Math.max(0, candles.length - 16)); // approx 4h if 15m TF
    const max4H = Math.max(...current4H.map(c => c.high));
    const min4H = Math.min(...current4H.map(c => c.low));
    const move4H = max4H - min4H;
    const isSignatureLeg = move4H > (atr * 3.5);

    // Apply selected strategy
    if (selectedStrategy === 'auto_select') {
        const auto = autoSelectStrategy(candles, 'Indices', isHighlyTrending ? 'Trending' : 'Ranging');
        if (auto) {
            direction = auto.result.direction;
            logic = auto.result.logic;
            pattern = auto.result.pattern;
            strategyName = auto.strategy.name;
            
            stopLoss = direction === 'BUY' ? currentPrice - (atr * 1.5) : currentPrice + (atr * 1.5);
            const risk = Math.abs(currentPrice - stopLoss);
            takeProfit = direction === 'BUY' ? currentPrice + (risk * 2.0) : currentPrice - (risk * 2.0);
        }
    } else {
        // Hybrid or Mean Reversion or Trend
        if ((selectedStrategy === 'hybrid' || selectedStrategy === 'mean_reversion') && !isHighlyTrending) {
            // Check for momentum shift with Kalman Slope
            const bullishShift = kalmanSlope > 0;
            const bearishShift = kalmanSlope < 0;

            if (currentCandle.low < lowerBB3 && rsi14 < 35 && bullishShift) {
                direction = 'BUY';
                logic = `Kalman Mean Reversion: Price dropped below smoothed SD band (${lowerBB3.toFixed(5)}), RSI (${rsi14.toFixed(1)}). Kalman slope flattening/reversing.`;
                pattern = 'Kalman Band Exhaustion';
                strategyName = 'Kalman Mean Reversion (Scalp)';
                isSwingSweepTriggered = true;
                
                stopLoss = exactEntry - (atr * 0.8);
                const risk = exactEntry - stopLoss;
                takeProfit = exactEntry + (risk * 1.5); // 1:1.5 RR for scalps
            }
            else if (currentCandle.high > upperBB3 && rsi14 > 65 && bearishShift) {
                direction = 'SELL';
                logic = `Kalman Mean Reversion: Price pumped above smoothed SD band (${upperBB3.toFixed(5)}), RSI (${rsi14.toFixed(1)}). Kalman slope flattening/reversing.`;
                pattern = 'Kalman Band Exhaustion';
                strategyName = 'Kalman Mean Reversion (Scalp)';
                isSwingSweepTriggered = true;
                
                stopLoss = exactEntry + (atr * 0.8);
                const risk = stopLoss - exactEntry;
                takeProfit = exactEntry - (risk * 1.5); // 1:1.5 RR for scalps
            }
            else if (isSignatureLeg && currentPrice <= min4H + (atr * 0.5) && bullishShift) {
                direction = 'BUY';
                logic = `Kalman Return Reversion: Dropped ${move4H.toFixed(5)}, Kalman intercept confirms bottom.`;
                pattern = 'Signature Leg Exhaustion';
                strategyName = 'Return Mean Reversion (Scalp)';
                isSwingSweepTriggered = true;
                
                stopLoss = min4H - (atr * 0.5);
                const risk = exactEntry - stopLoss;
                takeProfit = exactEntry + (risk * 1.5);
            }
            else if (isSignatureLeg && currentPrice >= max4H - (atr * 0.5) && bearishShift) {
                direction = 'SELL';
                logic = `Kalman Return Reversion: Pumped ${move4H.toFixed(5)}, Kalman intercept confirms top.`;
                pattern = 'Signature Leg Exhaustion';
                strategyName = 'Return Mean Reversion (Scalp)';
                isSwingSweepTriggered = true;
                
                stopLoss = max4H + (atr * 0.5);
                const risk = stopLoss - exactEntry;
                takeProfit = exactEntry - (risk * 1.5);
            }
        }

        if (selectedStrategy === 'trend' && isHighlyTrending) {
            // Basic Trend Following Logic
            if (sma20 > sma50 && currentPrice > sma20) {
                direction = 'BUY';
                logic = `Trend Following: Price above fast SMA which is above slow SMA in a highly trending regime.`;
                pattern = 'SMA Trend Alignment';
                strategyName = 'Trend Following';
                isSwingSweepTriggered = true;
                stopLoss = sma50;
                const risk = exactEntry - stopLoss;
                takeProfit = exactEntry + (risk * 2.0);
            } else if (sma20 < sma50 && currentPrice < sma20) {
                direction = 'SELL';
                logic = `Trend Following: Price below fast SMA which is below slow SMA in a highly trending regime.`;
                pattern = 'SMA Trend Alignment';
                strategyName = 'Trend Following';
                isSwingSweepTriggered = true;
                stopLoss = sma50;
                const risk = stopLoss - exactEntry;
                takeProfit = exactEntry - (risk * 2.0);
            }
        }

        // Fallback to OHLC Swing Sweep if Mean Reversion/Trend not triggered
        if (!isSwingSweepTriggered && (selectedStrategy === 'hybrid' || !selectedStrategy)) {

    // Check for swing low sweep (Bullish Swing Invalidation)
    const activeLows = swingLows.filter(l => l.price < currentPrice);
    const recentSwingLow = activeLows.length > 0 ? activeLows[0] : null;

    // Check for swing high sweep (Bearish Swing Invalidation)
    const activeHighs = swingHighs.filter(h => h.price > currentPrice);
    const recentSwingHigh = activeHighs.length > 0 ? activeHighs[0] : null;

    if (recentSwingLow && currentCandle.low < recentSwingLow.price && currentPrice >= recentSwingLow.price) {
        direction = 'BUY';
        logic = `CMP swept structural swing low (${recentSwingLow.price.toFixed(5)}) but closed back above (OHLC Swing Invalidation)`;
        pattern = 'Liquidity Sweep';
        strategyName = 'CMP + OHLC Swing Invalidation';
        isSwingSweepTriggered = true;
        
        stopLoss = Math.min(currentCandle.low, recentSwingLow.price) - (atr * 0.5);
        const risk = exactEntry - stopLoss;
        takeProfit = exactEntry + (risk * 2.0);
    } 
    else if (recentSwingHigh && currentCandle.high > recentSwingHigh.price && currentPrice <= recentSwingHigh.price) {
        direction = 'SELL';
        logic = `CMP swept structural swing high (${recentSwingHigh.price.toFixed(5)}) but closed back below (OHLC Swing Invalidation)`;
        pattern = 'Liquidity Sweep';
        strategyName = 'CMP + OHLC Swing Invalidation';
        isSwingSweepTriggered = true;
        
        stopLoss = Math.max(currentCandle.high, recentSwingHigh.price) + (atr * 0.5);
        const risk = stopLoss - exactEntry;
        takeProfit = exactEntry - (risk * 2.0);
    }

    // If no swing sweep, check for synthetic HTF OB Mitigation (CMP mitigation of synthetic levels)
    if (!isSwingSweepTriggered) {
        if (bullishOB && currentPrice >= bullishOB.min && currentPrice <= bullishOB.max) {
            direction = 'BUY';
            logic = `CMP mitigated synthetic HTF Bullish Order Block zone [${bullishOB.min.toFixed(5)} - ${bullishOB.max.toFixed(5)}] (OHLC Compression)`;
            pattern = 'OB Mitigation';
            strategyName = 'CMP + OHLC Synthetic OB';
            
            stopLoss = bullishOB.min - (atr * 0.5);
            const risk = exactEntry - stopLoss;
            takeProfit = exactEntry + (risk * 2.0);
        } 
        else if (bearishOB && currentPrice >= bearishOB.min && currentPrice <= bearishOB.max) {
            direction = 'SELL';
            logic = `CMP mitigated synthetic HTF Bearish Order Block zone [${bearishOB.min.toFixed(5)} - ${bearishOB.max.toFixed(5)}] (OHLC Compression)`;
            pattern = 'OB Mitigation';
            strategyName = 'CMP + OHLC Synthetic OB';
            
            stopLoss = bearishOB.max + (atr * 0.5);
            const risk = stopLoss - exactEntry;
            takeProfit = exactEntry - (risk * 2.0);
        }
    }
    } // Close fallback for OHLC swing sweep
    } // Close selected strategy else block

    if (direction === 'FLAT') {
        stopLoss = currentPrice;
        takeProfit = currentPrice;
    } else {
        const minRisk = currentPrice * 0.0005;
        if (direction === 'BUY' && (currentPrice - stopLoss) < minRisk) {
            stopLoss = currentPrice - minRisk;
            takeProfit = currentPrice + (minRisk * 2.0);
        } else if (direction === 'SELL' && (stopLoss - currentPrice) < minRisk) {
            stopLoss = currentPrice + minRisk;
            takeProfit = currentPrice - (minRisk * 2.0);
        }
    }

    const finalRR = selectedRR || 2.0;

    if (direction !== 'FLAT') {
        const risk = Math.abs(exactEntry - stopLoss);
        if (direction === 'BUY') {
            takeProfit = exactEntry + (risk * finalRR);
        } else if (direction === 'SELL') {
            takeProfit = exactEntry - (risk * finalRR);
        }
    }

    return {
        asset,
        timeframe,
        direction,
        entryRange: { min: exactEntry, max: exactEntry },
        stopLoss: parseFloat(stopLoss.toFixed(5)),
        takeProfit: parseFloat(takeProfit.toFixed(5)),
        riskRewardRatio: finalRR,
        timestamp: Date.now(),
        pattern,
        logic,
        strategyName
    };
};

export interface BacktestTradeResult {
    setup: MechanicalTradeSetup;
    outcome: 'WIN' | 'LOSS' | 'OPEN';
    pnl: number;
    exitPrice: number;
    entryTime: number;
    exitTime: number;
}

export const runHistoricalDeepBacktest = (
    asset: string,
    timeframe: string,
    candles: any[],
    maxTrades: number = 10,
    selectedRR?: number,
    selectedSystem?: string,
    selectedStrategy?: string
): BacktestTradeResult[] => {
    const results: BacktestTradeResult[] = [];
    let currentTrade: BacktestTradeResult | null = null;
    let tradesToday = 0;
    
    // We need at least 50 candles for SMA50
    for (let i = 50; i < candles.length; i++) {
        const currentCandle = candles[i];
        const date = new Date(currentCandle.epoch ? currentCandle.epoch * 1000 : Date.now());
        const isMonday = date.getDay() === 1;

        if (currentTrade) {
            // Check if SL or TP is hit
            const setup = currentTrade.setup;
            const high = currentCandle.high;
            const low = currentCandle.low;
            
            let closed = false;
            if (setup.direction === 'BUY') {
                if (low <= setup.stopLoss) {
                    currentTrade.outcome = 'LOSS';
                    currentTrade.exitPrice = setup.stopLoss;
                    closed = true;
                } else if (high >= setup.takeProfit) {
                    currentTrade.outcome = 'WIN';
                    currentTrade.exitPrice = setup.takeProfit;
                    closed = true;
                }
            } else if (setup.direction === 'SELL') {
                if (high >= setup.stopLoss) {
                    currentTrade.outcome = 'LOSS';
                    currentTrade.exitPrice = setup.stopLoss;
                    closed = true;
                } else if (low <= setup.takeProfit) {
                    currentTrade.outcome = 'WIN';
                    currentTrade.exitPrice = setup.takeProfit;
                    closed = true;
                }
            }

            if (closed) {
                currentTrade.exitTime = currentCandle.epoch ? currentCandle.epoch * 1000 : Date.now();
                
                // Calculate PnL (rough estimate based on risk)
                const riskAmount = Math.abs(setup.entryRange.min - setup.stopLoss);
                if (currentTrade.outcome === 'WIN') {
                    currentTrade.pnl = riskAmount * setup.riskRewardRatio;
                } else {
                    currentTrade.pnl = -riskAmount;
                }

                results.push({ ...currentTrade });
                currentTrade = null;
            }
            
        } else {
            if (tradesToday >= maxTrades) {
                // simple reset logic could be added here if we track days
                continue; // Wait until next day? For simplicity just capping total or continuing. 
                // Wait, if it's 10 trades *daily*, we should reset tradesToday when the day changes.
            }

            // Run analysis on slice up to i
            const historySlice = candles.slice(0, i + 1);
            const setup = runMechanicalAnalysis(asset, timeframe, historySlice, isMonday, selectedRR, selectedSystem, selectedStrategy);
            
            if (setup.direction !== 'FLAT') {
                currentTrade = {
                    setup,
                    outcome: 'OPEN',
                    pnl: 0,
                    exitPrice: 0,
                    entryTime: currentCandle.epoch ? currentCandle.epoch * 1000 : Date.now(),
                    exitTime: 0
                };
                tradesToday++;
            }
        }
        
        // Reset trades today on new day (rough check based on modulo if using epochs, but date object is better)
        if (i > 0) {
            const prevCandle = candles[i-1];
            const prevDate = new Date(prevCandle.epoch ? prevCandle.epoch * 1000 : Date.now());
            if (date.getDate() !== prevDate.getDate()) {
                tradesToday = 0;
            }
        }
    }

    return results;
};

function calculateATR(highs: number[], lows: number[], closes: number[], period: number): number {
    if (highs.length < period + 1) return 0;
    const tr = [];
    for (let i = 1; i < highs.length; i++) {
        const h = highs[i];
        const l = lows[i];
        const prevC = closes[i - 1];
        const trVal = Math.max(h - l, Math.abs(h - prevC), Math.abs(l - prevC));
        tr.push(trVal);
    }
    const sum = tr.slice(-period).reduce((a, b) => a + b, 0);
    return sum / period;
}

function calculateSMA(data: number[], period: number): number {
    if (data.length < period) return 0;
    const sum = data.slice(-period).reduce((a, b) => a + b, 0);
    return sum / period;
}

function calculateStandardDeviation(data: number[], period: number, sma: number): number {
    if (data.length < period) return 0;
    const slice = data.slice(-period);
    const squaredDiffs = slice.map(x => Math.pow(x - sma, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
    return Math.sqrt(variance);
}

function calculateRSI(closes: number[], period: number): number {
    if (closes.length < period + 1) return 50;
    let gains = 0;
    let losses = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
        const diff = closes[i] - closes[i - 1];
        if (diff >= 0) gains += diff;
        else losses -= diff;
    }
    if (losses === 0) return 100;
    if (gains === 0) return 0;
    const rs = gains / losses;
    return 100 - (100 / (1 + rs));
}
