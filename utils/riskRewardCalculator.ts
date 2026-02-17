
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
    : MARKET_CONFIGS['EURUSD'];
  
  // 1. Determine Stop Loss
  // If provided by AI and valid (distance > min), use it. Otherwise, calculate based on Sniper entry.
  const sniperEntry = entryPoints[0];
  let stopLoss = existingStopLoss || 0;
  
  const minDist = marketConfig.minStopLoss;
  const calcSlDist = Math.abs(sniperEntry - stopLoss);

  if (!stopLoss || calcSlDist < minDist) {
      const buffer = minDist * 1.5; // Healthy buffer
      stopLoss = signal === 'BUY' ? sniperEntry - buffer : sniperEntry + buffer;
  }

  // 2. Calculate TPs to align with Entries for constant R:R
  // Logic: 
  // TP1 aligns with Sniper Entry (Index 0) to give Target R:R
  // TP2 aligns with Market Entry (Index 1) to give Target R:R
  // TP3 aligns with Safe Entry   (Index 2) to give Target R:R
  
  const takeProfits: [number, number, number] = [0, 0, 0];
  const tpDistances: [number, number, number] = [0, 0, 0];

  entryPoints.forEach((entry, index) => {
      if (index > 2) return; // Only process first 3

      const distanceToSL = Math.abs(entry - stopLoss);
      const profitDistance = distanceToSL * ratio;
      
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
    if (asset.includes('JPY')) return 3;
    if (asset.includes('XAU') || asset.includes('BTC') || asset.includes('ETH')) return 2;
    if (asset.includes('US30') || asset.includes('NAS100')) return 1;
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
      entries.push(entries[0]);
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
