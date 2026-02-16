
import type { MarketConfig } from '../types';

export const DEFAULT_MARKET_CONFIG: MarketConfig = {
    minStopLoss: 10, // pips
    maxStopLoss: 100,
    tp1Distance: 20,
    tp2Distance: 50,
    tp3Distance: 100,
    minTimeframe: 'M5',
    spikeThreshold: 0.005 // 0.5% price spike
};

export const MARKET_CONFIGS: Record<string, MarketConfig> = {
    'EURUSD': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 0.0005, tp1Distance: 0.0015 }, // 5 pips SL
    'GBPUSD': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 0.0008, tp1Distance: 0.0020 },
    'USDJPY': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 0.08, tp1Distance: 0.20 },
    'XAUUSD': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 1.5, tp1Distance: 3.0 }, // $1.50 Gold move
    'BTCUSD': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 150, tp1Distance: 450 },
    'US30': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 25, tp1Distance: 75 },
    'NAS100': { ...DEFAULT_MARKET_CONFIG, minStopLoss: 15, tp1Distance: 45 }
};
