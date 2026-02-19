
import { MARKET_CONFIGS } from './marketConfigs';
import type { SignalData } from '../types';

interface TPSLCalculation {
  stopLoss: number;
  takeProfits: [number, number, number];
  slDistance: number;
  tpDistances: [number, number, number];
  entryPoints: number[];
}

function detectPrecision(asset: string): number {
    const sym = asset.toUpperCase();
    if (sym.includes('JPY')) return 3;
    if (sym.includes('XAU') || sym.includes('BTC') || sym.includes('ETH')) return 2;
    if (sym.includes('BOOM') || sym.includes('CRASH') || sym.includes('VOL')) return 2;
    if (sym.includes('US30') || sym.includes('NAS100')) return 1;
    return 5;
}

export function calculateTPSL(
  entryPoints: number[],
  signal: 'BUY' | 'SELL',
  asset: string,
  riskRewardRatio: string,
  existingStopLoss?: number
): TPSLCalculation {
  
  const precision = detectPrecision(asset);
  const [risk, reward] = riskRewardRatio.split(':').map(Number);
  const targetRatio = (reward && risk) ? (reward / risk) : 3.0;
  
  const marketConfigKey = Object.keys(MARKET_CONFIGS).find(k => 
    asset.toUpperCase().includes(k)
  );
  const marketConfig = marketConfigKey 
    ? MARKET_CONFIGS[marketConfigKey] 
    : null;
  
  // 1. Validate & Fix Entries (Ensure they are distinct)
  // Entry 0 = Aggressive (Current/Breakout)
  // Entry 1 = Optimal (Standard Deviation / Retracement)
  // Entry 2 = Safe (Deep Pullback)
  
  let validEntries = [...entryPoints];
  // Ensure we have at least one valid entry
  if (validEntries.length === 0 || !validEntries[0]) validEntries = [0, 0, 0]; // Will fail downstream if 0, handled by UI
  
  // Fill missing entries
  if (validEntries.length < 3) {
      while (validEntries.length < 3) validEntries.push(validEntries[0]);
  }

  // 2. Validate Stop Loss
  let stopLoss = existingStopLoss || 0;
  const baseEntry = validEntries[0];
  
  const genericMinDist = baseEntry * 0.0015; // 0.15% price min distance
  const configMinDist = marketConfig ? marketConfig.minStopLoss : genericMinDist;
  
  let currentSlDist = Math.abs(baseEntry - stopLoss);

  // If SL is invalid, too close, or on wrong side, Recalculate
  const isSlValid = stopLoss > 0 && currentSlDist >= configMinDist;
  const isSlCorrectSide = signal === 'BUY' ? stopLoss < baseEntry : stopLoss > baseEntry;

  if (!isSlValid || !isSlCorrectSide) {
      // Create SL based on ATR-like logic (using config or generic)
      const buffer = configMinDist * 2.5; // Healthy breathing room
      stopLoss = signal === 'BUY' ? baseEntry - buffer : baseEntry + buffer;
      currentSlDist = buffer;
  }

  // 3. ENFORCE DISTINCT ENTRIES (Fixing the Glitch)
  // If entries are identical, create a "Standard Deviation" spread
  // We use the SL distance as a proxy for volatility
  const volatilityUnit = currentSlDist * 0.25; // 25% of SL distance

  // Check if entries are too close (glitch detection)
  if (Math.abs(validEntries[1] - validEntries[0]) < Number.EPSILON) {
      if (signal === 'BUY') {
          validEntries[1] = Number((validEntries[0] - volatilityUnit).toFixed(precision)); // Lower (better buy)
          validEntries[2] = Number((validEntries[0] - (volatilityUnit * 2)).toFixed(precision)); // Lowest (best buy)
      } else {
          validEntries[1] = Number((validEntries[0] + volatilityUnit).toFixed(precision)); // Higher (better sell)
          validEntries[2] = Number((validEntries[0] + (volatilityUnit * 2)).toFixed(precision)); // Highest (best sell)
      }
  }

  // 4. Calculate Distinct Take Profits based on R:R
  // We calculate TPs based on the *Optimal* entry (index 1) to be realistic, 
  // but ensure they scale from the base.
  
  const takeProfits: [number, number, number] = [0, 0, 0];
  const tpDistances: [number, number, number] = [0, 0, 0];
  
  // TP1 = 1R (Secure the bag)
  // TP2 = Target Ratio (e.g., 3R)
  // TP3 = Moonbag (e.g., 5R or Target + Standard Deviation extension)
  
  const rUnit = currentSlDist; 

  const ratios = [1.0, targetRatio, targetRatio + 2.0]; // e.g. 1:1, 1:3, 1:5

  ratios.forEach((r, idx) => {
      const dist = rUnit * r;
      let tpPrice = 0;
      if (signal === 'BUY') {
          tpPrice = baseEntry + dist;
      } else {
          tpPrice = baseEntry - dist;
      }
      takeProfits[idx] = Number(tpPrice.toFixed(precision));
      tpDistances[idx] = dist;
  });

  return {
    stopLoss: Number(stopLoss.toFixed(precision)),
    takeProfits,
    slDistance: currentSlDist,
    tpDistances,
    entryPoints: validEntries
  };
}

export function validateAndFixTPSL(
  signal: Omit<SignalData, 'id' | 'timestamp'>,
  riskRewardRatio: string
): Omit<SignalData, 'id' | 'timestamp'> {
  
  if (signal.signal === 'NEUTRAL') {
    return signal; 
  }
  
  const calculated = calculateTPSL(
    signal.entryPoints,
    signal.signal as 'BUY' | 'SELL',
    signal.asset,
    riskRewardRatio,
    signal.stopLoss
  );
    
  return {
    ...signal,
    entryPoints: calculated.entryPoints,
    stopLoss: calculated.stopLoss,
    takeProfits: calculated.takeProfits
  };
}
