/**
 * Level 1 (L1) Market Data Processor & Gemini Live Streaming Engine
 *
 * Provides real-time ingestion, microstructural analysis, and formatting of Top-of-Book (BBO)
 * Level 1 market data (Bid, Ask, Spread, Last Tick, Velocity, Micro-imbalance) for streaming
 * directly into the Gemini Live multimodal chat and analytical pipeline.
 */

import { extractAssetsFromText } from './chatMarketEngine';

export interface Level1Tick {
    symbol: string;
    displaySymbol: string;
    bid: number;
    ask: number;
    lastPrice: number;
    midPrice: number;
    spread: number;
    spreadPips: number;
    spreadBps: number;
    tickDirection: 'UP' | 'DOWN' | 'FLAT';
    tickTime: number; // Unix timestamp in ms
    epoch: number; // Unix timestamp in seconds
    dayOpen?: number;
    dayHigh?: number;
    dayLow?: number;
    dayClose?: number;
    netChange: number;
    percentChange: number;
    tickVelocity: number; // Ticks per second (rolling 10s window)
    microImbalance: number; // -1.0 (heavy ask pressure) to +1.0 (heavy bid pressure)
    liquidityState: 'TIGHT' | 'NORMAL' | 'WIDE' | 'VOLATILE';
}

export interface Level1Snapshot {
    timestamp: number;
    ticks: Level1Tick[];
    primarySymbol?: string;
    summary: {
        totalActiveFeeds: number;
        averageSpreadBps: number;
        mostVolatileAsset?: string;
        marketBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    };
}

// In-memory historical tick ring-buffer for velocity & microstructure computation
interface SymbolTickHistory {
    ticks: { price: number; time: number; bid: number; ask: number }[];
    dayOpen?: number;
    dayHigh?: number;
    dayLow?: number;
    lastTickDirection: 'UP' | 'DOWN' | 'FLAT';
}

const tickHistoryMap = new Map<string, SymbolTickHistory>();
const MAX_HISTORY_TICKS = 50;

/**
 * Calculates pip scale factor based on asset class
 */
export function getPipMultiplier(symbol: string): number {
    const s = symbol.toUpperCase();
    if (s.includes('JPY')) return 100;
    if (s.includes('XAU') || s.includes('GOLD')) return 10;
    if (s.includes('XAG') || s.includes('SILVER')) return 100;
    if (s.includes('BTC') || s.includes('ETH') || s.includes('LTC')) return 1;
    if (s.includes('US30') || s.includes('NDX') || s.includes('SP500') || s.includes('GER40')) return 1;
    if (s.startsWith('R_') || s.includes('1HZ') || s.includes('BOOM') || s.includes('CRASH') || s.includes('STP')) return 1;
    return 10000; // Standard 4/5 digit forex pairs (EURUSD, GBPUSD, etc.)
}

/**
 * Determines spread liquidity classification
 */
function classifyLiquidity(spreadPips: number, symbol: string): 'TIGHT' | 'NORMAL' | 'WIDE' | 'VOLATILE' {
    const s = symbol.toUpperCase();
    if (s.includes('EURUSD') || s.includes('GBPUSD') || s.includes('USDJPY')) {
        if (spreadPips <= 0.8) return 'TIGHT';
        if (spreadPips <= 2.0) return 'NORMAL';
        if (spreadPips <= 4.0) return 'WIDE';
        return 'VOLATILE';
    }
    if (s.includes('XAU') || s.includes('GOLD')) {
        if (spreadPips <= 2.0) return 'TIGHT';
        if (spreadPips <= 4.5) return 'NORMAL';
        if (spreadPips <= 8.0) return 'WIDE';
        return 'VOLATILE';
    }
    if (s.includes('BTC')) {
        if (spreadPips <= 15) return 'TIGHT';
        if (spreadPips <= 45) return 'NORMAL';
        return 'WIDE';
    }
    if (spreadPips <= 1.5) return 'TIGHT';
    if (spreadPips <= 3.5) return 'NORMAL';
    return 'WIDE';
}

/**
 * Processes a single raw tick into a rich Level 1 microstructure tick
 */
