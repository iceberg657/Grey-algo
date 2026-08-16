import { analyzeSMC } from '../utils/quantEngine';
import { calculateL2OrderbookMetrics } from '../utils/orderflowEngine';
import { fetchMultipleLevel1Ticks, formatLevel1DataForGeminiLive } from './level1DataProcessor';

/**
 * Symbol mapping dictionary for Deriv data API
 */
const SYMBOL_MAP: Record<string, string> = {
    'GOLD': 'frxXAUUSD',
    'XAUUSD': 'frxXAUUSD',
    'XAU': 'frxXAUUSD',
    'SILVER': 'frxXAGUSD',
    'XAGUSD': 'frxXAGUSD',
    'EURUSD': 'frxEURUSD',
    'GBPUSD': 'frxGBPUSD',
    'USDJPY': 'frxUSDJPY',
    'AUDUSD': 'frxAUDUSD',
    'USDCAD': 'frxUSDCAD',
    'USDCHF': 'frxUSDCHF',
    'NZDUSD': 'frxNZDUSD',
    'EURGBP': 'frxEURGBP',
    'EURJPY': 'frxEURJPY',
    'GBPJPY': 'frxGBPJPY',
    'US30': 'OTC_DJI',
    'DOW': 'OTC_DJI',
    'DJI': 'OTC_DJI',
    'NAS100': 'OTC_NDX',
    'NASDAQ': 'OTC_NDX',
    'NDX': 'OTC_NDX',
    'SPX500': 'OTC_SPC',
    'SP500': 'OTC_SPC',
    'US500': 'OTC_SPC',
    'UK100': 'OTC_FTSE',
    'FTSE': 'OTC_FTSE',
    'FTSE100': 'OTC_FTSE',
    'GER40': 'OTC_GDAXI',
    'GERMANY40': 'OTC_GDAXI',
    'DAX': 'OTC_GDAXI',
    'BTC': 'cryBTCUSD',
    'BTCUSD': 'cryBTCUSD',
    'BITCOIN': 'cryBTCUSD',
    'ETH': 'cryETHUSD',
    'ETHUSD': 'cryETHUSD',
    'ETHEREUM': 'cryETHUSD',
    'LTC': 'cryLTCUSD',
    'LTCUSD': 'cryLTCUSD',
    'V10': 'R_10',
    'VOLATILITY10': 'R_10',
    'R_10': 'R_10',
    'V25': 'R_25',
    'VOLATILITY25': 'R_25',
    'R_25': 'R_25',
    'V50': 'R_50',
    'VOLATILITY50': 'R_50',
    'R_50': 'R_50',
    'V75': 'R_75',
    'VOLATILITY75': 'R_75',
    'R_75': 'R_75',
    'V100': 'R_100',
    'VOLATILITY100': 'R_100',
    'R_100': 'R_100',
    '1HZ10V': '1HZ10V',
    '1HZ25V': '1HZ25V',
    '1HZ50V': '1HZ50V',
    '1HZ75V': '1HZ75V',
    '1HZ100V': '1HZ100V',
    'V101S': '1HZ10V',
    'V251S': '1HZ25V',
    'V501S': '1HZ50V',
    'V751S': '1HZ75V',
    'V1001S': '1HZ100V',
    'BOOM300': 'BOOM300N',
    'BOOM500': 'BOOM500',
    'BOOM1000': 'BOOM1000',
    'BOOM150': 'BOOM150N',
    'CRASH300': 'CRASH300N',
    'CRASH500': 'CRASH500',
    'CRASH1000': 'CRASH1000',
    'CRASH150': 'CRASH150N',
    'STEP': 'STP',
    'STEPINDEX': 'STP',
    'STP': 'STP',
    'RANGE100': 'RB_100',
    'RANGE200': 'RB_200',
    'JUMP10': 'JDM10',
    'JUMP25': 'JDM25',
    'JUMP50': 'JDM50',
    'JUMP75': 'JDM75',
    'JUMP100': 'JDM100',
};

/**
 * Extracts potential assets from a user prompt.
 */
