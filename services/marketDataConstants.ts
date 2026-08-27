import type { MarketDataItem } from '../types';

export const DERIV_APP_ID = 1089;

export const DERIV_DASHBOARD_SYMBOLS: Record<string, string> = {
    // Indices
    'US30': 'OTC_DJI',
    'NAS100': 'OTC_NDX',
    'GER40': 'OTC_GDAXI',
    'UK100': 'OTC_FTSE',
    'SPX500': 'OTC_SPC',

    // Deriv Synthetics
    'BOOM 1000': 'BOOM1000',
    'CRASH 1000': 'CRASH1000',
    'BOOM 500': 'BOOM500',
    'CRASH 500': 'CRASH500',
    'VOLATILITY 75 (1s)': '1HZ75V',
    'STEP INDEX': 'STP',
    'VOLATILITY 75': 'R_75',
    'VOLATILITY 100': 'R_100',

    // Forex Majors & Crosses
    'EUR/USD': 'frxEURUSD',
    'GBP/USD': 'frxGBPUSD',
    'USD/JPY': 'frxUSDJPY',
    'GBP/JPY': 'frxGBPJPY',
    'AUD/USD': 'frxAUDUSD',
    'USD/CAD': 'frxUSDCAD',
    'USD/CHF': 'frxUSDCHF',
    'EUR/GBP': 'frxEURGBP',
    'EUR/JPY': 'frxEURJPY',
    'EUR/AUD': 'frxEURAUD',
    'EUR/CAD': 'frxEURCAD',
    'GBP/NZD': 'frxGBPNZD',
    'GBP/CAD': 'frxGBPCAD',
    'NZD/JPY': 'frxNZDJPY',

    // Metals & Commodities
    'XAU/USD': 'frxXAUUSD',
    'XAG/USD': 'frxXAGUSD',

    // Crypto
    'BTC/USD': 'cryBTCUSD',
    'ETH/USD': 'cryETHUSD'
};

export const ACCURATE_MARKET_FALLBACKS: Record<string, Omit<MarketDataItem, 'symbol'>> = {
    // Indices
    'US30': { price: 43850.20, change: 152.40, changePercent: 0.35, timestamp: Date.now() },
    'NAS100': { price: 21420.50, change: 110.80, changePercent: 0.52, timestamp: Date.now() },
    'GER40': { price: 19480.00, change: 54.20, changePercent: 0.28, timestamp: Date.now() },
    'UK100': { price: 8320.10, change: -12.50, changePercent: -0.15, timestamp: Date.now() },
    'SPX500': { price: 5980.40, change: 24.60, changePercent: 0.41, timestamp: Date.now() },

    // Synthetics
    'BOOM 1000': { price: 10420.80, change: 67.30, changePercent: 0.65, timestamp: Date.now() },
    'CRASH 1000': { price: 8940.30, change: -73.90, changePercent: -0.82, timestamp: Date.now() },
    'BOOM 500': { price: 5120.40, change: 23.10, changePercent: 0.45, timestamp: Date.now() },
    'CRASH 500': { price: 4780.90, change: -28.70, changePercent: -0.60, timestamp: Date.now() },
    'VOLATILITY 75 (1s)': { price: 345820.00, change: 3940.00, changePercent: 1.15, timestamp: Date.now() },
    'STEP INDEX': { price: 8930.50, change: 17.80, changePercent: 0.20, timestamp: Date.now() },
    'VOLATILITY 75': { price: 984500.00, change: 7850.00, changePercent: 0.80, timestamp: Date.now() },
    'VOLATILITY 100': { price: 1240.50, change: 14.20, changePercent: 1.15, timestamp: Date.now() },

    // Forex
    'EUR/USD': { price: 1.0542, change: 0.0013, changePercent: 0.12, timestamp: Date.now() },
    'GBP/USD': { price: 1.2645, change: 0.0023, changePercent: 0.18, timestamp: Date.now() },
    'USD/JPY': { price: 154.60, change: -0.34, changePercent: -0.22, timestamp: Date.now() },
    'GBP/JPY': { price: 195.40, change: 0.60, changePercent: 0.31, timestamp: Date.now() },
    'AUD/USD': { price: 0.6520, change: 0.0005, changePercent: 0.08, timestamp: Date.now() },
    'USD/CAD': { price: 1.4080, change: -0.0007, changePercent: -0.05, timestamp: Date.now() },
    'USD/CHF': { price: 0.8870, change: 0.0004, changePercent: 0.04, timestamp: Date.now() },
    'EUR/GBP': { price: 0.8335, change: -0.0005, changePercent: -0.06, timestamp: Date.now() },
    'EUR/JPY': { price: 163.02, change: -0.16, changePercent: -0.10, timestamp: Date.now() },

    // Metals & Crypto
    'XAU/USD': { price: 2895.40, change: 21.30, changePercent: 0.74, timestamp: Date.now() },
    'XAG/USD': { price: 32.40, change: 0.45, changePercent: 1.41, timestamp: Date.now() },
    'BTC/USD': { price: 88450.00, change: 1610.00, changePercent: 1.85, timestamp: Date.now() },
    'ETH/USD': { price: 2680.50, change: 37.10, changePercent: 1.40, timestamp: Date.now() }
};

/**
 * Normalizes symbols for consistent matching (e.g., 'EUR/USD' <-> 'EURUSD')
 */
export function normalizeSymbolKey(sym: string): string {
    if (!sym) return '';
    return sym.toUpperCase().replace('/', '').replace('-', '').replace(' ', '').replace('FRX', '').replace('CRY', '');
}

/**
 * Finds asset price in a market data array matching by normalized symbol
 */
export function findAssetPrice(data: MarketDataItem[], symbol: string): MarketDataItem | undefined {
    if (!data || data.length === 0) return undefined;
    const target = normalizeSymbolKey(symbol);
    return data.find(d => normalizeSymbolKey(d.symbol) === target || d.symbol === symbol);
}