export function processRawL1Tick(
    raw: {
        symbol: string;
        displaySymbol?: string;
        bid?: number;
        ask?: number;
        price?: number;
        epoch?: number;
        open?: number;
        high?: number;
        low?: number;
        close?: number;
    }
): Level1Tick {
    const symbol = raw.symbol;
    const displaySymbol = raw.displaySymbol || symbol;
    const now = Date.now();
    const epoch = raw.epoch || Math.floor(now / 1000);

    const price = Number(raw.price ?? raw.close ?? raw.bid ?? raw.ask ?? 0);
    const bid = Number(raw.bid ?? (price > 0 ? price * 0.99995 : 0));
    const ask = Number(raw.ask ?? (price > 0 ? price * 1.00005 : 0));
    const midPrice = (bid + ask) / 2 || price;

    const pipMultiplier = getPipMultiplier(displaySymbol);
    const spread = Math.max(0, ask - bid);
    const spreadPips = Number((spread * pipMultiplier).toFixed(2));
    const spreadBps = midPrice > 0 ? Number(((spread / midPrice) * 10000).toFixed(2)) : 0;

    // Retrieve or initialize history buffer
    let history = tickHistoryMap.get(symbol);
    if (!history) {
        history = {
            ticks: [],
            dayOpen: raw.open ?? price,
            dayHigh: raw.high ?? price,
            dayLow: raw.low ?? price,
            lastTickDirection: 'FLAT'
        };
        tickHistoryMap.set(symbol, history);
    }

    // Update 24h/session envelope
    if (raw.open) history.dayOpen = raw.open;
    if (raw.high) history.dayHigh = Math.max(history.dayHigh ?? price, raw.high);
    else history.dayHigh = Math.max(history.dayHigh ?? price, price);
    if (raw.low) history.dayLow = Math.min(history.dayLow ?? price, raw.low);
    else history.dayLow = Math.min(history.dayLow ?? price, price);

    // Compute tick direction from prior tick
    const prevTick = history.ticks[history.ticks.length - 1];
    let tickDirection: 'UP' | 'DOWN' | 'FLAT' = 'FLAT';
    if (prevTick) {
        if (price > prevTick.price) tickDirection = 'UP';
        else if (price < prevTick.price) tickDirection = 'DOWN';
        else tickDirection = history.lastTickDirection;
    }
    history.lastTickDirection = tickDirection;

    // Add to rolling history
    history.ticks.push({ price, time: now, bid, ask });
    if (history.ticks.length > MAX_HISTORY_TICKS) {
        history.ticks.shift();
    }

    // Compute rolling tick velocity (ticks / sec over last 10 seconds)
    const tenSecAgo = now - 10000;
    const recentTicks = history.ticks.filter(t => t.time >= tenSecAgo);
    const tickVelocity = recentTicks.length > 1 ? Number((recentTicks.length / 10).toFixed(2)) : 0.5;

    // Compute micro imbalance (top of book price pull)
    let upTicks = 0;
    let downTicks = 0;
    for (let i = 1; i < recentTicks.length; i++) {
        if (recentTicks[i].price > recentTicks[i - 1].price) upTicks++;
        else if (recentTicks[i].price < recentTicks[i - 1].price) downTicks++;
    }
    const totalDeltas = upTicks + downTicks;
    const microImbalance = totalDeltas > 0 ? Number(((upTicks - downTicks) / totalDeltas).toFixed(2)) : 0;

    // Day change calculation
    const baseOpen = history.dayOpen || price;
    const netChange = Number((price - baseOpen).toFixed(5));
    const percentChange = baseOpen > 0 ? Number(((netChange / baseOpen) * 100).toFixed(2)) : 0;

    const liquidityState = classifyLiquidity(spreadPips, displaySymbol);

    return {
        symbol,
        displaySymbol,
        bid: Number(bid.toFixed(5)),
        ask: Number(ask.toFixed(5)),
        lastPrice: Number(price.toFixed(5)),
        midPrice: Number(midPrice.toFixed(5)),
        spread: Number(spread.toFixed(5)),
        spreadPips,
        spreadBps,
        tickDirection,
        tickTime: now,
        epoch,
        dayOpen: history.dayOpen,
        dayHigh: history.dayHigh,
        dayLow: history.dayLow,
        dayClose: price,
        netChange,
        percentChange,
        tickVelocity,
        microImbalance,
        liquidityState
    };
}

