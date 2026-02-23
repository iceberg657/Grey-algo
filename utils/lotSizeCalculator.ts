export function calculateLotSize(
    accountBalance: number,
    riskPerTradePercent: number,
    stopLossPips: number,
    contractSize: number,
    pipValue: number
): number {
    if (stopLossPips === 0 || contractSize === 0 || pipValue === 0) {
        return 0;
    }

    const riskAmount = (accountBalance * riskPerTradePercent) / 100;
    const riskPerPip = riskAmount / stopLossPips;
    const lotSize = riskPerPip / pipValue;

    // Round to a reasonable precision for lot sizes (e.g., 2 decimal places for standard lots)
    return parseFloat(lotSize.toFixed(2));
}
