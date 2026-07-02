
export interface QuantStrategy {
    id: string;
    name: string;
    category: 'Trend' | 'Mean Reversion' | 'Momentum' | 'Breakout' | 'Volatility' | 'Volume' | 'Statistical';
    suitableAssetClasses: string[];
    suitableMarketConditions: string[];
    analyze: (candles: any[], assetClass: string, marketCondition: string) => { direction: 'BUY' | 'SELL' | 'FLAT', logic: string, pattern: string };
}

function calculateSMA(data, period) {
    if (data.length < period) return 0;
    return data.slice(-period).reduce((a, b) => a + b, 0) / period;
}

function calculateEMA(data, period) {
    if (data.length < period) return 0;
    const k = 2 / (period + 1);
    let ema = data[data.length - period];
    for (let i = data.length - period + 1; i < data.length; i++) {
        ema = data[i] * k + ema * (1 - k);
    }
    return ema;
}

function calculateRSI(data, period) {
    if (data.length < period + 1) return 50;
    let gains = 0, losses = 0;
    for(let i = data.length - period; i < data.length; i++) {
        const diff = data[i] - data[i-1];
        if(diff >= 0) gains += diff;
        else losses -= diff;
    }
    if (losses === 0) return 100;
    const rs = gains / losses;
    return 100 - (100 / (1 + rs));
}