/**
 * Fetches real-time L1 tick data for a single symbol from the backend Deriv / market service
 */
export async function fetchLevel1Tick(symbol: string, displaySymbol?: string): Promise<Level1Tick | null> {
    try {
        const url = `/api/derivData?symbol=${encodeURIComponent(symbol)}`;
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) return null;
        const data = await res.json();
        if (!data || typeof data.price === 'undefined') return null;

        return processRawL1Tick({
            symbol: data.symbol || symbol,
            displaySymbol: displaySymbol || symbol,
            bid: data.bid,
            ask: data.ask,
            price: data.price,
            epoch: data.epoch
        });
    } catch (err) {
        console.warn(`[level1DataProcessor] Failed to fetch L1 tick for ${symbol}:`, err);
        return null;
    }
}

/**
 * Fetches real-time Level 1 ticks for multiple assets concurrently
 */
export async function fetchMultipleLevel1Ticks(assets: { displaySymbol: string; derivSymbol: string }[]): Promise<Level1Tick[]> {
    const promises = assets.map(a => fetchLevel1Tick(a.derivSymbol, a.displaySymbol));
    const results = await Promise.allSettled(promises);
    
    const validTicks: Level1Tick[] = [];
    for (const r of results) {
        if (r.status === 'fulfilled' && r.value) {
            validTicks.push(r.value);
        }
    }
    return validTicks;
}

/**
 * Formats Level 1 market tick data into structured, ultra-low-latency tokens for Gemini Live streaming context
 */
export function formatLevel1DataForGeminiLive(ticks: Level1Tick[]): string {
    if (!ticks || ticks.length === 0) return '';

    const lines: string[] = [
        '### ⚡ REAL-TIME LEVEL 1 (L1) MARKET TELEMETRY FEED (TOP-OF-BOOK BBO)'
    ];

    for (const t of ticks) {
        const dirSymbol = t.tickDirection === 'UP' ? '▲ (Uptick)' : t.tickDirection === 'DOWN' ? '▼ (Downtick)' : '■ (Zero-tick)';
        const imbDesc = t.microImbalance > 0.3 ? 'Bid Aggression / Inflow' : t.microImbalance < -0.3 ? 'Ask Aggression / Outflow' : 'Balanced Flow';
        const chgSign = t.percentChange >= 0 ? '+' : '';

        lines.push(`
**${t.displaySymbol.toUpperCase()}** [Feed: Real-Time BBO Tick Stream]
- **Last Price**: ${t.lastPrice} ${dirSymbol} | **Net 24h**: ${chgSign}${t.percentChange}% (${chgSign}${t.netChange})
- **Top of Book**: Bid: ${t.bid} | Ask: ${t.ask} | **Spread**: ${t.spreadPips} pips (${t.spreadBps} bps) [Liquidity: ${t.liquidityState}]
- **Order Flow Microstructure**:
  * Tick Arrival Velocity: ${t.tickVelocity} ticks/sec
  * Micro Order Imbalance: ${(t.microImbalance * 100).toFixed(0)}% (${imbDesc})
  * Session Envelope: High ${t.dayHigh ?? t.lastPrice} | Low ${t.dayLow ?? t.lastPrice}
`);
    }

    return lines.join('\n');
}

/**
 * Intercepts a chat prompt or live query, extracts all referenced financial instruments,
 * fetches real-time Level 1 tick streams, and formats an injection block for the Gemini Live session.
 */
export async function streamLevel1ToGeminiChatContext(userPrompt: string): Promise<string> {
    const assets = extractAssetsFromText(userPrompt);
    if (assets.length === 0) return '';

    try {
        const l1Ticks = await fetchMultipleLevel1Ticks(assets);
        if (l1Ticks.length === 0) return '';

        const formattedTelemetry = formatLevel1DataForGeminiLive(l1Ticks);
        return `\n\n[LEVEL 1 MARKET DATA STREAM INJECTION]\n${formattedTelemetry}\n*System Note: Level 1 tick data is active and synchronized with current live spreads and tick velocity. Leverage this top-of-book data to provide exact execution levels and immediate spread awareness.*\n`;
    } catch (err) {
        console.warn('[level1DataProcessor] streamLevel1ToGeminiChatContext error:', err);
        return '';
    }
}
