import { UserSettings } from '../types';

export function estimatePotential(
  lotSize: number,
  entryPrice: number,
  targetPrice: number,
  contractSize: number
): number {
  const priceDiff = Math.abs(targetPrice - entryPrice);
  // Profit = LotSize * PriceDifference * ContractSize
  const potentialProfit = lotSize * priceDiff * contractSize;
  return Math.round(potentialProfit * 100) / 100; // round to 2 decimals
}

export function potentialProfitPercent(
    settings: UserSettings, 
    potentialProfit: number
): number {
    const accountBalance = settings.accountSize || settings.accountBalance || 0;
    if (accountBalance === 0) return 0;
    return (potentialProfit / accountBalance) * 100;
}
