import { UserSettings } from '../types';

export function calculateLotSize(
    settings: UserSettings,
    stopLossDistance: number, // Price difference (Entry - SL)
    contractSize: number = 100000 // Default to standard lot if 0
): number {
    const accountBalance = settings.accountSize || settings.accountBalance || 0;
    
    // Standard Risk: I default to a strict 1% risk per trade based on your total account balance.
    const riskPercentage = settings.riskPerTrade || 1;
    
    if (stopLossDistance === 0 || contractSize === 0 || accountBalance === 0) {
        return 0;
    }

    // The Formula: Risk Amount = Account Balance * 0.01 (or user's risk percentage)
    const riskAmount = accountBalance * (riskPercentage / 100);
    
    // Lot Size = Risk Amount / (Stop Loss in Pips * Pip Value per Standard Lot)
    // Note: stopLossDistance * contractSize is mathematically equivalent to (Stop Loss in Pips * Pip Value per Standard Lot)
    const lotSize = riskAmount / (stopLossDistance * contractSize);

    // Round to 2 decimal places (0.01 lots)
    return Math.max(0, Math.round(lotSize * 100) / 100);
}
