
import type { MarketConfig } from '../types';

export const DEFAULT_MARKET_CONFIG: MarketConfig = {
    minStopLoss: 5, // pips/points (tight, close floor)
    maxStopLoss: 40,
    tp1Distance: 6, // 1:1.2 quick scalp target
    tp2Distance: 10,
    tp3Distance: 15,
    minTimeframe: 'M5',
    spikeThreshold: 0.005 
};

export const MARKET_CONFIGS: Record<string, MarketConfig> = {
    // --- FOREX MAJORS & MINORS (3-6 pips SL, close achievable TP targets) ---
    'EURUSD': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 0.0003, tp1Distance: 0.0004 },
    'GBPUSD': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 0.0004, tp1Distance: 0.0005 },
    'USDJPY': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 0.04, tp1Distance: 0.05 },
    'GBPJPY': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 0.06, tp1Distance: 0.08 },
    'AUDUSD': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 0.0003, tp1Distance: 0.0004 },
    'USDCAD': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 0.0003, tp1Distance: 0.0004 },
    'USDCHF': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 0.0003, tp1Distance: 0.0004 },
    'NZDUSD': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 0.0003, tp1Distance: 0.0004 },
    'AUDNZD': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 0.0004, tp1Distance: 0.0005 },
    'AUDCAD': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 0.0004, tp1Distance: 0.0005 },
    'AUDCHF': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 0.0004, tp1Distance: 0.0005 },
    'AUDJPY': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 0.05, tp1Distance: 0.06 },
    'CADCHF': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 0.0004, tp1Distance: 0.0005 },
    'CADJPY': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 0.05, tp1Distance: 0.06 },
    'CHFJPY': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 0.05, tp1Distance: 0.07 },
    'EURAUD': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 0.0005, tp1Distance: 0.0006 },
    'EURCAD': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 0.0004, tp1Distance: 0.0005 },
    'EURCHF': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 0.0003, tp1Distance: 0.0004 },
    'EURGBP': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 0.0003, tp1Distance: 0.0004 },
    'EURJPY': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 0.05, tp1Distance: 0.06 },
    'EURNZD': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 0.0005, tp1Distance: 0.0006 },
    'GBPAUD': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 0.0005, tp1Distance: 0.0007 },
    'GBPCAD': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 0.0005, tp1Distance: 0.0006 },
    'GBPCHF': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 0.0004, tp1Distance: 0.0005 },
    'GBPNZD': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 0.0006, tp1Distance: 0.0008 },
    'NZDCAD': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 0.0004, tp1Distance: 0.0005 },
    'NZDCHF': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 0.0004, tp1Distance: 0.0005 },
    'NZDJPY': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 0.05, tp1Distance: 0.06 },
    
    // --- COMMODITIES & CRYPTO (Tight Surgical Calibration) ---
    'XAUUSD': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 1.0, tp1Distance: 1.2 }, // Gold $1.00 move
    'XAGUSD': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 0.1, tp1Distance: 0.15 },
    'SILVER': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 0.1, tp1Distance: 0.15 },
    'XBRUSD': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 0.25, tp1Distance: 0.35 },
    'BRENT':  { ...DEFAULT_MARKET_CONFIG, minStopLoss: 0.25, tp1Distance: 0.35 },
    'XTIUSD': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 0.25, tp1Distance: 0.35 },
    'WTI':    { ...DEFAULT_MARKET_CONFIG, minStopLoss: 0.25, tp1Distance: 0.35 },
    'BTCUSD': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 80, tp1Distance: 100 },
    'ETHUSD': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 5, tp1Distance: 7 },
    'LTCUSD': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 0.8, tp1Distance: 1.2 },
    
    // --- US INDICES ---
    'US30': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 12, tp1Distance: 15 },
    'NAS100': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 8, tp1Distance: 10 },
    'US500': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 2.0, tp1Distance: 2.5 },
    'UK100': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 6, tp1Distance: 8 },
    'GER40': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 6, tp1Distance: 8 },
    'FRA40': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 6, tp1Distance: 8 },
    'JPN225': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 20, tp1Distance: 25 },
    'AUS200': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 8, tp1Distance: 10 },

    // --- DERIV SYNTHETICS (High Precision Mastery - Close Targets) ---
    
    // CRASH (Sell Spikes) - Low SL, Quick TP
    'CRASH50':   { ...DEFAULT_MARKET_CONFIG, minStopLoss: 2, tp1Distance: 2.5, spikeThreshold: 0.01 },
    'CRASH150N': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 2, tp1Distance: 2.5, spikeThreshold: 0.01 },
    'CRASH300N': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 2, tp1Distance: 2.5, spikeThreshold: 0.01 },
    'CRASH500':  { ...DEFAULT_MARKET_CONFIG, minStopLoss: 2, tp1Distance: 2.5 },
    'CRASH600':  { ...DEFAULT_MARKET_CONFIG, minStopLoss: 1.5, tp1Distance: 2.0 },
    'CRASH900':  { ...DEFAULT_MARKET_CONFIG, minStopLoss: 1.5, tp1Distance: 2.0 },
    'CRASH1000': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 1.5, tp1Distance: 2.0 },
    
    // BOOM (Buy Spikes) - Low SL, Quick TP
    'BOOM50':    { ...DEFAULT_MARKET_CONFIG, minStopLoss: 2, tp1Distance: 2.5, spikeThreshold: 0.01 },
    'BOOM150N':  { ...DEFAULT_MARKET_CONFIG, minStopLoss: 2, tp1Distance: 2.5, spikeThreshold: 0.01 },
    'BOOM300N':  { ...DEFAULT_MARKET_CONFIG, minStopLoss: 2, tp1Distance: 2.5, spikeThreshold: 0.01 },
    'BOOM500':   { ...DEFAULT_MARKET_CONFIG, minStopLoss: 2, tp1Distance: 2.5 },
    'BOOM600':   { ...DEFAULT_MARKET_CONFIG, minStopLoss: 1.5, tp1Distance: 2.0 },
    'BOOM900':   { ...DEFAULT_MARKET_CONFIG, minStopLoss: 1.5, tp1Distance: 2.0 },
    'BOOM1000':  { ...DEFAULT_MARKET_CONFIG, minStopLoss: 1.5, tp1Distance: 2.0 },
    
    '1HZ100V': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 15, tp1Distance: 20 },
    '1HZ75V':  { ...DEFAULT_MARKET_CONFIG, minStopLoss: 30, tp1Distance: 40 }, 
    '1HZ50V':  { ...DEFAULT_MARKET_CONFIG, minStopLoss: 6, tp1Distance: 8 },
    '1HZ25V':  { ...DEFAULT_MARKET_CONFIG, minStopLoss: 4, tp1Distance: 5 },
    '1HZ10V':  { ...DEFAULT_MARKET_CONFIG, minStopLoss: 2, tp1Distance: 3 },
    'R_100':   { ...DEFAULT_MARKET_CONFIG, minStopLoss: 30, tp1Distance: 40 },
    'R_75':    { ...DEFAULT_MARKET_CONFIG, minStopLoss: 400, tp1Distance: 500 }, 
    'R_50':    { ...DEFAULT_MARKET_CONFIG, minStopLoss: 6, tp1Distance: 8 },
    'R_25':    { ...DEFAULT_MARKET_CONFIG, minStopLoss: 4, tp1Distance: 5 },
    'R_10':    { ...DEFAULT_MARKET_CONFIG, minStopLoss: 2, tp1Distance: 3 },
    'STP':     { ...DEFAULT_MARKET_CONFIG, minStopLoss: 0.8, tp1Distance: 1.2 },
    'JDM10':  { ...DEFAULT_MARKET_CONFIG, minStopLoss: 15, tp1Distance: 20 },
    'JDM25':  { ...DEFAULT_MARKET_CONFIG, minStopLoss: 15, tp1Distance: 20 },
    'JDM50':  { ...DEFAULT_MARKET_CONFIG, minStopLoss: 15, tp1Distance: 20 },
    'JDM100': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 50, tp1Distance: 150 },
    
    // RANGE BREAK
    'RB_100': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 10, tp1Distance: 30 },
    'RB_200': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 20, tp1Distance: 60 }
};