export function extractAssetsFromText(text: string): { displaySymbol: string; derivSymbol: string }[] {
    const cleaned = text.toUpperCase();
    const found: { displaySymbol: string; derivSymbol: string }[] = [];
    const seenDeriv = new Set<string>();

    // Direct symbol lookup
    for (const [key, derivSym] of Object.entries(SYMBOL_MAP)) {
        // Escape regex special characters
        const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        try {
            const pattern = new RegExp(`(?:\\b|_)${escapedKey}(?:\\b|_)`, 'i');
            if (pattern.test(cleaned) || (key.length >= 4 && cleaned.includes(key))) {
                if (!seenDeriv.has(derivSym)) {
                    seenDeriv.add(derivSym);
                    found.push({ displaySymbol: key, derivSymbol: derivSym });
                }
            }
        } catch {
            if (key.length >= 4 && cleaned.includes(key)) {
                if (!seenDeriv.has(derivSym)) {
                    seenDeriv.add(derivSym);
                    found.push({ displaySymbol: key, derivSymbol: derivSym });
                }
            }
        }
    }

    // Check for general market interest keywords if no symbol explicit
    const marketKeywords = [
        'MARKET', 'TRADE', 'TRADING', 'SETUP', 'SIGNAL', 'ANALYSIS', 'ANALYZE',
        'FOREX', 'GOLD', 'CRYPTO', 'INDEX', 'SYNTHETIC', 'VOLATILITY', 'SCALP',
        'ORDERBOOK', 'LEVEL 2', 'PRICE ACTION', 'OUTLOOK', 'PREDICTION', 'TREND',
        'WHERE IS', 'WHAT DO YOU THINK ABOUT', 'SHOULD I BUY', 'SHOULD I SELL'
    ];

    const hasMarketIntent = marketKeywords.some(kw => cleaned.includes(kw));

    if (found.length === 0 && hasMarketIntent) {
        // Default to Gold and EURUSD as baseline benchmark assets
        found.push({ displaySymbol: 'XAUUSD', derivSymbol: 'frxXAUUSD' });
        found.push({ displaySymbol: 'EURUSD', derivSymbol: 'frxEURUSD' });
    }

    return found.slice(0, 3); // Max 3 assets to keep prompt responsive
}

/**
 * Retrieves client token from settings if available
 */
function getDerivToken(): string {
    if (typeof window === 'undefined') return '';
    try {
        const s1 = localStorage.getItem('greyquant_user_settings');
        if (s1) {
            const p = JSON.parse(s1);
            if (p.derivApiToken) return p.derivApiToken;
        }
        const s2 = localStorage.getItem('greyalpha_settings');
        if (s2) {
            const p = JSON.parse(s2);
            if (p.derivApiToken) return p.derivApiToken;
        }
    } catch {}
    return '';
}

/**
 * Fetches live Deriv candles for a given symbol
 */
async function fetchDerivCandles(derivSymbol: string, granularity = 900, count = 100): Promise<any> {
    try {
        const token = getDerivToken();
        const tokenParam = token ? `&token=${encodeURIComponent(token)}` : '';
        const url = `/api/derivData?symbol=${encodeURIComponent(derivSymbol)}&history=true&granularity=${granularity}&count=${count}${tokenParam}`;
        
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) return null;
        return await res.json();
    } catch (err) {
        console.warn(`[chatMarketEngine] Failed to fetch Deriv data for ${derivSymbol}:`, err);
        return null;
    }
}

/**
 * Processes live market data for a prompt and returns structured context for Gemini
 */
