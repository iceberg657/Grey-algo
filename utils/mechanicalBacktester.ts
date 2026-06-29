import { QuantEnginePipeline, MarketSeries } from './advancedExecutionEngines';

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
}

/**
 * Mechanical Backtester for Sniper Page
 * Rules:
 * - Quant system for selling in a bullish market and buying in a bearish market (Mean Reversion)
 * - EXCEPT Mondays: Trend following and observation
 * - Standard RR = 1:2.5
 */
export const runMechanicalAnalysis = (
    asset: string,
    timeframe: string,
    candles: any[],
    isMonday: boolean
): MechanicalTradeSetup => {
    // Basic pattern recognition without LLM
    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const currentPrice = closes[closes.length - 1];
    
    // Calculate simple moving average (SMA 20 and SMA 50)
    const sma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const sma50 = closes.slice(-50).reduce((a, b) => a + b, 0) / 50;

    const isBullish = sma20 > sma50 && currentPrice > sma20;
    const isBearish = sma20 < sma50 && currentPrice < sma20;

    let direction: 'BUY' | 'SELL' | 'FLAT' = 'FLAT';
    let logic = '';
    let pattern = 'NONE';

    if (isMonday) {
        // Monday: Trend following
        logic = 'Monday Rule: Trend Following & Observation.';
        if (isBullish) {
            direction = 'BUY';
            pattern = 'Trend Continuation (Bullish)';
        } else if (isBearish) {
            direction = 'SELL';
            pattern = 'Trend Continuation (Bearish)';
        } else {
            direction = 'FLAT';
            pattern = 'Ranging/Observation';
        }
    } else {
        // Other days: Quant Mean Reversion (Sell in Bullish, Buy in Bearish)
        logic = 'Quant Mean Reversion: Selling in Bullish, Buying in Bearish.';
        
        // Measure short-term deviation from SMA20 to trigger reversion
        const dev20 = ((currentPrice - sma20) / sma20) * 100;
        
        if (isBullish && dev20 > 0.1) {
            direction = 'SELL';
            pattern = 'Overextended Bullish (Mean Reversion)';
        } else if (isBearish && dev20 < -0.1) {
            direction = 'BUY';
            pattern = 'Oversold Bearish (Mean Reversion)';
        } else {
            direction = 'FLAT';
            pattern = 'Consolidating / In Range';
        }
    }

    // Standard RR 1:2
    const atr = calculateATR(highs, lows, closes, 14);
    let stopLoss = 0;
    let takeProfit = 0;
    const exactEntry = currentPrice;

    if (direction === 'BUY') {
        stopLoss = exactEntry - (atr * 1.5);
        const risk = exactEntry - stopLoss;
        takeProfit = exactEntry + (risk * 2.0); // 1:2 RR
    } else if (direction === 'SELL') {
        stopLoss = exactEntry + (atr * 1.5);
        const risk = stopLoss - exactEntry;
        takeProfit = exactEntry - (risk * 2.0); // 1:2 RR
    }

    return {
        asset,
        timeframe,
        direction,
        entryRange: { min: exactEntry, max: exactEntry },
        stopLoss: parseFloat(stopLoss.toFixed(5)),
        takeProfit: parseFloat(takeProfit.toFixed(5)),
        riskRewardRatio: 2.0,
        timestamp: Date.now(),
        pattern,
        logic
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
    maxTrades: number = 10
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
            const setup = runMechanicalAnalysis(asset, timeframe, historySlice, isMonday);
            
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
