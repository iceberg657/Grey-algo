
import { MARKET_CONFIGS } from './marketConfigs';
import type { SignalData, UserSettings } from '../types';

interface ValidationResult {
  isValid: boolean;
  reason?: string;
}

export function validateTrade(
  signal: Omit<SignalData, 'id' | 'timestamp'>,
  settings: UserSettings,
  currentDailyLoss: number,
  todayTradeCount: number
): ValidationResult {
  
  if (settings.allowedMarkets && settings.allowedMarkets.length > 0) {
      const isAllowed = settings.allowedMarkets.some(m => signal.asset.toUpperCase().includes(m));
      if (!isAllowed) {
        // Soft fail or implement strict checking if required
      }
  }
  
  const maxDailyLoss = settings.maxDailyLoss || 0;
  const accountSize = settings.accountSize || settings.accountBalance;

  // Note: settings uses 'maxDailyLoss' (percent) and 'accountSize'
  if (maxDailyLoss > 0 && accountSize > 0) {
      const dailyLossPercent = (Math.abs(currentDailyLoss) / accountSize) * 100;
      if (dailyLossPercent >= maxDailyLoss) {
        return {
          isValid: false,
          reason: `Daily loss limit reached`
        };
      }
  }
  
  const maxTradesPerDay = settings.maxTradesPerDay || 0;
  if (maxTradesPerDay > 0 && todayTradeCount >= maxTradesPerDay) {
    return {
      isValid: false,
      reason: `Max trades per day reached`
    };
  }
  
  if (settings.tradingSession?.enabled) {
    const now = new Date();
    const currentHour = now.getUTCHours();
    
    if (currentHour < settings.tradingSession.startHour || 
        currentHour >= settings.tradingSession.endHour) {
      return {
        isValid: false,
        reason: `Outside trading hours`
      };
    }
  }
  
  const assetKey = Object.keys(MARKET_CONFIGS).find(k => signal.asset.toUpperCase().includes(k));
  const marketConfig = assetKey ? MARKET_CONFIGS[assetKey] : null;

  if (marketConfig) {
    const entryPrice = signal.entryPoints[0];
    const slDistance = Math.abs(entryPrice - signal.stopLoss);
    
    if (slDistance < marketConfig.minStopLoss) {
      return {
        isValid: false,
        reason: `Stop loss too tight`
      };
    }
  }
  
  if (signal.confidence < 60) {
    return {
      isValid: false,
      reason: `Confidence too low`
    };
  }
  
  if (signal.signal === 'NEUTRAL') {
    return {
      isValid: false,
      reason: 'Signal is NEUTRAL'
    };
  }
  
  return { isValid: true };
}
