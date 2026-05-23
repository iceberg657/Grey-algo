
import { calculateEMA, calculateRSI } from './analyticsEngine';

export type MarketRegimeType = 
    | 'RETAIL_TRAP_MONDAY' 
    | 'TREND_CONTINUATION' 
    | 'FRIDAY_REVERSAL_RISK' 
    | 'LOW_VOLATILITY_CHOP' 
    | 'YEAR_END_UNSTABLE'
    | 'HIGH_LIQUIDITY_EXPANSION'
    | 'MEAN_REVERSION_RANGE';

export interface MarketRegime {
    type: MarketRegimeType;
    description: string;
    suggestedAssets: string[];
    riskMultiplier: number;
    protocol: string;
}

export function detectMarketRegime(candles: any[], assetSymbol: string): MarketRegime {
    const now = new Date();
    const day = now.getDay(); // 0 = Sun, 1 = Mon, ..., 5 = Fri, 6 = Sat
    const month = now.getMonth(); // 0-11
    const isYearEnd = month === 11 || (month === 0 && now.getDate() < 7);
    
    const closes = candles.map(c => c.close);
    const rsi = calculateRSI(closes)[closes.length - 1];
    
    // Check for "Year End" instability (December)
    if (isYearEnd) {
        return {
            type: 'YEAR_END_UNSTABLE',
            description: 'Year-end market instability detected. Institutional liquidity is low, leading to erratic moves and "ghost" volatility.',
            suggestedAssets: ['V75', 'V100', 'EURUSD', 'BTCUSD'],
            riskMultiplier: 0.5,
            protocol: 'Reduce position size by 50%. Prioritize 1:1.5 RR and exit at first sign of reversal.'
        };
    }

    // Monday Retail Trap Logic
    if (day === 1) {
        return {
            type: 'RETAIL_TRAP_MONDAY',
            description: 'Monday Opening Range. Market is seeking weekly direction. Often traps early breakout traders.',
            suggestedAssets: ['GBPUSD', 'EURUSD', 'V75', 'V25'],
            riskMultiplier: 0.75,
            protocol: 'Wait for New York session open to confirm direction. Avoid early London breakouts on Indices.'
        };
    }

    // Friday Reversal / Profit Taking Logic
    if (day === 5) {
        return {
            type: 'FRIDAY_REVERSAL_RISK',
            description: 'Friday Profit-Taking Regime. High risk of trend exhaustion and sudden institutional reversals.',
            suggestedAssets: ['XAUUSD', 'EURUSD', 'V100', 'R_100'],
            riskMultiplier: 0.7,
            protocol: 'Target internal liquidity only. Close all positions before NY close. Do not hold over the weekend.'
        };
    }

    // Mid-week Trend logic
    const isTrending = Math.abs(rsi - 50) > 15;
    if (isTrending) {
        return {
            type: 'TREND_CONTINUATION',
            description: 'Strong momentum detected. Market is in an expansion phase.',
            suggestedAssets: ['US30', 'US100', 'GBPUSD', 'V75'],
            riskMultiplier: 1.0,
            protocol: 'Use OTE (Optimal Trade Entry) at 0.62-0.79 to join the move. Hold for structural targets.'
        };
    }

    // Default: Mean Reversion / Range
    return {
        type: 'MEAN_REVERSION_RANGE',
        description: 'Range-bound market environment. Price is oscillating around equilibrium.',
        suggestedAssets: ['EURUSD', 'USDJPY', 'V50', 'V10'],
        riskMultiplier: 0.8,
        protocol: 'Sell at Premium boundaries, Buy at Discount boundaries. Do not expect long expansions.'
    };
}
