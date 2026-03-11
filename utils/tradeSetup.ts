
import { formatLotSize, detectAssetConfig } from './positionSizing';
import { validateTrade } from './tradeValidator';
import type { SignalData, UserSettings } from '../types';
import { calculateLotSize } from './lotSizeCalculator';
import { estimatePotential } from './profitCalculator';

export function buildCompleteTradeSetup(
  signal: Omit<SignalData, 'id' | 'timestamp'>,
  settings: UserSettings,
  contractSize: number,
  pipValue: number,
  currentDailyLoss: number,
  todayTradeCount: number
): Omit<SignalData, 'id' | 'timestamp'> {
  
  const emptySetup = {
    ...signal,
    lotSize: 0,
    formattedLotSize: '0.00',
    riskAmount: 0,
    potentialProfit: [0, 0, 0],
    totalPotentialProfit: 0,
    partialCloseAmounts: [0, 0, 0],
    partialCloseSizes: ['0.00', '0.00', '0.00'],
    moveToBreakeven: false,
    isValid: false,
    validationMessage: '',
    assetCategory: 'unknown',
    contractSize: contractSize,
    pipValue: pipValue,
    riskRewardRatio: settings.riskRewardRatio || '1:3',
    calculatedRR: '1:0.00'
  };
  
  const validation = validateTrade(signal, settings, currentDailyLoss, todayTradeCount);
  
  if (!validation.isValid) {
    return {
      ...emptySetup,
      validationMessage: validation.reason || 'Invalid Trade'
    };
  }
  
  let entryPrice = 0;
  // Prioritize Sniper Limit Entry
  if (signal.entryType === 'Limit Order') {
      entryPrice = signal.entryPoints[0];
  } else {
      entryPrice = signal.entryPoints[1] || signal.entryPoints[0];
  }
  
  if (!entryPrice || entryPrice === 0) {
    return {
      ...emptySetup,
      validationMessage: 'Invalid entry price'
    };
  }
  
  if (!signal.stopLoss || signal.stopLoss === 0) {
    return {
      ...emptySetup,
      validationMessage: 'Invalid stop loss'
    };
  }
  
  const accountSize = settings.accountSize || settings.accountBalance || 0;
  const riskPercentage = settings.riskPerTrade || 1;
  
  const stopLossDistance = Math.abs(entryPrice - signal.stopLoss);
  const riskAmount = accountSize * (riskPercentage / 100);

  const lotSize = calculateLotSize(
    settings,
    stopLossDistance,
    contractSize
  );

  if (lotSize === 0) {
    return {
      ...emptySetup,
      validationMessage: 'Calculated lot size is zero or invalid.'
    };
  }
  
  // Default Partial Close settings if not provided
  const partialClose = settings.partialClose || {
    tp1Percent: 50,
    tp2Percent: 30,
    tp3Percent: 20,
    moveToBreakeven: true
  };
  
  const tp1Lots = (lotSize * partialClose.tp1Percent) / 100;
  const tp2Lots = (lotSize * partialClose.tp2Percent) / 100;
  const tp3Lots = (lotSize * partialClose.tp3Percent) / 100;
  
  const partialAmounts = [tp1Lots, tp2Lots, tp3Lots];
  
  const potentialProfit = signal.takeProfits.map((tp, index) => {
    if (tp === 0) return 0;
    
    return estimatePotential(
      partialAmounts[index],
      entryPrice,
      tp,
      contractSize
    );
  });
  
  const totalPotentialProfit = potentialProfit.reduce((sum, profit) => sum + profit, 0);
  
  let calculatedRR = '1:0.00';
  if (riskAmount > 0 && totalPotentialProfit > 0) {
      const ratio = totalPotentialProfit / riskAmount;
      calculatedRR = `1:${ratio.toFixed(2)}`;
  } else {
      // Fallback to requested ratio if calculation fails (e.g. invalid lots) but trade is valid
      calculatedRR = settings.riskRewardRatio || '1:3';
  }

  // Calculate Possible Pips if AI didn't provide it
  let possiblePips = signal.possiblePips || 0;
  if (possiblePips === 0 && entryPrice > 0 && signal.takeProfits[2] > 0 && pipValue > 0) {
      // Pips = PriceDiff / PipValue (roughly, depends on asset class but good enough for display)
      // Actually, for display "Possible Pips", we usually mean points or pips.
      // Let's use the standard formula: Distance / PipSize (which we don't have directly, but pipValue helps)
      // Wait, pipValue is $ value per pip per lot.
      // We just want the raw distance in pips.
      // Let's assume standard forex 0.0001 or 0.01 for JPY.
      // Since we don't have the exact pip size (0.0001 vs 0.01) readily available in a generic way without config,
      // we can try to infer or just use the raw price difference if it's an index, or normalize for FX.
      
      // Simpler approach: Use the raw price difference and let the user interpret, 
      // OR try to use the `detectAssetConfig` to get decimals.
      const config = detectAssetConfig(signal.asset);
      const diff = Math.abs(signal.takeProfits[2] - entryPrice);
      
      if (config.category === 'forex') {
          const pipSize = signal.asset.includes('JPY') ? 0.01 : 0.0001;
          possiblePips = Math.round(diff / pipSize);
      } else if (config.category === 'indices' || config.category === 'synthetics') {
          // For indices/synthetics, "pips" usually means points.
          possiblePips = Math.round(diff); // Points
      } else {
          possiblePips = Math.round(diff * 100) / 100; // Raw difference for others
      }
  }
  
  return {
    ...signal,
    lotSize: lotSize,
    formattedLotSize: formatLotSize(lotSize, signal.asset),
    riskAmount: riskAmount,
    potentialProfit,
    totalPotentialProfit,
    possiblePips,
    partialCloseAmounts: partialAmounts,
    partialCloseSizes: partialAmounts.map(lots => formatLotSize(lots, signal.asset)),
    moveToBreakeven: partialClose.moveToBreakeven,
    isValid: true,
    validationMessage: "Setup Optimal",
    assetCategory: detectAssetConfig(signal.asset).category,
    contractSize: contractSize,
    pipValue: pipValue,
    riskRewardRatio: settings.riskRewardRatio || '1:3', 
    calculatedRR
  };
}
