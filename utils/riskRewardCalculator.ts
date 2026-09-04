
import { MARKET_CONFIGS } from './marketConfigs';
import type { SignalData, TradingStyle } from '../types';

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
  existingStopLoss?: number,
  tradingStyle?: TradingStyle,
  twelveDataQuote?: any
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
  
  const isScalping = tradingStyle?.toLowerCase().includes('scalping');

  // 1. Validate & Fix Entries
  let validEntries = [...entryPoints];
  if (validEntries.length === 0 || validEntries[0] === 0 || !validEntries[0]) {
      const fallbackPrice = twelveDataQuote?.close ? parseFloat(twelveDataQuote.close) : 0;
      validEntries = fallbackPrice > 0 ? [fallbackPrice, fallbackPrice, fallbackPrice] : [0, 0, 0];
  }
  if (validEntries.length < 3) {
      while (validEntries.length < 3) validEntries.push(validEntries[0]);
  }

  // 2. Validate Stop Loss (MODERATE & PRECISE)
  let stopLoss = existingStopLoss || 0;
  const baseEntry = validEntries[0];
  
  // Use ATR from Twelve Data if available for a "Volatility Buffer"
  const atr = twelveDataQuote?.atr ? parseFloat(twelveDataQuote.atr) : null;
  const genericMinDist = Math.max(baseEntry * 0.0008, 0.0008); // Calibrated minimum safety floor (e.g. 8-10 pips on Forex)
  
  // Use a safer default for config minimums, ensuring enough breathing room
  let configMinDist = marketConfig ? Math.max(marketConfig.minStopLoss * 1.5, genericMinDist) : genericMinDist;
  
  // If ATR is available, use it to define a safe minimum distance (at least 1.5x - 2.0x ATR for lower timeframe breathing room)
  if (atr && !isNaN(atr)) {
      const atrMultiplier = isScalping ? 1.5 : 2.0;
      configMinDist = Math.max(configMinDist, atr * atrMultiplier);
  }

  // ABSOLUTE CALIBRATED FLOORS FOR ASSETS TO PREVENT TINY/TIGHT STOP LOSSES ON 1M/LOWER TIMEFRAMES
  const upperAsset = asset.toUpperCase();
  if (upperAsset.includes('JPY')) {
      configMinDist = Math.max(configMinDist, 0.12); // At least 12-15 pips on JPY pairs
  } else if (upperAsset.includes('XAU') || upperAsset.includes('GOLD')) {
      configMinDist = Math.max(configMinDist, 2.5); // At least $2.50 move for Gold
  } else if (upperAsset.includes('BTC')) {
      configMinDist = Math.max(configMinDist, 200);
  } else if (upperAsset.includes('ETH')) {
      configMinDist = Math.max(configMinDist, 15.0);
  } else if (upperAsset.includes('US30') || upperAsset.includes('DJI') || upperAsset.includes('DOW')) {
      configMinDist = Math.max(configMinDist, 35.0);
  } else if (upperAsset.includes('NAS') || upperAsset.includes('NDX') || upperAsset.includes('US100')) {
      configMinDist = Math.max(configMinDist, 20.0);
  } else if (upperAsset.includes('SPX') || upperAsset.includes('US500')) {
      configMinDist = Math.max(configMinDist, 6.0);
  } else if (upperAsset.includes('BOOM') || upperAsset.includes('CRASH')) {
      configMinDist = Math.max(configMinDist, 3.0);
  }
  
  let currentSlDist = Math.abs(baseEntry - stopLoss);

  // If SL is invalid, too close, or on wrong side, Recalculate with calibrated buffer
  const isSlValid = stopLoss > 0 && currentSlDist >= configMinDist;
  const isSlCorrectSide = signal === 'BUY' ? stopLoss < baseEntry : stopLoss > baseEntry;

  if (!isSlValid || !isSlCorrectSide) {
      // Create safer SL based on ATR-like logic or config minimum with calibrated breathing room
      const buffer = Math.max(configMinDist, currentSlDist < configMinDist ? configMinDist * 1.2 : currentSlDist);
      
      stopLoss = signal === 'BUY' ? baseEntry - buffer : baseEntry + buffer;
      currentSlDist = buffer;
  }

  const originalSlDist = currentSlDist;

  // 3. ENFORCE DISTINCT ENTRIES
  const spreadFactor = isScalping ? 0.10 : 0.25;
  const volatilityUnit = originalSlDist * spreadFactor;

  if (Math.abs(validEntries[1] - validEntries[0]) < Number.EPSILON) {
      if (signal === 'BUY') {
          validEntries[1] = Number((validEntries[0] - volatilityUnit).toFixed(precision));
          validEntries[2] = Number((validEntries[0] - (volatilityUnit * 2)).toFixed(precision));
      } else {
          validEntries[1] = Number((validEntries[0] + volatilityUnit).toFixed(precision));
          validEntries[2] = Number((validEntries[0] + (volatilityUnit * 2)).toFixed(precision));
      }
  }

  // 4. Calculate Distinct Take Profits based on R:R (ALWAYS 1:2.0 minimum on lower timeframes/scalps)
  const takeProfits: [number, number, number] = [0, 0, 0];
  const tpDistances: [number, number, number] = [0, 0, 0];
  
  const rUnit = currentSlDist; 
  // GreyAlpha standard RR range: ALWAYS 1:2.0 minimum on lower timeframes
  const ratios = isScalping ? [2.0, 3.0, 4.5] : [2.0, 3.0, Math.max(4.5, targetRatio)]; 

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
  riskRewardRatio: string,
  tradingStyle?: TradingStyle,
  twelveDataQuote?: any
): Omit<SignalData, 'id' | 'timestamp'> {
  
  if (signal.signal !== 'BUY' && signal.signal !== 'SELL') {
    return signal; 
  }
  
  const calculated = calculateTPSL(
    signal.entryPoints,
    signal.signal as 'BUY' | 'SELL',
    signal.asset,
    riskRewardRatio,
    signal.stopLoss,
    tradingStyle,
    twelveDataQuote
  );
    
  return {
    ...signal,
    entryPoints: calculated.entryPoints,
    stopLoss: calculated.stopLoss,
    takeProfits: calculated.takeProfits
  };
}
