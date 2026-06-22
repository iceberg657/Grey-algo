
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
  const genericMinDist = baseEntry * 0.0015; // Increased generic fallback safety
  
  // Use a safer default for config minimums, ensuring enough breathing room
  let configMinDist = marketConfig ? marketConfig.minStopLoss * 1.5 : genericMinDist;
  
  // If ATR is available, use it to define a safe minimum distance (1.2x ATR for standard, 0.8x for scalping) -> Much wider than before
  if (atr && !isNaN(atr)) {
      const atrMultiplier = isScalping ? 0.8 : 1.5;
      configMinDist = Math.max(configMinDist, atr * atrMultiplier);
  }

  if (isScalping && !atr) {
      configMinDist = configMinDist * 0.6; // Not as tight
  }

  // ABSOLUTE FLOORS FOR VOLATILE ASSETS TO PREVENT TINY STOP LOSSES
  const upperAsset = asset.toUpperCase();
  if (upperAsset.includes('XAU') || upperAsset.includes('GOLD')) {
      configMinDist = Math.max(configMinDist, 2.0); // At least $2 move for Gold
  } else if (upperAsset.includes('BTC')) {
      configMinDist = Math.max(configMinDist, 150);
  } else if (upperAsset.includes('US30') || upperAsset.includes('DJI') || upperAsset.includes('NAS')) {
      configMinDist = Math.max(configMinDist, 20);
  } else if (upperAsset.includes('BOOM') || upperAsset.includes('CRASH')) {
      configMinDist = Math.max(configMinDist, 3.0);
  }
  
  let currentSlDist = Math.abs(baseEntry - stopLoss);


  // If SL is invalid, too close, or on wrong side, Recalculate
  // Increase strictness for when AI gives us a tiny stop loss
  const isSlValid = stopLoss > 0 && currentSlDist >= configMinDist;
  const isSlCorrectSide = signal === 'BUY' ? stopLoss < baseEntry : stopLoss > baseEntry;

  if (!isSlValid || !isSlCorrectSide) {
      // Create safer SL based on ATR-like logic or config minimum
      const bufferMultiplier = isScalping ? 1.5 : 2.0;
      
      // Give it breathing room, don't just snap to the bare minimum
      let buffer = Math.max(configMinDist, currentSlDist < configMinDist ? configMinDist * bufferMultiplier : currentSlDist * 1.1); 
      
      stopLoss = signal === 'BUY' ? baseEntry - buffer : baseEntry + buffer;
      currentSlDist = buffer;
  }

  // PRECISE ADJUSTMENT: If the AI provided a valid SL, we keep it as is (Precision).
  // If we had to recalculate, we use the buffer.
  // We no longer arbitrarily reduce the SL distance by 20% to keep it "Precise" to the technical level.
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

  // 4. Calculate Distinct Take Profits based on R:R
  const takeProfits: [number, number, number] = [0, 0, 0];
  const tpDistances: [number, number, number] = [0, 0, 0];
  
  const rUnit = currentSlDist; 
  // Restore institutional standard ratios: TP1 at 1.5x, TP2 at 2.5x, TP3 at 4x or user target
  const ratios = [1.5, 2.5, Math.max(4.0, targetRatio)]; 

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