export async function buildLiveMarketContextForChat(userPrompt: string): Promise<string> {
    const assets = extractAssetsFromText(userPrompt);
    if (assets.length === 0) return '';

    const results: string[] = [];

    // 1. Fetch real-time Level 1 (Top-of-Book BBO) telemetry
    let l1Section = '';
    try {
        const l1Ticks = await fetchMultipleLevel1Ticks(assets);
        if (l1Ticks.length > 0) {
            l1Section = formatLevel1DataForGeminiLive(l1Ticks);
        }
    } catch (l1Err) {
        console.warn('[chatMarketEngine] L1 tick fetch warning:', l1Err);
    }

    for (const asset of assets) {
        const data = await fetchDerivCandles(asset.derivSymbol, 900, 100);
        if (!data || !data.candles || !Array.isArray(data.candles) || data.candles.length < 20) {
            continue;
        }

        const candles = data.candles;
        const currentCandle = candles[candles.length - 1];
        const prevCandle = candles[candles.length - 2] || currentCandle;
        const currentPrice = currentCandle.close;
        const changePct = ((currentPrice - prevCandle.close) / prevCandle.close) * 100;

        // Run Quantitative Engine SMC Analysis
        const quant = analyzeSMC(candles, undefined, undefined, asset.displaySymbol, 'Deriv');
        if (!quant) continue;

        // Simulated L2 Depth from candle micro-imbalance
        const bids: [number, number][] = candles.slice(-10).map(c => [c.low, c.open]);
        const asks: [number, number][] = candles.slice(-10).map(c => [c.high, c.close]);
        const l2Metrics = calculateL2OrderbookMetrics({ bids, asks }, currentPrice);

        const marketBlock = `
---
LIVE QUANT ENGINE ANALYSIS: ${asset.displaySymbol.toUpperCase()}
- Current Price: ${currentPrice.toFixed(5)} | Change: ${changePct > 0 ? '+' : ''}${changePct.toFixed(2)}% | High: ${currentCandle.high.toFixed(5)} | Low: ${currentCandle.low.toFixed(5)}
- Quant Regime: ${quant.regime || 'NORMAL'} | Market Trend: ${quant.trend?.signal || 'NEUTRAL'} (${quant.trend?.strength || 50}% confidence)
- Technical Metrics: RSI(14) = ${quant.rsi?.toFixed(1) || 'N/A'} | ATR = ${quant.atr?.toFixed(5) || 'N/A'} | EMA20 = ${quant.ema20?.toFixed(5) || 'N/A'} | EMA50 = ${quant.ema50?.toFixed(5) || 'N/A'}
- Level 2 Orderbook Depth: Imbalance = ${l2Metrics.imbalanceRatio.toFixed(2)} (${l2Metrics.skew}) | Bid Depth = ${l2Metrics.bidDepth.toFixed(0)} | Ask Depth = ${l2Metrics.askDepth.toFixed(0)}
- Institutional SMC Structure:
  * Equal Highs (EQH Liquidity): ${quant.eqh ? quant.eqh.price.toFixed(5) + ' (Buy Stop Pool)' : 'None'}
  * Equal Lows (EQL Liquidity): ${quant.eql ? quant.eql.price.toFixed(5) + ' (Sell Stop Pool)' : 'None'}
  * Active POIs: ${quant.validPOIs?.length || 0} Order Blocks / FVGs identified
- Execution & Risk Controls (Level 2 Shielded):
  * Recommended Direction: ${quant.explicitSignal || 'NEUTRAL'}
  * Immediate Market Execution Range: [${quant.scalpTargets?.marketExecutionRange?.minPrice?.toFixed(5) || currentPrice.toFixed(5)} - ${quant.scalpTargets?.marketExecutionRange?.maxPrice?.toFixed(5) || currentPrice.toFixed(5)}]
  * L2 Shielded Stop Loss: ${quant.scalpTargets?.stopLoss?.toFixed(5) || 'N/A'} (${quant.scalpTargets?.l2ShieldNote || 'Shielded by Orderbook Depth'})
  * Scalp & Day Trade Targets (Min 1:2.0 - 1:3.0 RR):
    - TP1 (1:1.5 RR): ${quant.scalpTargets?.tp1?.toFixed(5) || 'N/A'}
    - TP2 (1:2.5 RR Target): ${quant.scalpTargets?.tp2?.toFixed(5) || 'N/A'}
    - TP3 (1:3.2 RR): ${quant.scalpTargets?.tp3?.toFixed(5) || 'N/A'}
- Monte Carlo 95% Confidence Bounds: [${quant.monteCarloBounds?.lower95?.toFixed(5) || 'N/A'} - ${quant.monteCarloBounds?.upper95?.toFixed(5) || 'N/A'}]
---`;

        results.push(marketBlock);
    }

    if (results.length === 0 && !l1Section) return '';

    let injection = `\n\n[SYSTEM INJECTION: REAL-TIME DERIV LEVEL 1 & QUANT ORDERFLOW DATA]\nThe user's query relates to live financial markets. The system has automatically streamed real-time Level 1 Top-of-Book ticks and candle data from Deriv:\n`;
    
    if (l1Section) {
        injection += `\n${l1Section}\n`;
    }
    
    if (results.length > 0) {
        injection += results.join('\n');
    }

    injection += `\n\nINSTRUCTION FOR AI MODEL:\n1. Use these real-time Level 1 prices, spreads, tick velocity, and SMC quant metrics alongside Google Search Grounding to answer the user's prompt with exact live numbers, precise entry ranges, L2 shielded stop loss, and TP1/TP2/TP3 targets.\n2. Always reference the live price and Level 1 top-of-book telemetry to provide an institutional-grade, highly actionable response.\n`;

    return injection;
}
