
import { calculatePnL, formatLotSize, detectAssetConfig } from './positionSizing';
import { validateTrade } from './tradeValidator';
import type { SignalData, UserSettings } from '../types';
import { calculateLotSize } from './lotSizeCalculator';

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
  
  const accountSize = settings.accountSize || settings.accountBalance;
  
  const stopLossPips = Math.abs(entryPrice - signal.stopLoss);
  const riskAmount = (accountSize * settings.riskPerTrade) / 100;

  const lotSize = calculateLotSize(
    accountSize,
    settings.riskPerTrade,
    stopLossPips,
    contractSize,
    pipValue
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
    
    return calculatePnL(
      partialAmounts[index],
      entryPrice,
      tp,
      signal.asset,
      signal.signal as 'BUY' | 'SELL'
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
  
  return {
    ...signal,
    lotSize: lotSize,
    formattedLotSize: formatLotSize(lotSize, signal.asset),
    riskAmount: riskAmount,
    potentialProfit,
    totalPotentialProfit,
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
