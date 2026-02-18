
interface AssetConfig {
    contractSize: number;
    pipValue: number; // Value of 1 pip/point for 1 standard lot/contract
    decimals: number;
    category: 'forex' | 'indices' | 'crypto' | 'metals' | 'synthetics';
}

export function detectAssetConfig(asset: string): AssetConfig {
    const symbol = asset.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // Synthetics (Deriv)
    if (symbol.includes('BOOM') || symbol.includes('CRASH')) {
        return { contractSize: 1, pipValue: 1, decimals: 2, category: 'synthetics' }; // 1 Lot = $1 per point usually
    }
    if (symbol.startsWith('V') && (symbol.includes('75') || symbol.includes('100') || symbol.includes('50') || symbol.includes('25') || symbol.includes('10'))) {
         return { contractSize: 1, pipValue: 1, decimals: 2, category: 'synthetics' };
    }

    if (symbol.includes('XAU') || symbol.includes('GOLD')) {
        return { contractSize: 100, pipValue: 1, decimals: 2, category: 'metals' }; // 1 lot = 100oz
    }
    if (symbol.includes('BTC')) {
        return { contractSize: 1, pipValue: 1, decimals: 2, category: 'crypto' }; // 1 lot = 1 BTC
    }
    if (symbol.includes('ETH')) {
        return { contractSize: 1, pipValue: 1, decimals: 2, category: 'crypto' };
    }
    if (['US30', 'DJI', 'WS30'].some(s => symbol.includes(s))) {
        return { contractSize: 1, pipValue: 1, decimals: 1, category: 'indices' }; // Standard CFD often 1 point = $1
    }
    if (['NAS100', 'NDX', 'USTECH'].some(s => symbol.includes(s))) {
        return { contractSize: 1, pipValue: 1, decimals: 1, category: 'indices' };
    }
    if (symbol.includes('JPY')) {
        return { contractSize: 100000, pipValue: 0.01, decimals: 3, category: 'forex' }; // Standard lot
    }
    
    // Default Forex (EURUSD etc)
    return { contractSize: 100000, pipValue: 0.0001, decimals: 5, category: 'forex' };
}

export function calculatePositionSize(
    accountSize: number,
    riskPercentage: number,
    entryPrice: number,
    stopLoss: number,
    asset: string
): { lotSize: number, riskAmount: number, contractSize: number, isValid: boolean, errorMessage?: string } {
    
    if (accountSize <= 0 || riskPercentage <= 0) {
        return { lotSize: 0, riskAmount: 0, contractSize: 0, isValid: false, errorMessage: "Invalid account or risk parameters" };
    }

    const config = detectAssetConfig(asset);
    const riskAmount = accountSize * (riskPercentage / 100);
    const priceDifference = Math.abs(entryPrice - stopLoss);

    // Safety: Prevent division by zero or extremely small numbers that blow up calculation
    if (priceDifference < 0.0000001) {
        return { lotSize: 0, riskAmount, contractSize: config.contractSize, isValid: false, errorMessage: "Invalid Stop Loss (Too close to Entry)" };
    }

    // Standard Formula: Lots = Risk / (Distance * ContractSize)
    let rawLots = riskAmount / (priceDifference * config.contractSize);
    
    // Safety caps based on category
    if (config.category === 'crypto' && rawLots < 0.001) rawLots = 0.001;
    else if (rawLots < 0.01) rawLots = 0.01;
    
    if (rawLots > 1000) rawLots = 1000; // Cap for safety against bad data

    return {
        lotSize: rawLots,
        riskAmount,
        contractSize: config.contractSize,
        isValid: true
    };
}

export function calculatePnL(
    lots: number,
    entryPrice: number,
    exitPrice: number,
    asset: string,
    direction: 'BUY' | 'SELL'
): number {
    const config = detectAssetConfig(asset);
    const diff = direction === 'BUY' ? (exitPrice - entryPrice) : (entryPrice - exitPrice);
    return diff * lots * config.contractSize;
}

export function formatLotSize(lots: number, asset: string): string {
    const config = detectAssetConfig(asset);
    if (config.category === 'crypto') return lots.toFixed(3);
    if (config.category === 'indices' || config.category === 'synthetics') return lots.toFixed(2);
    return lots.toFixed(2);
}
