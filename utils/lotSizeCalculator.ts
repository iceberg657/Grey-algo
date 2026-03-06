import { UserSettings } from '../types';

export function calculateLotSize(
    settings: UserSettings,
    stopLossDistance: number, // Price difference (Entry - SL)
    contractSize: number = 100000 // Default to standard lot if 0
): number {
    const accountBalance = settings.accountSize || settings.accountBalance;
    const riskPercentage = settings.riskPerTrade;
    
    if (stopLossDistance === 0 || contractSize === 0) {
        return 0;
    }

    const riskAmount = (accountBalance * riskPercentage) / 100;
    
    // lotSize = Risk / (PriceDiff * ContractSize)
    // Example: Risk $100, Diff 0.01, Contract 100,000
    // lotSize = 100 / (0.01 * 100,000) = 100 / 1000 = 0.1
    
    const lotSize = riskAmount / (stopLossDistance * contractSize);

    // Round to 2 decimal places (0.01 lots)
    return Math.max(0, Math.round(lotSize * 100) / 100);
}
