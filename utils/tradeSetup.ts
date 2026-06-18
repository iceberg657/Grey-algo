
import { formatLotSize, detectAssetConfig, calculatePositionSize } from './positionSizing';
import { validateTrade } from './tradeValidator';
import type { SignalData, UserSettings } from '../types';
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
  
  // Apply manual TP shifting option if enabled
  let updatedTakeProfits = [...signal.takeProfits];
  let recommendedPositions = signal.recommendedPositions || 2;
  
  if (settings.tpMappingMode === 'PipsToTP1Shift' && signal.signal !== 'NEUTRAL') {
      const config = detectAssetConfig(signal.asset);
      let pipSize = 1;
      if (config.category === 'forex') {
          pipSize = signal.asset.toUpperCase().includes('JPY') ? 0.01 : 0.0001;
      } else if (config.category === 'metals') {
          pipSize = 0.1;
      } else {
          pipSize = 1;
      }
      
      const rawPips = signal.possiblePips || 20;
      const pipsOffset = rawPips * pipSize;
      
      let calculatedTP1 = entryPrice;
      if (signal.signal === 'BUY') {
          calculatedTP1 = entryPrice + pipsOffset;
      } else if (signal.signal === 'SELL') {
          calculatedTP1 = entryPrice - pipsOffset;
      }
      
      const decimals = config.decimals || 5;
      calculatedTP1 = Math.round(calculatedTP1 * Math.pow(10, decimals)) / Math.pow(10, decimals);
      
      const originalTP1 = signal.takeProfits[0] || 0;
      const originalTP2 = signal.takeProfits[1] || 0;
      
      updatedTakeProfits = [
          calculatedTP1,
          originalTP1,
          originalTP2
      ];
      recommendedPositions = 3;
  }

  const updatedSignal = {
      ...signal,
      takeProfits: updatedTakeProfits,
      recommendedPositions
  };
  
  const accountSize = settings.accountSize || settings.accountBalance || 0;
  const riskPercentage = settings.riskPerTrade || 1;
  const stopLossDistance = Math.abs(entryPrice - updatedSignal.stopLoss);
  
  const { lotSize, riskAmount, contractSize: actualContractSize } = calculatePositionSize(
      accountSize,
      riskPercentage,
      entryPrice,
      updatedSignal.stopLoss,
      updatedSignal.asset
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
  
  const potentialProfit = updatedSignal.takeProfits.map((tp, index) => {
    if (tp === 0) return 0;
    
    return estimatePotential(
      partialAmounts[index],
      entryPrice,
      tp,
      actualContractSize
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

  // Always calculate Possible Pips dynamically to ensure accurate presentation
  let possiblePips = 0;
  if (entryPrice > 0 && updatedSignal.takeProfits[2] > 0) {
      const config = detectAssetConfig(updatedSignal.asset);
      const diff = Math.abs(updatedSignal.takeProfits[2] - entryPrice);
      
      if (config.category === 'forex') {
          const pipSize = updatedSignal.asset.includes('JPY') ? 0.01 : 0.0001;
          possiblePips = Math.round(diff / pipSize);
      } else if (config.category === 'indices' || config.category === 'synthetics') {
          possiblePips = diff; 
      } else {
          possiblePips = Math.round(diff * 100) / 100;
      }
  }
  
  // Calculate position splitting
  const positionLotSizeRaw = lotSize / recommendedPositions;
  const positionLotSize = formatLotSize(positionLotSizeRaw, updatedSignal.asset);

  return {
    ...updatedSignal,
    lotSize: lotSize,
    formattedLotSize: formatLotSize(lotSize, updatedSignal.asset),
    riskAmount: riskAmount,
    potentialProfit,
    totalPotentialProfit,
    possiblePips,
    recommendedPositions,
    positionLotSize,
    partialCloseAmounts: partialAmounts,
    partialCloseSizes: partialAmounts.map(lots => formatLotSize(lots, updatedSignal.asset)),
    moveToBreakeven: partialClose.moveToBreakeven,
    isValid: true,
    validationMessage: "Setup Optimal",
    assetCategory: detectAssetConfig(updatedSignal.asset).category,
    contractSize: contractSize,
    pipValue: pipValue,
    riskRewardRatio: settings.riskRewardRatio || '1:3', 
    calculatedRR
  };
}
