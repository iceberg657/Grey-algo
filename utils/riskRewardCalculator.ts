
import { MARKET_CONFIGS } from './marketConfigs';
import type { SignalData } from '../types';

interface TPSLCalculation {
  stopLoss: number;
  takeProfits: [number, number, number];
  slDistance: number;
  tpDistances: [number, number, number];
}

export function calculateTPSL(
  entryPoints: number[],
  signal: 'BUY' | 'SELL',
  asset: string,
  riskRewardRatio: string,
  existingStopLoss?: number
): TPSLCalculation {
  
  const [risk, reward] = riskRewardRatio.split(':').map(Number);
  const ratio = (reward && risk) ? (reward / risk) : 2.0; // Default to 1:2 if parse fails
  
  const marketConfigKey = Object.keys(MARKET_CONFIGS).find(k => 
    asset.toUpperCase().includes(k)
  );
  const marketConfig = marketConfigKey 
    ? MARKET_CONFIGS[marketConfigKey] 
    : null;
  
  // 1. Determine Stop Loss
  const sniperEntry = entryPoints[0];
  let stopLoss = existingStopLoss || 0;
  
  // Logic to ensure SL isn't too close (prevents 1:600 RR bugs)
  // If no config found, assume min distance is 0.1% of price (safe generic fallback)
  const genericMinDist = sniperEntry * 0.001; 
  const minDist = marketConfig ? marketConfig.minStopLoss : genericMinDist;
  
  const calcSlDist = Math.abs(sniperEntry - stopLoss);

  // If SL is missing, zero, or too close to entry, recalculate it safely
  if (!stopLoss || calcSlDist < minDist || calcSlDist === 0) {
      // Create a healthy buffer
      const buffer = marketConfig ? marketConfig.minStopLoss * 1.5 : genericMinDist * 1.5; 
      stopLoss = signal === 'BUY' ? sniperEntry - buffer : sniperEntry + buffer;
  }

  // 2. Calculate TPs to align with Entries for constant R:R
  const takeProfits: [number, number, number] = [0, 0, 0];
  const tpDistances: [number, number, number] = [0, 0, 0];

  entryPoints.forEach((entry, index) => {
      if (index > 2) return; // Only process first 3

      const distanceToSL = Math.abs(entry - stopLoss);
      // Ensure distance is substantial enough to calculate TP
      const safeDistance = Math.max(distanceToSL, minDist);
      
      const profitDistance = safeDistance * ratio;
      
      let tpPrice = 0;
      if (signal === 'BUY') {
          tpPrice = entry + profitDistance;
      } else {
          tpPrice = entry - profitDistance;
      }
      
      takeProfits[index] = Number(tpPrice.toFixed(detectPrecision(asset)));
      tpDistances[index] = profitDistance;
  });

  // Fallback if less than 3 entries provided
  if (takeProfits[1] === 0) takeProfits[1] = takeProfits[0];
  if (takeProfits[2] === 0) takeProfits[2] = takeProfits[0];

  return {
    stopLoss: Number(stopLoss.toFixed(detectPrecision(asset))),
    takeProfits,
    slDistance: Math.abs(sniperEntry - stopLoss),
    tpDistances
  };
}

function detectPrecision(asset: string): number {
    const sym = asset.toUpperCase();
    if (sym.includes('JPY')) return 3;
    if (sym.includes('XAU') || sym.includes('BTC') || sym.includes('ETH')) return 2;
    if (sym.includes('BOOM') || sym.includes('CRASH') || sym.includes('VOL')) return 2;
    if (sym.includes('US30') || sym.includes('NAS100')) return 1;
    return 5;
}

export function validateAndFixTPSL(
  signal: Omit<SignalData, 'id' | 'timestamp'>,
  riskRewardRatio: string
): Omit<SignalData, 'id' | 'timestamp'> {
  
  if (signal.signal === 'NEUTRAL') {
    return signal; 
  }
  
  // Ensure we have 3 entry points for the logic to work
  const entries = [...signal.entryPoints];
  while (entries.length < 3) {
      // If AI only gave 1 point, duplicate it or create small spread
      // Adding tiny spread for realism if duplicating
      const base = entries[0];
      const spread = base * 0.0002; // Tiny spread
      entries.push(signal.signal === 'BUY' ? base + spread : base - spread);
  }
  
  const calculated = calculateTPSL(
    entries,
    signal.signal as 'BUY' | 'SELL',
    signal.asset,
    riskRewardRatio,
    signal.stopLoss // Pass existing SL to check validity
  );
    
  return {
    ...signal,
    entryPoints: entries,
    stopLoss: calculated.stopLoss,
    takeProfits: calculated.takeProfits
  };
}
