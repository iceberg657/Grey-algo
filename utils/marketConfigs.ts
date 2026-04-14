
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
    
    // --- COMMODITIES & CRYPTO ---
    'XAUUSD': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 2.0, tp1Distance: 5.0 }, // Gold $2 move
    'BTCUSD': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 200, tp1Distance: 600 },
    'ETHUSD': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 15, tp1Distance: 45 },
    
    // --- US INDICES ---
    'US30': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 30, tp1Distance: 90 },
    'NAS100': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 20, tp1Distance: 60 },

    // --- DERIV SYNTHETICS (High Precision Mastery) ---
    
    // CRASH (Sell Spikes) - Low SL, High Reward
    'CRASH300':  { ...DEFAULT_MARKET_CONFIG, minStopLoss: 5, tp1Distance: 20, spikeThreshold: 0.01 }, // Very Volatile
    'CRASH500':  { ...DEFAULT_MARKET_CONFIG, minStopLoss: 5, tp1Distance: 15 },
    'CRASH1000': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 4, tp1Distance: 12 },
    
    // BOOM (Buy Spikes) - Low SL, High Reward
    'BOOM300':   { ...DEFAULT_MARKET_CONFIG, minStopLoss: 5, tp1Distance: 20, spikeThreshold: 0.01 },
    'BOOM500':   { ...DEFAULT_MARKET_CONFIG, minStopLoss: 5, tp1Distance: 15 },
    'BOOM1000':  { ...DEFAULT_MARKET_CONFIG, minStopLoss: 4, tp1Distance: 12 },
    
    // VOLATILITY INDICES (Pure Price Action)
    // V75 family moves thousands of points
    'V75':    { ...DEFAULT_MARKET_CONFIG, minStopLoss: 1500, tp1Distance: 4500 }, 
    'V75(1S)':{ ...DEFAULT_MARKET_CONFIG, minStopLoss: 100, tp1Distance: 300 }, 
    'V100':   { ...DEFAULT_MARKET_CONFIG, minStopLoss: 100, tp1Distance: 300 },
    'V100(1S)':{ ...DEFAULT_MARKET_CONFIG, minStopLoss: 50, tp1Distance: 150 },
    'V50':    { ...DEFAULT_MARKET_CONFIG, minStopLoss: 15, tp1Distance: 45 },
    'V25':    { ...DEFAULT_MARKET_CONFIG, minStopLoss: 10, tp1Distance: 30 },
    'V10':    { ...DEFAULT_MARKET_CONFIG, minStopLoss: 5, tp1Distance: 15 },
    
    // STEP & JUMP
    'STEP':   { ...DEFAULT_MARKET_CONFIG, minStopLoss: 2.0, tp1Distance: 6.0 }, // Step Index (0.1 increments)
    'JUMP10': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 50, tp1Distance: 150 },
    'JUMP25': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 50, tp1Distance: 150 },
    'JUMP50': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 50, tp1Distance: 150 },
    'JUMP100':{ ...DEFAULT_MARKET_CONFIG, minStopLoss: 50, tp1Distance: 150 },
    
    // RANGE BREAK
    'RANGE100': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 10, tp1Distance: 30 },
    'RANGE200': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 20, tp1Distance: 60 }
};
