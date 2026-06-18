
import type { MarketConfig } from '../types';

export const DEFAULT_MARKET_CONFIG: MarketConfig = {
    minStopLoss: 10, // pips/points
    maxStopLoss: 100,
    tp1Distance: 20,
    tp2Distance: 50,
    tp3Distance: 100,
    minTimeframe: 'M5',
    spikeThreshold: 0.005 
};

export const MARKET_CONFIGS: Record<string, MarketConfig> = {
    // --- FOREX ---
    'EURUSD': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 0.0005, tp1Distance: 0.0015 },
    'GBPUSD': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 0.0008, tp1Distance: 0.0020 },
    'USDJPY': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 0.08, tp1Distance: 0.20 },
    'GBPJPY': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 0.15, tp1Distance: 0.45 },
    'AUDUSD': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 0.0005, tp1Distance: 0.0015 },
    'USDCAD': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 0.0005, tp1Distance: 0.0015 },
    'USDCHF': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 0.0005, tp1Distance: 0.0015 },
    'NZDUSD': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 0.0005, tp1Distance: 0.0015 },
    'EURGBP': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 0.0005, tp1Distance: 0.0015 },
    'EURJPY': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 0.08, tp1Distance: 0.20 },
    'GBPCHF': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 0.0008, tp1Distance: 0.0022 },
    
    // --- COMMODITIES & CRYPTO ---
    'XAUUSD': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 2.0, tp1Distance: 5.0 }, // Gold $2 move
    'XAGUSD': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 0.2, tp1Distance: 0.6 },
    'SILVER': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 0.2, tp1Distance: 0.6 },
    'XBRUSD': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 0.5, tp1Distance: 1.5 },
    'BRENT':  { ...DEFAULT_MARKET_CONFIG, minStopLoss: 0.5, tp1Distance: 1.5 },
    'XTIUSD': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 0.5, tp1Distance: 1.5 },
    'WTI':    { ...DEFAULT_MARKET_CONFIG, minStopLoss: 0.5, tp1Distance: 1.5 },
    'BTCUSD': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 200, tp1Distance: 600 },
    'ETHUSD': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 15, tp1Distance: 45 },
    'LTCUSD': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 2.0, tp1Distance: 6.0 },
    
    // --- US INDICES ---
    'US30': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 30, tp1Distance: 90 },
    'NAS100': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 20, tp1Distance: 60 },
    'US500': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 5, tp1Distance: 15 },
    'UK100': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 15, tp1Distance: 45 },
    'GER40': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 15, tp1Distance: 45 },
    'FRA40': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 15, tp1Distance: 45 },
    'JPN225': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 50, tp1Distance: 150 },
    'AUS200': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 20, tp1Distance: 60 },

    // --- DERIV SYNTHETICS (High Precision Mastery) ---
    
    // CRASH (Sell Spikes) - Low SL, High Reward
    'CRASH50':   { ...DEFAULT_MARKET_CONFIG, minStopLoss: 5, tp1Distance: 20, spikeThreshold: 0.01 },
    'CRASH150N': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 5, tp1Distance: 20, spikeThreshold: 0.01 },
    'CRASH300N': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 5, tp1Distance: 20, spikeThreshold: 0.01 },
    'CRASH500':  { ...DEFAULT_MARKET_CONFIG, minStopLoss: 5, tp1Distance: 15 },
    'CRASH600':  { ...DEFAULT_MARKET_CONFIG, minStopLoss: 4, tp1Distance: 12 },
    'CRASH900':  { ...DEFAULT_MARKET_CONFIG, minStopLoss: 4, tp1Distance: 12 },
    'CRASH1000': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 4, tp1Distance: 12 },
    
    // BOOM (Buy Spikes) - Low SL, High Reward
    'BOOM50':    { ...DEFAULT_MARKET_CONFIG, minStopLoss: 5, tp1Distance: 20, spikeThreshold: 0.01 },
    'BOOM150N':  { ...DEFAULT_MARKET_CONFIG, minStopLoss: 5, tp1Distance: 20, spikeThreshold: 0.01 },
    'BOOM300N':  { ...DEFAULT_MARKET_CONFIG, minStopLoss: 5, tp1Distance: 20, spikeThreshold: 0.01 },
    'BOOM500':   { ...DEFAULT_MARKET_CONFIG, minStopLoss: 5, tp1Distance: 15 },
    'BOOM600':   { ...DEFAULT_MARKET_CONFIG, minStopLoss: 4, tp1Distance: 12 },
    'BOOM900':   { ...DEFAULT_MARKET_CONFIG, minStopLoss: 4, tp1Distance: 12 },
    'BOOM1000':  { ...DEFAULT_MARKET_CONFIG, minStopLoss: 4, tp1Distance: 12 },
    
    '1HZ100V': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 50, tp1Distance: 150 },
    '1HZ75V':  { ...DEFAULT_MARKET_CONFIG, minStopLoss: 100, tp1Distance: 300 }, 
    '1HZ50V':  { ...DEFAULT_MARKET_CONFIG, minStopLoss: 15, tp1Distance: 45 },
    '1HZ25V':  { ...DEFAULT_MARKET_CONFIG, minStopLoss: 10, tp1Distance: 30 },
    '1HZ10V':  { ...DEFAULT_MARKET_CONFIG, minStopLoss: 5, tp1Distance: 15 },
    'R_100':   { ...DEFAULT_MARKET_CONFIG, minStopLoss: 100, tp1Distance: 300 },
    'R_75':    { ...DEFAULT_MARKET_CONFIG, minStopLoss: 1500, tp1Distance: 4500 }, 
    'R_50':    { ...DEFAULT_MARKET_CONFIG, minStopLoss: 15, tp1Distance: 45 },
    'R_25':    { ...DEFAULT_MARKET_CONFIG, minStopLoss: 10, tp1Distance: 30 },
    'R_10':    { ...DEFAULT_MARKET_CONFIG, minStopLoss: 5, tp1Distance: 15 },
    'STP':     { ...DEFAULT_MARKET_CONFIG, minStopLoss: 2.0, tp1Distance: 6.0 },
    'JDM10':  { ...DEFAULT_MARKET_CONFIG, minStopLoss: 50, tp1Distance: 150 },
    'JDM25':  { ...DEFAULT_MARKET_CONFIG, minStopLoss: 50, tp1Distance: 150 },
    'JDM50':  { ...DEFAULT_MARKET_CONFIG, minStopLoss: 50, tp1Distance: 150 },
    'JDM100': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 50, tp1Distance: 150 },
    
    // RANGE BREAK
    'RB_100': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 10, tp1Distance: 30 },
    'RB_200': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 20, tp1Distance: 60 }
};
