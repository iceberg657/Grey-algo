
interface AssetConfig {
    contractSize: number;
    pipValue: number; // Value of 1 pip/point for 1 standard lot/contract
    decimals: number;
    category: 'forex' | 'indices' | 'crypto' | 'metals' | 'synthetics';
    minLot?: number;
}

export function detectAssetConfig(asset: string): AssetConfig {
    const symbol = asset.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // --- DERIV SYNTHETICS ---
    if (symbol.includes('BOOM') || symbol.includes('CRASH')) {
        return { contractSize: 1, pipValue: 1, decimals: 2, category: 'synthetics', minLot: 0.2 }; 
    }
    if (symbol.includes('STEP')) {
        return { contractSize: 10, pipValue: 10, decimals: 1, category: 'synthetics', minLot: 0.1 }; // Step Index moves in 0.1
    }
    if (symbol.includes('RANGE')) {
        return { contractSize: 1, pipValue: 1, decimals: 2, category: 'synthetics', minLot: 0.01 };
    }
    if (symbol.includes('JUMP')) {
        return { contractSize: 1, pipValue: 1, decimals: 2, category: 'synthetics', minLot: 0.01 };
    }
    
    // Volatility Indices
    if (symbol.startsWith('V') || symbol.startsWith('VOL')) {
        if (symbol.includes('75')) return { contractSize: 1, pipValue: 1, decimals: 2, category: 'synthetics', minLot: 0.001 };
        return { contractSize: 1, pipValue: 1, decimals: 2, category: 'synthetics', minLot: 0.5 };
    }

    // --- STANDARD MARKETS ---
    if (symbol.includes('XAU') || symbol.includes('GOLD')) {
        return { contractSize: 100, pipValue: 1, decimals: 2, category: 'metals' }; 
    }
    if (symbol.includes('BTC')) {
        return { contractSize: 1, pipValue: 1, decimals: 2, category: 'crypto' }; 
    }
    if (symbol.includes('ETH')) {
        return { contractSize: 1, pipValue: 1, decimals: 2, category: 'crypto' };
    }
    if (['US30', 'DJI', 'WS30'].some(s => symbol.includes(s))) {
        return { contractSize: 1, pipValue: 1, decimals: 1, category: 'indices' }; 
    }
    if (['NAS100', 'NDX', 'USTECH'].some(s => symbol.includes(s))) {
        return { contractSize: 1, pipValue: 1, decimals: 1, category: 'indices' };
    }
    if (symbol.includes('JPY')) {
        return { contractSize: 100000, pipValue: 0.01, decimals: 3, category: 'forex' }; 
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

    if (priceDifference < 0.0000001) {
        return { lotSize: 0, riskAmount, contractSize: config.contractSize, isValid: false, errorMessage: "Invalid Stop Loss" };
    }

    // Standard Formula: Lots = Risk / (Distance * ContractSize)
    let rawLots = riskAmount / (priceDifference * config.contractSize);
    
    // Min Lot Enforcement
    const minLot = config.minLot || 0.01;
    if (rawLots < minLot) rawLots = minLot;
    
    if (rawLots > 1000) rawLots = 1000; 

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
    if (config.category === 'crypto' || config.category === 'synthetics') {
        if(config.minLot && config.minLot < 0.01) return lots.toFixed(3);
    }
    return lots.toFixed(2);
}