export const quantStrategies: QuantStrategy[] = [

    {
        id: 'strat_1',
        name: 'Quant Strategy 1 - Mean Reversion',
        category: 'Mean Reversion',
        suitableAssetClasses: ['Forex', 'Indices', 'Crypto', 'Commodities', 'Synthetics'],
        suitableMarketConditions: ['Bearish', 'All'],
        analyze: (candles, assetClass, marketCondition) => {
            if (candles.length < 50) return { direction: 'FLAT', logic: 'Not enough data', pattern: 'None' };
            
        const closes = candles.map(c => c.close);
        const rsi = calculateRSI(closes, 14);
        if (rsi < 30) return { direction: 'BUY', logic: 'Oversold RSI', pattern: 'RSI Bottom' };
        if (rsi > 70) return { direction: 'SELL', logic: 'Overbought RSI', pattern: 'RSI Top' };
        return { direction: 'FLAT', logic: 'RSI in neutral zone', pattern: 'None' };
        
        }
    },
    {
        id: 'strat_2',
        name: 'Quant Strategy 2 - Momentum',
        category: 'Momentum',
        suitableAssetClasses: ['Forex', 'Indices', 'Crypto', 'Commodities', 'Synthetics'],
        suitableMarketConditions: ['Ranging', 'All'],
        analyze: (candles, assetClass, marketCondition) => {
            if (candles.length < 50) return { direction: 'FLAT', logic: 'Not enough data', pattern: 'None' };
            
        const closes = candles.map(c => c.close);
        const ema9 = calculateEMA(closes, 9);
        const ema21 = calculateEMA(closes, 21);
        if (ema9 > ema21) return { direction: 'BUY', logic: 'EMA Momentum Bullish', pattern: 'Bullish Momentum' };
        if (ema9 < ema21) return { direction: 'SELL', logic: 'EMA Momentum Bearish', pattern: 'Bearish Momentum' };
        return { direction: 'FLAT', logic: 'No momentum', pattern: 'None' };
        
        }
    },
    {
        id: 'strat_3',
        name: 'Quant Strategy 3 - Breakout',
        category: 'Breakout',
        suitableAssetClasses: ['Forex', 'Indices', 'Crypto', 'Commodities', 'Synthetics'],
        suitableMarketConditions: ['Volatile', 'All'],
        analyze: (candles, assetClass, marketCondition) => {
            if (candles.length < 50) return { direction: 'FLAT', logic: 'Not enough data', pattern: 'None' };
            
        const highs = candles.map(c => c.high);
        const lows = candles.map(c => c.low);
        const closes = candles.map(c => c.close);
        const currentClose = closes[closes.length - 1];
        const prevHigh = highs[highs.length - 2];
        const prevLow = lows[lows.length - 2];
        if (currentClose > prevHigh) return { direction: 'BUY', logic: 'Previous Candle High Breakout', pattern: 'Bullish Breakout' };
        if (currentClose < prevLow) return { direction: 'SELL', logic: 'Previous Candle Low Breakout', pattern: 'Bearish Breakout' };
        return { direction: 'FLAT', logic: 'Inside bar / No breakout', pattern: 'None' };
        
        }
    },
    {
        id: 'strat_4',
        name: 'Quant Strategy 4 - Volatility',
        category: 'Volatility',
        suitableAssetClasses: ['Forex', 'Indices', 'Crypto', 'Commodities', 'Synthetics'],
        suitableMarketConditions: ['Low Volatility', 'All'],
        analyze: (candles, assetClass, marketCondition) => {
            if (candles.length < 50) return { direction: 'FLAT', logic: 'Not enough data', pattern: 'None' };
            
        const closes = candles.map(c => c.close);
        const sma20 = calculateSMA(closes, 20);
        const current = closes[closes.length - 1];
        const deviation = (current - sma20) / sma20;
        if (deviation < -0.02) return { direction: 'BUY', logic: 'Mean Reversion from lower band', pattern: 'Dip Buying' };
        if (deviation > 0.02) return { direction: 'SELL', logic: 'Mean Reversion from upper band', pattern: 'Top Selling' };
        return { direction: 'FLAT', logic: 'Price near mean', pattern: 'None' };
        
        }
    },
    {
        id: 'strat_5',
        name: 'Quant Strategy 5 - Volume',
        category: 'Volume',
        suitableAssetClasses: ['Forex', 'Indices', 'Crypto', 'Commodities', 'Synthetics'],
        suitableMarketConditions: ['Bullish', 'All'],
        analyze: (candles, assetClass, marketCondition) => {
            if (candles.length < 50) return { direction: 'FLAT', logic: 'Not enough data', pattern: 'None' };
            
        const closes = candles.map(c => c.close);
        const sma20 = calculateSMA(closes, 20);
        const sma50 = calculateSMA(closes, 50);
        const current = closes[closes.length - 1];
        if (current > sma20 && sma20 > sma50) return { direction: 'BUY', logic: 'SMA Crossover Bullish', pattern: 'Golden Cross' };
        if (current < sma20 && sma20 < sma50) return { direction: 'SELL', logic: 'SMA Crossover Bearish', pattern: 'Death Cross' };
        return { direction: 'FLAT', logic: 'No clear trend', pattern: 'None' };
        
        }
    },
    {
        id: 'strat_6',
        name: 'Quant Strategy 6 - Statistical',
        category: 'Statistical',
        suitableAssetClasses: ['Forex', 'Indices', 'Crypto', 'Commodities', 'Synthetics'],
        suitableMarketConditions: ['Bearish', 'All'],
        analyze: (candles, assetClass, marketCondition) => {
            if (candles.length < 50) return { direction: 'FLAT', logic: 'Not enough data', pattern: 'None' };
            
        const closes = candles.map(c => c.close);
        const rsi = calculateRSI(closes, 14);
        if (rsi < 30) return { direction: 'BUY', logic: 'Oversold RSI', pattern: 'RSI Bottom' };
        if (rsi > 70) return { direction: 'SELL', logic: 'Overbought RSI', pattern: 'RSI Top' };
        return { direction: 'FLAT', logic: 'RSI in neutral zone', pattern: 'None' };
        
        }
    },
    {
        id: 'strat_7',
        name: 'Quant Strategy 7 - Trend',
        category: 'Trend',
        suitableAssetClasses: ['Forex', 'Indices', 'Crypto', 'Commodities', 'Synthetics'],
        suitableMarketConditions: ['Ranging', 'All'],
        analyze: (candles, assetClass, marketCondition) => {
            if (candles.length < 50) return { direction: 'FLAT', logic: 'Not enough data', pattern: 'None' };
            
        const closes = candles.map(c => c.close);
        const ema9 = calculateEMA(closes, 9);
        const ema21 = calculateEMA(closes, 21);
        if (ema9 > ema21) return { direction: 'BUY', logic: 'EMA Momentum Bullish', pattern: 'Bullish Momentum' };
        if (ema9 < ema21) return { direction: 'SELL', logic: 'EMA Momentum Bearish', pattern: 'Bearish Momentum' };
        return { direction: 'FLAT', logic: 'No momentum', pattern: 'None' };
        
        }
    },
    {
        id: 'strat_8',
        name: 'Quant Strategy 8 - Mean Reversion',
        category: 'Mean Reversion',
        suitableAssetClasses: ['Forex', 'Indices', 'Crypto', 'Commodities', 'Synthetics'],
        suitableMarketConditions: ['Volatile', 'All'],
        analyze: (candles, assetClass, marketCondition) => {
            if (candles.length < 50) return { direction: 'FLAT', logic: 'Not enough data', pattern: 'None' };
            
        const highs = candles.map(c => c.high);
        const lows = candles.map(c => c.low);
        const closes = candles.map(c => c.close);
        const currentClose = closes[closes.length - 1];
        const prevHigh = highs[highs.length - 2];
        const prevLow = lows[lows.length - 2];
        if (currentClose > prevHigh) return { direction: 'BUY', logic: 'Previous Candle High Breakout', pattern: 'Bullish Breakout' };
        if (currentClose < prevLow) return { direction: 'SELL', logic: 'Previous Candle Low Breakout', pattern: 'Bearish Breakout' };
        return { direction: 'FLAT', logic: 'Inside bar / No breakout', pattern: 'None' };
        
        }
    },
    {
        id: 'strat_9',
        name: 'Quant Strategy 9 - Momentum',
        category: 'Momentum',
        suitableAssetClasses: ['Forex', 'Indices', 'Crypto', 'Commodities', 'Synthetics'],
        suitableMarketConditions: ['Low Volatility', 'All'],
        analyze: (candles, assetClass, marketCondition) => {
            if (candles.length < 50) return { direction: 'FLAT', logic: 'Not enough data', pattern: 'None' };
            
        const closes = candles.map(c => c.close);
        const sma20 = calculateSMA(closes, 20);
        const current = closes[closes.length - 1];
        const deviation = (current - sma20) / sma20;
        if (deviation < -0.02) return { direction: 'BUY', logic: 'Mean Reversion from lower band', pattern: 'Dip Buying' };
        if (deviation > 0.02) return { direction: 'SELL', logic: 'Mean Reversion from upper band', pattern: 'Top Selling' };
        return { direction: 'FLAT', logic: 'Price near mean', pattern: 'None' };
        
        }
    },
    {
        id: 'strat_10',
        name: 'Quant Strategy 10 - Breakout',
        category: 'Breakout',
        suitableAssetClasses: ['Forex', 'Indices', 'Crypto', 'Commodities', 'Synthetics'],
        suitableMarketConditions: ['Bullish', 'All'],
        analyze: (candles, assetClass, marketCondition) => {
            if (candles.length < 50) return { direction: 'FLAT', logic: 'Not enough data', pattern: 'None' };
            
        const closes = candles.map(c => c.close);
        const sma20 = calculateSMA(closes, 20);
        const sma50 = calculateSMA(closes, 50);
        const current = closes[closes.length - 1];
        if (current > sma20 && sma20 > sma50) return { direction: 'BUY', logic: 'SMA Crossover Bullish', pattern: 'Golden Cross' };
        if (current < sma20 && sma20 < sma50) return { direction: 'SELL', logic: 'SMA Crossover Bearish', pattern: 'Death Cross' };
        return { direction: 'FLAT', logic: 'No clear trend', pattern: 'None' };
        
        }
    },
    {
        id: 'strat_11',
        name: 'Quant Strategy 11 - Volatility',
        category: 'Volatility',
        suitableAssetClasses: ['Forex', 'Indices', 'Crypto', 'Commodities', 'Synthetics'],
        suitableMarketConditions: ['Bearish', 'All'],
        analyze: (candles, assetClass, marketCondition) => {
            if (candles.length < 50) return { direction: 'FLAT', logic: 'Not enough data', pattern: 'None' };
            
        const closes = candles.map(c => c.close);
        const rsi = calculateRSI(closes, 14);
        if (rsi < 30) return { direction: 'BUY', logic: 'Oversold RSI', pattern: 'RSI Bottom' };
        if (rsi > 70) return { direction: 'SELL', logic: 'Overbought RSI', pattern: 'RSI Top' };
        return { direction: 'FLAT', logic: 'RSI in neutral zone', pattern: 'None' };
        
        }
    },
    {
        id: 'strat_12',
        name: 'Quant Strategy 12 - Volume',
        category: 'Volume',
        suitableAssetClasses: ['Forex', 'Indices', 'Crypto', 'Commodities', 'Synthetics'],
        suitableMarketConditions: ['Ranging', 'All'],
        analyze: (candles, assetClass, marketCondition) => {
            if (candles.length < 50) return { direction: 'FLAT', logic: 'Not enough data', pattern: 'None' };
            
        const closes = candles.map(c => c.close);
        const ema9 = calculateEMA(closes, 9);
        const ema21 = calculateEMA(closes, 21);
        if (ema9 > ema21) return { direction: 'BUY', logic: 'EMA Momentum Bullish', pattern: 'Bullish Momentum' };
        if (ema9 < ema21) return { direction: 'SELL', logic: 'EMA Momentum Bearish', pattern: 'Bearish Momentum' };
        return { direction: 'FLAT', logic: 'No momentum', pattern: 'None' };
        
        }
    },
    {
        id: 'strat_13',
        name: 'Quant Strategy 13 - Statistical',
        category: 'Statistical',
        suitableAssetClasses: ['Forex', 'Indices', 'Crypto', 'Commodities', 'Synthetics'],
        suitableMarketConditions: ['Volatile', 'All'],
        analyze: (candles, assetClass, marketCondition) => {
            if (candles.length < 50) return { direction: 'FLAT', logic: 'Not enough data', pattern: 'None' };
            
        const highs = candles.map(c => c.high);
        const lows = candles.map(c => c.low);
        const closes = candles.map(c => c.close);
        const currentClose = closes[closes.length - 1];
        const prevHigh = highs[highs.length - 2];
        const prevLow = lows[lows.length - 2];
        if (currentClose > prevHigh) return { direction: 'BUY', logic: 'Previous Candle High Breakout', pattern: 'Bullish Breakout' };
        if (currentClose < prevLow) return { direction: 'SELL', logic: 'Previous Candle Low Breakout', pattern: 'Bearish Breakout' };
        return { direction: 'FLAT', logic: 'Inside bar / No breakout', pattern: 'None' };
        
        }
    },
    {
        id: 'strat_14',
        name: 'Quant Strategy 14 - Trend',
        category: 'Trend',
        suitableAssetClasses: ['Forex', 'Indices', 'Crypto', 'Commodities', 'Synthetics'],
        suitableMarketConditions: ['Low Volatility', 'All'],
        analyze: (candles, assetClass, marketCondition) => {
            if (candles.length < 50) return { direction: 'FLAT', logic: 'Not enough data', pattern: 'None' };
            
        const closes = candles.map(c => c.close);
        const sma20 = calculateSMA(closes, 20);
        const current = closes[closes.length - 1];
        const deviation = (current - sma20) / sma20;
        if (deviation < -0.02) return { direction: 'BUY', logic: 'Mean Reversion from lower band', pattern: 'Dip Buying' };
        if (deviation > 0.02) return { direction: 'SELL', logic: 'Mean Reversion from upper band', pattern: 'Top Selling' };
        return { direction: 'FLAT', logic: 'Price near mean', pattern: 'None' };
        
        }
    },
    {
        id: 'strat_15',
        name: 'Quant Strategy 15 - Mean Reversion',
        category: 'Mean Reversion',
        suitableAssetClasses: ['Forex', 'Indices', 'Crypto', 'Commodities', 'Synthetics'],
        suitableMarketConditions: ['Bullish', 'All'],
        analyze: (candles, assetClass, marketCondition) => {
            if (candles.length < 50) return { direction: 'FLAT', logic: 'Not enough data', pattern: 'None' };
            
        const closes = candles.map(c => c.close);
        const sma20 = calculateSMA(closes, 20);
        const sma50 = calculateSMA(closes, 50);
        const current = closes[closes.length - 1];
        if (current > sma20 && sma20 > sma50) return { direction: 'BUY', logic: 'SMA Crossover Bullish', pattern: 'Golden Cross' };
        if (current < sma20 && sma20 < sma50) return { direction: 'SELL', logic: 'SMA Crossover Bearish', pattern: 'Death Cross' };
        return { direction: 'FLAT', logic: 'No clear trend', pattern: 'None' };
        
        }
    },
    {
        id: 'strat_16',
        name: 'Quant Strategy 16 - Momentum',
        category: 'Momentum',
        suitableAssetClasses: ['Forex', 'Indices', 'Crypto', 'Commodities', 'Synthetics'],
        suitableMarketConditions: ['Bearish', 'All'],
        analyze: (candles, assetClass, marketCondition) => {
            if (candles.length < 50) return { direction: 'FLAT', logic: 'Not enough data', pattern: 'None' };
            
        const closes = candles.map(c => c.close);
        const rsi = calculateRSI(closes, 14);
        if (rsi < 30) return { direction: 'BUY', logic: 'Oversold RSI', pattern: 'RSI Bottom' };
        if (rsi > 70) return { direction: 'SELL', logic: 'Overbought RSI', pattern: 'RSI Top' };
        return { direction: 'FLAT', logic: 'RSI in neutral zone', pattern: 'None' };
        
        }
    },
    {
        id: 'strat_17',
        name: 'Quant Strategy 17 - Breakout',
        category: 'Breakout',
        suitableAssetClasses: ['Forex', 'Indices', 'Crypto', 'Commodities', 'Synthetics'],
        suitableMarketConditions: ['Ranging', 'All'],
        analyze: (candles, assetClass, marketCondition) => {
            if (candles.length < 50) return { direction: 'FLAT', logic: 'Not enough data', pattern: 'None' };
            
        const closes = candles.map(c => c.close);
        const ema9 = calculateEMA(closes, 9);
        const ema21 = calculateEMA(closes, 21);
        if (ema9 > ema21) return { direction: 'BUY', logic: 'EMA Momentum Bullish', pattern: 'Bullish Momentum' };
        if (ema9 < ema21) return { direction: 'SELL', logic: 'EMA Momentum Bearish', pattern: 'Bearish Momentum' };
        return { direction: 'FLAT', logic: 'No momentum', pattern: 'None' };
        
        }
    },
    {
        id: 'strat_18',
        name: 'Quant Strategy 18 - Volatility',
        category: 'Volatility',
        suitableAssetClasses: ['Forex', 'Indices', 'Crypto', 'Commodities', 'Synthetics'],
        suitableMarketConditions: ['Volatile', 'All'],
        analyze: (candles, assetClass, marketCondition) => {
            if (candles.length < 50) return { direction: 'FLAT', logic: 'Not enough data', pattern: 'None' };
            
        const highs = candles.map(c => c.high);
        const lows = candles.map(c => c.low);
        const closes = candles.map(c => c.close);
        const currentClose = closes[closes.length - 1];
        const prevHigh = highs[highs.length - 2];
        const prevLow = lows[lows.length - 2];
        if (currentClose > prevHigh) return { direction: 'BUY', logic: 'Previous Candle High Breakout', pattern: 'Bullish Breakout' };
        if (currentClose < prevLow) return { direction: 'SELL', logic: 'Previous Candle Low Breakout', pattern: 'Bearish Breakout' };
        return { direction: 'FLAT', logic: 'Inside bar / No breakout', pattern: 'None' };
        
        }
    },
    {
        id: 'strat_19',
        name: 'Quant Strategy 19 - Volume',
        category: 'Volume',
        suitableAssetClasses: ['Forex', 'Indices', 'Crypto', 'Commodities', 'Synthetics'],
        suitableMarketConditions: ['Low Volatility', 'All'],
        analyze: (candles, assetClass, marketCondition) => {
            if (candles.length < 50) return { direction: 'FLAT', logic: 'Not enough data', pattern: 'None' };
            
        const closes = candles.map(c => c.close);
        const sma20 = calculateSMA(closes, 20);
        const current = closes[closes.length - 1];
        const deviation = (current - sma20) / sma20;
        if (deviation < -0.02) return { direction: 'BUY', logic: 'Mean Reversion from lower band', pattern: 'Dip Buying' };
        if (deviation > 0.02) return { direction: 'SELL', logic: 'Mean Reversion from upper band', pattern: 'Top Selling' };
        return { direction: 'FLAT', logic: 'Price near mean', pattern: 'None' };
        
        }
    },
    {
        id: 'strat_20',
        name: 'Quant Strategy 20 - Statistical',
        category: 'Statistical',
        suitableAssetClasses: ['Forex', 'Indices', 'Crypto', 'Commodities', 'Synthetics'],
        suitableMarketConditions: ['Bullish', 'All'],
        analyze: (candles, assetClass, marketCondition) => {
            if (candles.length < 50) return { direction: 'FLAT', logic: 'Not enough data', pattern: 'None' };
            
        const closes = candles.map(c => c.close);
        const sma20 = calculateSMA(closes, 20);
        const sma50 = calculateSMA(closes, 50);
        const current = closes[closes.length - 1];
        if (current > sma20 && sma20 > sma50) return { direction: 'BUY', logic: 'SMA Crossover Bullish', pattern: 'Golden Cross' };
        if (current < sma20 && sma20 < sma50) return { direction: 'SELL', logic: 'SMA Crossover Bearish', pattern: 'Death Cross' };
        return { direction: 'FLAT', logic: 'No clear trend', pattern: 'None' };
        
        }
    },
    {
        id: 'strat_21',
        name: 'Quant Strategy 21 - Trend',
        category: 'Trend',
        suitableAssetClasses: ['Forex', 'Indices', 'Crypto', 'Commodities', 'Synthetics'],
        suitableMarketConditions: ['Bearish', 'All'],
        analyze: (candles, assetClass, marketCondition) => {
            if (candles.length < 50) return { direction: 'FLAT', logic: 'Not enough data', pattern: 'None' };
            
        const closes = candles.map(c => c.close);
        const rsi = calculateRSI(closes, 14);
        if (rsi < 30) return { direction: 'BUY', logic: 'Oversold RSI', pattern: 'RSI Bottom' };
        if (rsi > 70) return { direction: 'SELL', logic: 'Overbought RSI', pattern: 'RSI Top' };
        return { direction: 'FLAT', logic: 'RSI in neutral zone', pattern: 'None' };
        
        }
    },
    {
        id: 'strat_22',
        name: 'Quant Strategy 22 - Mean Reversion',
        category: 'Mean Reversion',
        suitableAssetClasses: ['Forex', 'Indices', 'Crypto', 'Commodities', 'Synthetics'],
        suitableMarketConditions: ['Ranging', 'All'],
        analyze: (candles, assetClass, marketCondition) => {
            if (candles.length < 50) return { direction: 'FLAT', logic: 'Not enough data', pattern: 'None' };
            
        const closes = candles.map(c => c.close);
        const ema9 = calculateEMA(closes, 9);
        const ema21 = calculateEMA(closes, 21);
        if (ema9 > ema21) return { direction: 'BUY', logic: 'EMA Momentum Bullish', pattern: 'Bullish Momentum' };
        if (ema9 < ema21) return { direction: 'SELL', logic: 'EMA Momentum Bearish', pattern: 'Bearish Momentum' };
        return { direction: 'FLAT', logic: 'No momentum', pattern: 'None' };
        
        }
    },
    {
        id: 'strat_23',
        name: 'Quant Strategy 23 - Momentum',
        category: 'Momentum',
        suitableAssetClasses: ['Forex', 'Indices', 'Crypto', 'Commodities', 'Synthetics'],
        suitableMarketConditions: ['Volatile', 'All'],
        analyze: (candles, assetClass, marketCondition) => {
            if (candles.length < 50) return { direction: 'FLAT', logic: 'Not enough data', pattern: 'None' };
            
        const highs = candles.map(c => c.high);
        const lows = candles.map(c => c.low);
        const closes = candles.map(c => c.close);
        const currentClose = closes[closes.length - 1];
        const prevHigh = highs[highs.length - 2];
        const prevLow = lows[lows.length - 2];
        if (currentClose > prevHigh) return { direction: 'BUY', logic: 'Previous Candle High Breakout', pattern: 'Bullish Breakout' };
        if (currentClose < prevLow) return { direction: 'SELL', logic: 'Previous Candle Low Breakout', pattern: 'Bearish Breakout' };
        return { direction: 'FLAT', logic: 'Inside bar / No breakout', pattern: 'None' };
        
        }
    },
    {
        id: 'strat_24',
        name: 'Quant Strategy 24 - Breakout',
        category: 'Breakout',
        suitableAssetClasses: ['Forex', 'Indices', 'Crypto', 'Commodities', 'Synthetics'],
        suitableMarketConditions: ['Low Volatility', 'All'],
        analyze: (candles, assetClass, marketCondition) => {
            if (candles.length < 50) return { direction: 'FLAT', logic: 'Not enough data', pattern: 'None' };
            
        const closes = candles.map(c => c.close);
        const sma20 = calculateSMA(closes, 20);
        const current = closes[closes.length - 1];
        const deviation = (current - sma20) / sma20;
        if (deviation < -0.02) return { direction: 'BUY', logic: 'Mean Reversion from lower band', pattern: 'Dip Buying' };
        if (deviation > 0.02) return { direction: 'SELL', logic: 'Mean Reversion from upper band', pattern: 'Top Selling' };
        return { direction: 'FLAT', logic: 'Price near mean', pattern: 'None' };
        
        }
    },
    {
        id: 'strat_25',
        name: 'Quant Strategy 25 - Volatility',
        category: 'Volatility',
        suitableAssetClasses: ['Forex', 'Indices', 'Crypto', 'Commodities', 'Synthetics'],
        suitableMarketConditions: ['Bullish', 'All'],
        analyze: (candles, assetClass, marketCondition) => {
            if (candles.length < 50) return { direction: 'FLAT', logic: 'Not enough data', pattern: 'None' };
            
        const closes = candles.map(c => c.close);
        const sma20 = calculateSMA(closes, 20);
        const sma50 = calculateSMA(closes, 50);
        const current = closes[closes.length - 1];
        if (current > sma20 && sma20 > sma50) return { direction: 'BUY', logic: 'SMA Crossover Bullish', pattern: 'Golden Cross' };
        if (current < sma20 && sma20 < sma50) return { direction: 'SELL', logic: 'SMA Crossover Bearish', pattern: 'Death Cross' };
        return { direction: 'FLAT', logic: 'No clear trend', pattern: 'None' };
        
        }
    },
    {
        id: 'strat_26',
        name: 'Quant Strategy 26 - Volume',
        category: 'Volume',
        suitableAssetClasses: ['Forex', 'Indices', 'Crypto', 'Commodities', 'Synthetics'],
        suitableMarketConditions: ['Bearish', 'All'],
        analyze: (candles, assetClass, marketCondition) => {
            if (candles.length < 50) return { direction: 'FLAT', logic: 'Not enough data', pattern: 'None' };
            
        const closes = candles.map(c => c.close);
        const rsi = calculateRSI(closes, 14);
        if (rsi < 30) return { direction: 'BUY', logic: 'Oversold RSI', pattern: 'RSI Bottom' };
        if (rsi > 70) return { direction: 'SELL', logic: 'Overbought RSI', pattern: 'RSI Top' };
        return { direction: 'FLAT', logic: 'RSI in neutral zone', pattern: 'None' };
        
        }
    },
    {
        id: 'strat_27',
        name: 'Quant Strategy 27 - Statistical',
        category: 'Statistical',
        suitableAssetClasses: ['Forex', 'Indices', 'Crypto', 'Commodities', 'Synthetics'],
        suitableMarketConditions: ['Ranging', 'All'],
        analyze: (candles, assetClass, marketCondition) => {
            if (candles.length < 50) return { direction: 'FLAT', logic: 'Not enough data', pattern: 'None' };
            
        const closes = candles.map(c => c.close);
        const ema9 = calculateEMA(closes, 9);
        const ema21 = calculateEMA(closes, 21);
        if (ema9 > ema21) return { direction: 'BUY', logic: 'EMA Momentum Bullish', pattern: 'Bullish Momentum' };
        if (ema9 < ema21) return { direction: 'SELL', logic: 'EMA Momentum Bearish', pattern: 'Bearish Momentum' };
        return { direction: 'FLAT', logic: 'No momentum', pattern: 'None' };
        
        }
    },
    {
        id: 'strat_28',
        name: 'Quant Strategy 28 - Trend',
        category: 'Trend',
        suitableAssetClasses: ['Forex', 'Indices', 'Crypto', 'Commodities', 'Synthetics'],
        suitableMarketConditions: ['Volatile', 'All'],
        analyze: (candles, assetClass, marketCondition) => {
            if (candles.length < 50) return { direction: 'FLAT', logic: 'Not enough data', pattern: 'None' };
            
        const highs = candles.map(c => c.high);
        const lows = candles.map(c => c.low);
        const closes = candles.map(c => c.close);
        const currentClose = closes[closes.length - 1];
        const prevHigh = highs[highs.length - 2];
        const prevLow = lows[lows.length - 2];
        if (currentClose > prevHigh) return { direction: 'BUY', logic: 'Previous Candle High Breakout', pattern: 'Bullish Breakout' };
        if (currentClose < prevLow) return { direction: 'SELL', logic: 'Previous Candle Low Breakout', pattern: 'Bearish Breakout' };
        return { direction: 'FLAT', logic: 'Inside bar / No breakout', pattern: 'None' };
        
        }
    },
    {
        id: 'strat_29',
        name: 'Quant Strategy 29 - Mean Reversion',
        category: 'Mean Reversion',
        suitableAssetClasses: ['Forex', 'Indices', 'Crypto', 'Commodities', 'Synthetics'],
        suitableMarketConditions: ['Low Volatility', 'All'],
        analyze: (candles, assetClass, marketCondition) => {
            if (candles.length < 50) return { direction: 'FLAT', logic: 'Not enough data', pattern: 'None' };
            
        const closes = candles.map(c => c.close);
        const sma20 = calculateSMA(closes, 20);
        const current = closes[closes.length - 1];
        const deviation = (current - sma20) / sma20;
        if (deviation < -0.02) return { direction: 'BUY', logic: 'Mean Reversion from lower band', pattern: 'Dip Buying' };
        if (deviation > 0.02) return { direction: 'SELL', logic: 'Mean Reversion from upper band', pattern: 'Top Selling' };
        return { direction: 'FLAT', logic: 'Price near mean', pattern: 'None' };
        
        }
    },
    {
        id: 'strat_30',
        name: 'Quant Strategy 30 - Momentum',
        category: 'Momentum',
        suitableAssetClasses: ['Forex', 'Indices', 'Crypto', 'Commodities', 'Synthetics'],
        suitableMarketConditions: ['Bullish', 'All'],
        analyze: (candles, assetClass, marketCondition) => {
            if (candles.length < 50) return { direction: 'FLAT', logic: 'Not enough data', pattern: 'None' };
            
        const closes = candles.map(c => c.close);
        const sma20 = calculateSMA(closes, 20);
        const sma50 = calculateSMA(closes, 50);
        const current = closes[closes.length - 1];
        if (current > sma20 && sma20 > sma50) return { direction: 'BUY', logic: 'SMA Crossover Bullish', pattern: 'Golden Cross' };
        if (current < sma20 && sma20 < sma50) return { direction: 'SELL', logic: 'SMA Crossover Bearish', pattern: 'Death Cross' };
        return { direction: 'FLAT', logic: 'No clear trend', pattern: 'None' };
        
        }
    },
    {
        id: 'strat_31',
        name: 'Quant Strategy 31 - Breakout',
        category: 'Breakout',
        suitableAssetClasses: ['Forex', 'Indices', 'Crypto', 'Commodities', 'Synthetics'],
        suitableMarketConditions: ['Bearish', 'All'],
        analyze: (candles, assetClass, marketCondition) => {
            if (candles.length < 50) return { direction: 'FLAT', logic: 'Not enough data', pattern: 'None' };
            
        const closes = candles.map(c => c.close);
        const rsi = calculateRSI(closes, 14);
        if (rsi < 30) return { direction: 'BUY', logic: 'Oversold RSI', pattern: 'RSI Bottom' };
        if (rsi > 70) return { direction: 'SELL', logic: 'Overbought RSI', pattern: 'RSI Top' };
        return { direction: 'FLAT', logic: 'RSI in neutral zone', pattern: 'None' };
        
        }
    },
    {
        id: 'strat_32',
        name: 'Quant Strategy 32 - Volatility',
        category: 'Volatility',
        suitableAssetClasses: ['Forex', 'Indices', 'Crypto', 'Commodities', 'Synthetics'],
        suitableMarketConditions: ['Ranging', 'All'],
        analyze: (candles, assetClass, marketCondition) => {
            if (candles.length < 50) return { direction: 'FLAT', logic: 'Not enough data', pattern: 'None' };
            
        const closes = candles.map(c => c.close);
        const ema9 = calculateEMA(closes, 9);
        const ema21 = calculateEMA(closes, 21);
        if (ema9 > ema21) return { direction: 'BUY', logic: 'EMA Momentum Bullish', pattern: 'Bullish Momentum' };
        if (ema9 < ema21) return { direction: 'SELL', logic: 'EMA Momentum Bearish', pattern: 'Bearish Momentum' };
        return { direction: 'FLAT', logic: 'No momentum', pattern: 'None' };
        
        }
    },
    {
        id: 'strat_33',
        name: 'Quant Strategy 33 - Volume',
        category: 'Volume',
        suitableAssetClasses: ['Forex', 'Indices', 'Crypto', 'Commodities', 'Synthetics'],
        suitableMarketConditions: ['Volatile', 'All'],
        analyze: (candles, assetClass, marketCondition) => {
            if (candles.length < 50) return { direction: 'FLAT', logic: 'Not enough data', pattern: 'None' };
            
        const highs = candles.map(c => c.high);
        const lows = candles.map(c => c.low);
        const closes = candles.map(c => c.close);
        const currentClose = closes[closes.length - 1];
        const prevHigh = highs[highs.length - 2];
        const prevLow = lows[lows.length - 2];
        if (currentClose > prevHigh) return { direction: 'BUY', logic: 'Previous Candle High Breakout', pattern: 'Bullish Breakout' };
        if (currentClose < prevLow) return { direction: 'SELL', logic: 'Previous Candle Low Breakout', pattern: 'Bearish Breakout' };
        return { direction: 'FLAT', logic: 'Inside bar / No breakout', pattern: 'None' };
        
        }
    },
    {
        id: 'strat_34',
        name: 'Quant Strategy 34 - Statistical',
        category: 'Statistical',
        suitableAssetClasses: ['Forex', 'Indices', 'Crypto', 'Commodities', 'Synthetics'],
        suitableMarketConditions: ['Low Volatility', 'All'],
        analyze: (candles, assetClass, marketCondition) => {
            if (candles.length < 50) return { direction: 'FLAT', logic: 'Not enough data', pattern: 'None' };
            
        const closes = candles.map(c => c.close);
        const sma20 = calculateSMA(closes, 20);
        const current = closes[closes.length - 1];
        const deviation = (current - sma20) / sma20;
        if (deviation < -0.02) return { direction: 'BUY', logic: 'Mean Reversion from lower band', pattern: 'Dip Buying' };
        if (deviation > 0.02) return { direction: 'SELL', logic: 'Mean Reversion from upper band', pattern: 'Top Selling' };
        return { direction: 'FLAT', logic: 'Price near mean', pattern: 'None' };
        
        }
    },
    {
        id: 'strat_35',
        name: 'Quant Strategy 35 - Trend',
        category: 'Trend',
        suitableAssetClasses: ['Forex', 'Indices', 'Crypto', 'Commodities', 'Synthetics'],
        suitableMarketConditions: ['Bullish', 'All'],
        analyze: (candles, assetClass, marketCondition) => {
            if (candles.length < 50) return { direction: 'FLAT', logic: 'Not enough data', pattern: 'None' };
            
        const closes = candles.map(c => c.close);
        const sma20 = calculateSMA(closes, 20);
        const sma50 = calculateSMA(closes, 50);
        const current = closes[closes.length - 1];
        if (current > sma20 && sma20 > sma50) return { direction: 'BUY', logic: 'SMA Crossover Bullish', pattern: 'Golden Cross' };
        if (current < sma20 && sma20 < sma50) return { direction: 'SELL', logic: 'SMA Crossover Bearish', pattern: 'Death Cross' };
        return { direction: 'FLAT', logic: 'No clear trend', pattern: 'None' };
        
        }
    },
    {
        id: 'strat_36',
        name: 'Quant Strategy 36 - Mean Reversion',
        category: 'Mean Reversion',
        suitableAssetClasses: ['Forex', 'Indices', 'Crypto', 'Commodities', 'Synthetics'],
        suitableMarketConditions: ['Bearish', 'All'],
        analyze: (candles, assetClass, marketCondition) => {
            if (candles.length < 50) return { direction: 'FLAT', logic: 'Not enough data', pattern: 'None' };
            
        const closes = candles.map(c => c.close);
        const rsi = calculateRSI(closes, 14);
        if (rsi < 30) return { direction: 'BUY', logic: 'Oversold RSI', pattern: 'RSI Bottom' };
        if (rsi > 70) return { direction: 'SELL', logic: 'Overbought RSI', pattern: 'RSI Top' };
        return { direction: 'FLAT', logic: 'RSI in neutral zone', pattern: 'None' };
        
        }
    },
    {
        id: 'strat_37',
        name: 'Quant Strategy 37 - Momentum',
        category: 'Momentum',
        suitableAssetClasses: ['Forex', 'Indices', 'Crypto', 'Commodities', 'Synthetics'],
        suitableMarketConditions: ['Ranging', 'All'],
        analyze: (candles, assetClass, marketCondition) => {
            if (candles.length < 50) return { direction: 'FLAT', logic: 'Not enough data', pattern: 'None' };
            
        const closes = candles.map(c => c.close);
        const ema9 = calculateEMA(closes, 9);
        const ema21 = calculateEMA(closes, 21);
        if (ema9 > ema21) return { direction: 'BUY', logic: 'EMA Momentum Bullish', pattern: 'Bullish Momentum' };
        if (ema9 < ema21) return { direction: 'SELL', logic: 'EMA Momentum Bearish', pattern: 'Bearish Momentum' };
        return { direction: 'FLAT', logic: 'No momentum', pattern: 'None' };
        
        }
    },
    {
        id: 'strat_38',
        name: 'Quant Strategy 38 - Breakout',
        category: 'Breakout',
        suitableAssetClasses: ['Forex', 'Indices', 'Crypto', 'Commodities', 'Synthetics'],
        suitableMarketConditions: ['Volatile', 'All'],
        analyze: (candles, assetClass, marketCondition) => {
            if (candles.length < 50) return { direction: 'FLAT', logic: 'Not enough data', pattern: 'None' };
            
        const highs = candles.map(c => c.high);
        const lows = candles.map(c => c.low);
        const closes = candles.map(c => c.close);
        const currentClose = closes[closes.length - 1];
        const prevHigh = highs[highs.length - 2];
        const prevLow = lows[lows.length - 2];
        if (currentClose > prevHigh) return { direction: 'BUY', logic: 'Previous Candle High Breakout', pattern: 'Bullish Breakout' };
        if (currentClose < prevLow) return { direction: 'SELL', logic: 'Previous Candle Low Breakout', pattern: 'Bearish Breakout' };
        return { direction: 'FLAT', logic: 'Inside bar / No breakout', pattern: 'None' };
        
        }
    },
    {
        id: 'strat_39',
        name: 'Quant Strategy 39 - Volatility',
        category: 'Volatility',
        suitableAssetClasses: ['Forex', 'Indices', 'Crypto', 'Commodities', 'Synthetics'],
        suitableMarketConditions: ['Low Volatility', 'All'],
        analyze: (candles, assetClass, marketCondition) => {
            if (candles.length < 50) return { direction: 'FLAT', logic: 'Not enough data', pattern: 'None' };
            
        const closes = candles.map(c => c.close);
        const sma20 = calculateSMA(closes, 20);
        const current = closes[closes.length - 1];
        const deviation = (current - sma20) / sma20;
        if (deviation < -0.02) return { direction: 'BUY', logic: 'Mean Reversion from lower band', pattern: 'Dip Buying' };
        if (deviation > 0.02) return { direction: 'SELL', logic: 'Mean Reversion from upper band', pattern: 'Top Selling' };
        return { direction: 'FLAT', logic: 'Price near mean', pattern: 'None' };
        
        }
    },
    {
        id: 'strat_40',
        name: 'Quant Strategy 40 - Volume',
        category: 'Volume',
        suitableAssetClasses: ['Forex', 'Indices', 'Crypto', 'Commodities', 'Synthetics'],
        suitableMarketConditions: ['Bullish', 'All'],
        analyze: (candles, assetClass, marketCondition) => {
            if (candles.length < 50) return { direction: 'FLAT', logic: 'Not enough data', pattern: 'None' };
            
        const closes = candles.map(c => c.close);
        const sma20 = calculateSMA(closes, 20);
        const sma50 = calculateSMA(closes, 50);
        const current = closes[closes.length - 1];
        if (current > sma20 && sma20 > sma50) return { direction: 'BUY', logic: 'SMA Crossover Bullish', pattern: 'Golden Cross' };
        if (current < sma20 && sma20 < sma50) return { direction: 'SELL', logic: 'SMA Crossover Bearish', pattern: 'Death Cross' };
        return { direction: 'FLAT', logic: 'No clear trend', pattern: 'None' };
        
        }
    },
    {
        id: 'strat_41',
        name: 'Quant Strategy 41 - Statistical',
        category: 'Statistical',
        suitableAssetClasses: ['Forex', 'Indices', 'Crypto', 'Commodities', 'Synthetics'],
        suitableMarketConditions: ['Bearish', 'All'],
        analyze: (candles, assetClass, marketCondition) => {
            if (candles.length < 50) return { direction: 'FLAT', logic: 'Not enough data', pattern: 'None' };
            
        const closes = candles.map(c => c.close);
        const rsi = calculateRSI(closes, 14);
        if (rsi < 30) return { direction: 'BUY', logic: 'Oversold RSI', pattern: 'RSI Bottom' };
        if (rsi > 70) return { direction: 'SELL', logic: 'Overbought RSI', pattern: 'RSI Top' };
        return { direction: 'FLAT', logic: 'RSI in neutral zone', pattern: 'None' };
        
        }
    },
    {
        id: 'strat_42',
        name: 'Quant Strategy 42 - Trend',
        category: 'Trend',
        suitableAssetClasses: ['Forex', 'Indices', 'Crypto', 'Commodities', 'Synthetics'],
        suitableMarketConditions: ['Ranging', 'All'],
        analyze: (candles, assetClass, marketCondition) => {
            if (candles.length < 50) return { direction: 'FLAT', logic: 'Not enough data', pattern: 'None' };
            
        const closes = candles.map(c => c.close);
        const ema9 = calculateEMA(closes, 9);
        const ema21 = calculateEMA(closes, 21);
        if (ema9 > ema21) return { direction: 'BUY', logic: 'EMA Momentum Bullish', pattern: 'Bullish Momentum' };
        if (ema9 < ema21) return { direction: 'SELL', logic: 'EMA Momentum Bearish', pattern: 'Bearish Momentum' };
        return { direction: 'FLAT', logic: 'No momentum', pattern: 'None' };
        
        }
    },
    {
        id: 'strat_43',
        name: 'Quant Strategy 43 - Mean Reversion',
        category: 'Mean Reversion',
        suitableAssetClasses: ['Forex', 'Indices', 'Crypto', 'Commodities', 'Synthetics'],
        suitableMarketConditions: ['Volatile', 'All'],
        analyze: (candles, assetClass, marketCondition) => {
            if (candles.length < 50) return { direction: 'FLAT', logic: 'Not enough data', pattern: 'None' };
            
        const highs = candles.map(c => c.high);
        const lows = candles.map(c => c.low);
        const closes = candles.map(c => c.close);
        const currentClose = closes[closes.length - 1];
        const prevHigh = highs[highs.length - 2];
        const prevLow = lows[lows.length - 2];
        if (currentClose > prevHigh) return { direction: 'BUY', logic: 'Previous Candle High Breakout', pattern: 'Bullish Breakout' };
        if (currentClose < prevLow) return { direction: 'SELL', logic: 'Previous Candle Low Breakout', pattern: 'Bearish Breakout' };
        return { direction: 'FLAT', logic: 'Inside bar / No breakout', pattern: 'None' };
        
        }
    },
    {
        id: 'strat_44',
        name: 'Quant Strategy 44 - Momentum',
        category: 'Momentum',
        suitableAssetClasses: ['Forex', 'Indices', 'Crypto', 'Commodities', 'Synthetics'],
        suitableMarketConditions: ['Low Volatility', 'All'],
        analyze: (candles, assetClass, marketCondition) => {
            if (candles.length < 50) return { direction: 'FLAT', logic: 'Not enough data', pattern: 'None' };
            
        const closes = candles.map(c => c.close);
        const sma20 = calculateSMA(closes, 20);
        const current = closes[closes.length - 1];
        const deviation = (current - sma20) / sma20;
        if (deviation < -0.02) return { direction: 'BUY', logic: 'Mean Reversion from lower band', pattern: 'Dip Buying' };
        if (deviation > 0.02) return { direction: 'SELL', logic: 'Mean Reversion from upper band', pattern: 'Top Selling' };
        return { direction: 'FLAT', logic: 'Price near mean', pattern: 'None' };
        
        }
    },
    {
        id: 'strat_45',
        name: 'Quant Strategy 45 - Breakout',
        category: 'Breakout',
        suitableAssetClasses: ['Forex', 'Indices', 'Crypto', 'Commodities', 'Synthetics'],
        suitableMarketConditions: ['Bullish', 'All'],
        analyze: (candles, assetClass, marketCondition) => {
            if (candles.length < 50) return { direction: 'FLAT', logic: 'Not enough data', pattern: 'None' };
            
        const closes = candles.map(c => c.close);
        const sma20 = calculateSMA(closes, 20);
        const sma50 = calculateSMA(closes, 50);
        const current = closes[closes.length - 1];
        if (current > sma20 && sma20 > sma50) return { direction: 'BUY', logic: 'SMA Crossover Bullish', pattern: 'Golden Cross' };
        if (current < sma20 && sma20 < sma50) return { direction: 'SELL', logic: 'SMA Crossover Bearish', pattern: 'Death Cross' };
        return { direction: 'FLAT', logic: 'No clear trend', pattern: 'None' };
        
        }
    },
    {
        id: 'strat_46',
        name: 'Quant Strategy 46 - Volatility',
        category: 'Volatility',
        suitableAssetClasses: ['Forex', 'Indices', 'Crypto', 'Commodities', 'Synthetics'],
        suitableMarketConditions: ['Bearish', 'All'],
        analyze: (candles, assetClass, marketCondition) => {
            if (candles.length < 50) return { direction: 'FLAT', logic: 'Not enough data', pattern: 'None' };
            
        const closes = candles.map(c => c.close);
        const rsi = calculateRSI(closes, 14);
        if (rsi < 30) return { direction: 'BUY', logic: 'Oversold RSI', pattern: 'RSI Bottom' };
        if (rsi > 70) return { direction: 'SELL', logic: 'Overbought RSI', pattern: 'RSI Top' };
        return { direction: 'FLAT', logic: 'RSI in neutral zone', pattern: 'None' };
        
        }
    },
    {
        id: 'strat_47',
        name: 'Quant Strategy 47 - Volume',
        category: 'Volume',
        suitableAssetClasses: ['Forex', 'Indices', 'Crypto', 'Commodities', 'Synthetics'],
        suitableMarketConditions: ['Ranging', 'All'],
        analyze: (candles, assetClass, marketCondition) => {
            if (candles.length < 50) return { direction: 'FLAT', logic: 'Not enough data', pattern: 'None' };
            
        const closes = candles.map(c => c.close);
        const ema9 = calculateEMA(closes, 9);
        const ema21 = calculateEMA(closes, 21);
        if (ema9 > ema21) return { direction: 'BUY', logic: 'EMA Momentum Bullish', pattern: 'Bullish Momentum' };
        if (ema9 < ema21) return { direction: 'SELL', logic: 'EMA Momentum Bearish', pattern: 'Bearish Momentum' };
        return { direction: 'FLAT', logic: 'No momentum', pattern: 'None' };
        
        }
    },
    {
        id: 'strat_48',
        name: 'Quant Strategy 48 - Statistical',
        category: 'Statistical',
        suitableAssetClasses: ['Forex', 'Indices', 'Crypto', 'Commodities', 'Synthetics'],
        suitableMarketConditions: ['Volatile', 'All'],
        analyze: (candles, assetClass, marketCondition) => {
            if (candles.length < 50) return { direction: 'FLAT', logic: 'Not enough data', pattern: 'None' };
            
        const highs = candles.map(c => c.high);
        const lows = candles.map(c => c.low);
        const closes = candles.map(c => c.close);
        const currentClose = closes[closes.length - 1];
        const prevHigh = highs[highs.length - 2];
        const prevLow = lows[lows.length - 2];
        if (currentClose > prevHigh) return { direction: 'BUY', logic: 'Previous Candle High Breakout', pattern: 'Bullish Breakout' };
        if (currentClose < prevLow) return { direction: 'SELL', logic: 'Previous Candle Low Breakout', pattern: 'Bearish Breakout' };
        return { direction: 'FLAT', logic: 'Inside bar / No breakout', pattern: 'None' };
        
        }
    },
    {
        id: 'strat_49',
        name: 'Quant Strategy 49 - Trend',
        category: 'Trend',
        suitableAssetClasses: ['Forex', 'Indices', 'Crypto', 'Commodities', 'Synthetics'],
        suitableMarketConditions: ['Low Volatility', 'All'],
        analyze: (candles, assetClass, marketCondition) => {
            if (candles.length < 50) return { direction: 'FLAT', logic: 'Not enough data', pattern: 'None' };
            
        const closes = candles.map(c => c.close);
        const sma20 = calculateSMA(closes, 20);
        const current = closes[closes.length - 1];
        const deviation = (current - sma20) / sma20;
        if (deviation < -0.02) return { direction: 'BUY', logic: 'Mean Reversion from lower band', pattern: 'Dip Buying' };
        if (deviation > 0.02) return { direction: 'SELL', logic: 'Mean Reversion from upper band', pattern: 'Top Selling' };
        return { direction: 'FLAT', logic: 'Price near mean', pattern: 'None' };
        
        }
    },
    {
        id: 'strat_50',
        name: 'Quant Strategy 50 - Mean Reversion',
        category: 'Mean Reversion',
        suitableAssetClasses: ['Forex', 'Indices', 'Crypto', 'Commodities', 'Synthetics'],
        suitableMarketConditions: ['Bullish', 'All'],
        analyze: (candles, assetClass, marketCondition) => {
            if (candles.length < 50) return { direction: 'FLAT', logic: 'Not enough data', pattern: 'None' };
            
        const closes = candles.map(c => c.close);
        const sma20 = calculateSMA(closes, 20);
        const sma50 = calculateSMA(closes, 50);
        const current = closes[closes.length - 1];
        if (current > sma20 && sma20 > sma50) return { direction: 'BUY', logic: 'SMA Crossover Bullish', pattern: 'Golden Cross' };
        if (current < sma20 && sma20 < sma50) return { direction: 'SELL', logic: 'SMA Crossover Bearish', pattern: 'Death Cross' };
        return { direction: 'FLAT', logic: 'No clear trend', pattern: 'None' };
        
        }
    },
];

export const autoSelectStrategy = (candles: any[], assetClass: string, marketCondition: string): { strategy: QuantStrategy, result: { direction: 'BUY' | 'SELL' | 'FLAT', logic: string, pattern: string } } | null => {
    // Filter strategies by condition and asset class
    const validStrategies = quantStrategies.filter(s => 
        s.suitableAssetClasses.includes(assetClass) && 
        (s.suitableMarketConditions.includes(marketCondition) || s.suitableMarketConditions.includes('All'))
    );
    
    // Evaluate strategies
    for (const strat of validStrategies) {
        const result = strat.analyze(candles, assetClass, marketCondition);
        if (result.direction !== 'FLAT') {
            return { strategy: strat, result };
        }
    }
    return null;
};
