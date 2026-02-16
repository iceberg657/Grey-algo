
import { MARKET_CONFIGS } from './marketConfigs';
import type { SignalData } from '../types';

interface TPSLCalculation {
  stopLoss: number;
  takeProfits: [number, number, number];
  slDistance: number;
  tpDistances: [number, number, number];
}

export function calculateTPSL(
  entryPrice: number,
  signal: 'BUY' | 'SELL',
  asset: string,
  riskRewardRatio: string
): TPSLCalculation {
  
  const [risk, reward] = riskRewardRatio.split(':').map(Number);
  
  if (!risk || !reward) {
    throw new Error(`Invalid risk:reward ratio: ${riskRewardRatio}`);
  }
  
  const marketConfigKey = Object.keys(MARKET_CONFIGS).find(k => 
    asset.toUpperCase().includes(k)
  );
  const marketConfig = marketConfigKey 
    ? MARKET_CONFIGS[marketConfigKey] 
    : MARKET_CONFIGS['EURUSD'];
  
  let slDistance = marketConfig.minStopLoss;
  slDistance = marketConfig.minStopLoss * 1.2; // 20% buffer
  
  let stopLoss: number;
  if (signal === 'BUY') {
    stopLoss = entryPrice - slDistance;
  } else {
    stopLoss = entryPrice + slDistance;
  }
  
  const rewardMultiplier = reward / risk;
  
  const tp1Distance = slDistance * rewardMultiplier * 0.33;
  const tp2Distance = slDistance * rewardMultiplier * 0.66;
  const tp3Distance = slDistance * rewardMultiplier * 1.0;
  
  let takeProfits: [number, number, number];
  if (signal === 'BUY') {
    takeProfits = [
      entryPrice + tp1Distance,
      entryPrice + tp2Distance,
      entryPrice + tp3Distance
    ];
  } else {
    takeProfits = [
      entryPrice - tp1Distance,
      entryPrice - tp2Distance,
      entryPrice - tp3Distance
    ];
  }
  
  return {
    stopLoss,
    takeProfits,
    slDistance,
    tpDistances: [tp1Distance, tp2Distance, tp3Distance]
  };
}

export function validateAndFixTPSL(
  signal: Omit<SignalData, 'id' | 'timestamp'>,
  riskRewardRatio: string
): Omit<SignalData, 'id' | 'timestamp'> {
  
  if (signal.signal === 'NEUTRAL') {
    return signal; 
  }
  
  const entryPrice = signal.entryPoints[0] || signal.entryPoints[1]; // Prefer Sniper
  
  const marketConfigKey = Object.keys(MARKET_CONFIGS).find(k => 
    signal.asset.toUpperCase().includes(k)
  );
  const marketConfig = marketConfigKey 
    ? MARKET_CONFIGS[marketConfigKey] 
    : MARKET_CONFIGS['EURUSD'];
  
  const currentSLDistance = Math.abs(entryPrice - signal.stopLoss);
  
  const needsRecalculation = 
    currentSLDistance < marketConfig.minStopLoss ||
    signal.stopLoss === 0 ||
    signal.takeProfits.some(tp => tp === 0);
  
  if (needsRecalculation) {
    // console.log(`Recalculating TP/SL for ${signal.asset}`);
    const calculated = calculateTPSL(
      entryPrice,
      signal.signal as 'BUY' | 'SELL',
      signal.asset,
      riskRewardRatio
    );
    
    return {
      ...signal,
      stopLoss: calculated.stopLoss,
      takeProfits: calculated.takeProfits
    };
  }
  
  return signal;
}
