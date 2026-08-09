import type { OHLC } from './quantEngine';

/**
 * STRUCTURED ORDER FLOW ABSORPTION SIGNAL
 * Represents detected seller or buyer absorption from Level 2 Depth of Market and Spot price streams.
 */
export interface OrderFlowAbsorptionSignal {
    type: 'SELL_ABSORPTION' | 'BUY_ABSORPTION' | 'NEUTRAL';
    price: number;
    confidence: number; // 0 - 100
    isDOMDerived: boolean; // Always true for cTrader L2 stream (no executed trade tape)
    source: 'Level 2 Depth & Price Action (DOM-Derived)' | 'Executed Trade Tape (Footprint)';
    aggression: number | null; // Null because executed trade tape is not provided by cTrader L2 stream
    bidAskImbalance: number | null; // -1.0 (Full Ask dominance) to +1.0 (Full Bid dominance)
    liquidityReplenishment: number | null; // Estimated volume refilled at key level (0-100 index or units)
    priceResponse: number; // Price delta relative to depth shifts
    rangeLocation: number | null; // 0.0 (Range Low) to 1.0 (Range High)
    confirmation: boolean;
    evidence: string[];
}

export interface L2DepthSnapshot {
    timestamp: number;
    bids: [number, number][]; // [price, volume]
    asks: [number, number][]; // [price, volume]
    spotBid?: number;
    spotAsk?: number;
}

export interface OrderFlowMetricsResult {
    bidDepthTotal: number;
    askDepthTotal: number;
    depthImbalance: number; // -1 to +1
    topOfBookSpread: number;
    liquidityStacking: { bidStack: number; askStack: number };
    liquidityPulling: { bidPull: number; askPull: number };
    liquidityReplenishment: { bidReplenished: number; askReplenished: number };
    priceResponse: number;
    failedAuctionUp: boolean;
    failedAuctionDown: boolean;
    absorptionSignal: OrderFlowAbsorptionSignal;
}

export interface SessionOpeningAnchor {
    sessionName: 'ASIAN' | 'LONDON' | 'NEW_YORK';
    openTimeUtc: string; // e.g. "00:00 UTC", "08:00 UTC", "13:00 UTC"
    openPrice: number;
    highPrice: number;
    lowPrice: number;
    closePrice: number;
    timestamp: number;
    status: 'ABOVE_ANCHOR_HIGH' | 'BELOW_ANCHOR_LOW' | 'INSIDE_ANCHOR_RANGE' | 'TESTING_ANCHOR_HIGH' | 'TESTING_ANCHOR_LOW';
}

export interface MonitoredSessionZone {
    session: 'ASIAN' | 'LONDON' | 'NEW_YORK';
    levelName: string; // e.g. "London Open High", "NY Open Low", "Asian Open Price"
    price: number;
    distancePips: number;
    zoneType: 'SUPPORT' | 'RESISTANCE' | 'PIVOT';
    interaction: 'TESTING' | 'SWEPT' | 'HOLDING' | 'REJECTED';
}

export interface SessionAnchorAnalysis {
    asianAnchor: SessionOpeningAnchor | null;
    londonAnchor: SessionOpeningAnchor | null;
    newYorkAnchor: SessionOpeningAnchor | null;
    monitoredZones: MonitoredSessionZone[];
}

export interface SessionRange {
    asianHigh: number | null;
    asianLow: number | null;
    sessionHigh: number;
    sessionLow: number;
    rangeHeight: number;
    sessionAnchors?: SessionAnchorAnalysis;
}

/**
 * Calculates exact session opening anchor candles (00:00 UTC Asian Open, 08:00 UTC London Open, 13:00 UTC NY Open)
 * and monitors price interaction relative to opening candle Highs, Lows, and Opens.
 */
export function calculateSessionOpeningAnchors(candles: OHLC[], currentPrice?: number): SessionAnchorAnalysis {
    if (!candles || candles.length === 0) {
        return { asianAnchor: null, londonAnchor: null, newYorkAnchor: null, monitoredZones: [] };
    }

    const refPrice = currentPrice || candles[candles.length - 1].close;
    const pipFactor = refPrice > 50 ? 100 : 10000;

    // Helper to evaluate anchor status
    const buildAnchor = (
        sessionName: 'ASIAN' | 'LONDON' | 'NEW_YORK',
        c: OHLC,
        openTimeUtc: string
    ): SessionOpeningAnchor => {
        let status: SessionOpeningAnchor['status'] = 'INSIDE_ANCHOR_RANGE';
        const distHigh = Math.abs(refPrice - c.high) * pipFactor;
        const distLow = Math.abs(refPrice - c.low) * pipFactor;

        if (distHigh <= 2.5) {
            status = 'TESTING_ANCHOR_HIGH';
        } else if (distLow <= 2.5) {
            status = 'TESTING_ANCHOR_LOW';
        } else if (refPrice > c.high) {
            status = 'ABOVE_ANCHOR_HIGH';
        } else if (refPrice < c.low) {
            status = 'BELOW_ANCHOR_LOW';
        }

        return {
            sessionName,
            openTimeUtc,
            openPrice: c.open,
            highPrice: c.high,
            lowPrice: c.low,
            closePrice: c.close,
            timestamp: c.epoch,
            status
        };
    };

    // Scan backwards to find the latest session opening candles
    let asianCandle: OHLC | null = null;
    let londonCandle: OHLC | null = null;
    let nyCandle: OHLC | null = null;

    for (let i = candles.length - 1; i >= 0; i--) {
        const c = candles[i];
        const date = new Date(c.epoch * 1000);
        const utcHour = date.getUTCHours();
        const utcMin = date.getUTCMinutes();

        // Asian Open Anchor (~00:00 UTC)
        if (!asianCandle && utcHour === 0 && utcMin < 15) {
            asianCandle = c;
        }
        // London Open Anchor (~07:00 / 08:00 UTC)
        if (!londonCandle && (utcHour === 7 || utcHour === 8) && utcMin < 15) {
            londonCandle = c;
        }
        // New York Open Anchor (~12:00 / 13:00 UTC)
        if (!nyCandle && (utcHour === 12 || utcHour === 13) && utcMin < 15) {
            nyCandle = c;
        }

        if (asianCandle && londonCandle && nyCandle) break;
    }

    const asianAnchor = asianCandle ? buildAnchor('ASIAN', asianCandle, '00:00 UTC') : null;
    const londonAnchor = londonCandle ? buildAnchor('LONDON', londonCandle, '08:00 UTC') : null;
    const newYorkAnchor = nyCandle ? buildAnchor('NEW_YORK', nyCandle, '13:00 UTC') : null;

    // Build monitored zones list
    const monitoredZones: MonitoredSessionZone[] = [];

    const addZones = (anchor: SessionOpeningAnchor | null) => {
        if (!anchor) return;
        const name = anchor.sessionName === 'ASIAN' ? 'Asian' : anchor.sessionName === 'LONDON' ? 'London' : 'NY';

        // 1. Session Open High Zone
        const highDist = parseFloat((Math.abs(refPrice - anchor.highPrice) * pipFactor).toFixed(1));
        let highInteraction: MonitoredSessionZone['interaction'] = 'HOLDING';
        if (highDist <= 2.5) highInteraction = 'TESTING';
        else if (refPrice > anchor.highPrice) highInteraction = 'SWEPT';
        else if (refPrice < anchor.highPrice && highDist <= 10) highInteraction = 'REJECTED';

        monitoredZones.push({
            session: anchor.sessionName,
            levelName: `${name} Open High`,
            price: anchor.highPrice,
            distancePips: highDist,
            zoneType: 'RESISTANCE',
            interaction: highInteraction
        });

        // 2. Session Open Low Zone
        const lowDist = parseFloat((Math.abs(refPrice - anchor.lowPrice) * pipFactor).toFixed(1));
        let lowInteraction: MonitoredSessionZone['interaction'] = 'HOLDING';
        if (lowDist <= 2.5) lowInteraction = 'TESTING';
        else if (refPrice < anchor.lowPrice) lowInteraction = 'SWEPT';
        else if (refPrice > anchor.lowPrice && lowDist <= 10) lowInteraction = 'REJECTED';

        monitoredZones.push({
            session: anchor.sessionName,
            levelName: `${name} Open Low`,
            price: anchor.lowPrice,
            distancePips: lowDist,
            zoneType: 'SUPPORT',
            interaction: lowInteraction
        });

        // 3. Session Open Price Zone
        const openDist = parseFloat((Math.abs(refPrice - anchor.openPrice) * pipFactor).toFixed(1));
        monitoredZones.push({
            session: anchor.sessionName,
            levelName: `${name} Open Price`,
            price: anchor.openPrice,
            distancePips: openDist,
            zoneType: 'PIVOT',
            interaction: openDist <= 2.5 ? 'TESTING' : 'HOLDING'
        });
    };

    addZones(asianAnchor);
    addZones(londonAnchor);
    addZones(newYorkAnchor);

    return {
        asianAnchor,
        londonAnchor,
        newYorkAnchor,
        monitoredZones
    };
}

/**
 * Calculates session boundaries (Asian range: 00:00 - 08:00 UTC) and session extremes from OHLC candles.
 */
export function calculateSessionRanges(candles: OHLC[], currentPrice?: number): SessionRange {
    if (!candles || candles.length === 0) {
        return {
            asianHigh: null,
            asianLow: null,
            sessionHigh: 0,
            sessionLow: 0,
            rangeHeight: 0
        };
    }

    let sessionHigh = -Infinity;
    let sessionLow = Infinity;

    let asianHigh = -Infinity;
    let asianLow = Infinity;
    let hasAsianCandles = false;

    for (const c of candles) {
        if (c.high > sessionHigh) sessionHigh = c.high;
        if (c.low < sessionLow) sessionLow = c.low;

        // Check UTC hour of candle epoch
        const date = new Date(c.epoch * 1000);
        const utcHour = date.getUTCHours();

        if (utcHour >= 0 && utcHour < 8) {
            hasAsianCandles = true;
            if (c.high > asianHigh) asianHigh = c.high;
            if (c.low < asianLow) asianLow = c.low;
        }
    }

    const sessionAnchors = calculateSessionOpeningAnchors(candles, currentPrice);

    return {
        asianHigh: hasAsianCandles ? asianHigh : null,
        asianLow: hasAsianCandles ? asianLow : null,
        sessionHigh: sessionHigh === -Infinity ? candles[candles.length - 1].high : sessionHigh,
        sessionLow: sessionLow === Infinity ? candles[candles.length - 1].low : sessionLow,
        rangeHeight: (sessionHigh !== -Infinity && sessionLow !== Infinity) ? (sessionHigh - sessionLow) : 0,
        sessionAnchors
    };
}

/**
 * Dedicated Order Flow Engine
 * Analyzes normalized Level 2 DOM depth quotes, spot ticks, and price action to detect absorption.
 */
export class OrderFlowEngine {
    private depthHistory: L2DepthSnapshot[] = [];
    private maxHistoryLength = 30; // Store last 30 snapshots (~30-60s window)

    /**
     * Ingests a new L2 depth snapshot and updates internal depth tracking history.
     */
    public pushSnapshot(snapshot: L2DepthSnapshot): void {
        this.depthHistory.push(snapshot);
        if (this.depthHistory.length > this.maxHistoryLength) {
            this.depthHistory.shift();
        }
    }

    /**
     * Analyzes current L2 state and candles to evaluate Order-Flow Absorption and metrics.
     */
    public processOrderFlow(
        currentDepth: { bids: [number, number][]; asks: [number, number][] } | null,
        candles: OHLC[],
        currentPrice: number
    ): OrderFlowMetricsResult {
        const bids = currentDepth?.bids || [];
        const asks = currentDepth?.asks || [];

        // 1. Calculate raw depth totals
        const bidDepthTotal = bids.reduce((acc, b) => acc + (b[1] || 0), 0);
        const askDepthTotal = asks.reduce((acc, a) => acc + (a[1] || 0), 0);
        const totalDepth = bidDepthTotal + askDepthTotal;

        // Depth Imbalance: -1.0 (100% Ask) to +1.0 (100% Bid)
        const depthImbalance = totalDepth > 0 ? (bidDepthTotal - askDepthTotal) / totalDepth : 0;

        // Spread calculation
        const bestBid = bids.length > 0 ? bids[0][0] : currentPrice;
        const bestAsk = asks.length > 0 ? asks[0][0] : currentPrice;
        const topOfBookSpread = Math.max(0, bestAsk - bestBid);

        // 2. DOM Liquidity Changes across snapshots (Stacking, Pulling, Replenishment)
        let bidStack = 0;
        let askStack = 0;
        let bidPull = 0;
        let askPull = 0;
        let bidReplenished = 0;
        let askReplenished = 0;

        if (this.depthHistory.length >= 2) {
            const prevSnap = this.depthHistory[this.depthHistory.length - 2];
            const currSnap = this.depthHistory[this.depthHistory.length - 1];

            const prevBidTotal = prevSnap.bids.reduce((a, b) => a + (b[1] || 0), 0);
            const currBidTotal = currSnap.bids.reduce((a, b) => a + (b[1] || 0), 0);
            const prevAskTotal = prevSnap.asks.reduce((a, b) => a + (a[1] || 0), 0);
            const currAskTotal = currSnap.asks.reduce((a, b) => a + (a[1] || 0), 0);

            if (currBidTotal > prevBidTotal) bidStack = currBidTotal - prevBidTotal;
            else if (currBidTotal < prevBidTotal) bidPull = prevBidTotal - currBidTotal;

            if (currAskTotal > prevAskTotal) askStack = currAskTotal - prevAskTotal;
            else if (currAskTotal < prevAskTotal) askPull = prevAskTotal - currAskTotal;

            // Replenishment detection:
            // Ask replenishment = ask volume increases or holds steady at top ask tier while price attempts to rise
            if (asks.length > 0 && prevSnap.asks.length > 0) {
                const topAskVol = asks[0][1];
                const prevTopAskVol = prevSnap.asks[0][1];
                if (topAskVol >= prevTopAskVol && currentPrice >= bestAsk - (topOfBookSpread * 0.5)) {
                    askReplenished = Math.round((topAskVol / Math.max(1, prevTopAskVol)) * 50);
                }
            }

            // Bid replenishment = bid volume increases or holds steady at top bid tier while price attempts to fall
            if (bids.length > 0 && prevSnap.bids.length > 0) {
                const topBidVol = bids[0][1];
                const prevTopBidVol = prevSnap.bids[0][1];
                if (topBidVol >= prevTopBidVol && currentPrice <= bestBid + (topOfBookSpread * 0.5)) {
                    bidReplenished = Math.round((topBidVol / Math.max(1, prevTopBidVol)) * 50);
                }
            }
        }

        // 3. Calculate Price Response relative to depth movement
        let priceResponse = 0;
        if (candles.length >= 3) {
            const lastCandle = candles[candles.length - 1];
            const candleRange = Math.max(0.00001, lastCandle.high - lastCandle.low);
            const priceMove = lastCandle.close - lastCandle.open;

            // Price response ratio: progress relative to candle range
            priceResponse = priceMove / candleRange;
        }

        // 4. Session Ranges and Location Analysis
        const sessionRanges = calculateSessionRanges(candles);
        let rangeLocation: number | null = null;

        if (sessionRanges.rangeHeight > 0) {
            rangeLocation = (currentPrice - sessionRanges.sessionLow) / sessionRanges.rangeHeight;
            rangeLocation = Math.max(0, Math.min(1, rangeLocation));
        }

        // 5. Failed Auctions detection
        let failedAuctionUp = false;
        let failedAuctionDown = false;

        if (candles.length >= 2) {
            const lastCandle = candles[candles.length - 1];
            const prevCandle = candles[candles.length - 2];

            // Failed Auction Up: price pushed above key high (session/Asian high or prev candle high) with long upper wick and closed lower
            const upperWick = lastCandle.high - Math.max(lastCandle.open, lastCandle.close);
            const bodySize = Math.abs(lastCandle.close - lastCandle.open);
            const totalCandleSize = lastCandle.high - lastCandle.low;

            if (sessionRanges.sessionHigh > 0 && lastCandle.high >= sessionRanges.sessionHigh * 0.9998) {
                if (upperWick > bodySize * 1.5 && lastCandle.close < lastCandle.open) {
                    failedAuctionUp = true;
                }
            } else if (lastCandle.high > prevCandle.high && lastCandle.close < prevCandle.high && upperWick > (totalCandleSize * 0.4)) {
                failedAuctionUp = true;
            }

            // Failed Auction Down: price pushed below key low (session/Asian low or prev candle low) with long lower wick and closed higher
            const lowerWick = Math.min(lastCandle.open, lastCandle.close) - lastCandle.low;
            if (sessionRanges.sessionLow > 0 && lastCandle.low <= sessionRanges.sessionLow * 1.0002) {
                if (lowerWick > bodySize * 1.5 && lastCandle.close > lastCandle.open) {
                    failedAuctionDown = true;
                }
            } else if (lastCandle.low < prevCandle.low && lastCandle.close > prevCandle.low && lowerWick > (totalCandleSize * 0.4)) {
                failedAuctionDown = true;
            }
        }

        // 6. ABSORPTION SIGNAL EVALUATION
        const absorptionSignal = this.evaluateAbsorptionSignal(
            currentPrice,
            depthImbalance,
            askReplenished,
            bidReplenished,
            priceResponse,
            rangeLocation,
            sessionRanges,
            failedAuctionUp,
            failedAuctionDown,
            candles
        );

        return {
            bidDepthTotal,
            askDepthTotal,
            depthImbalance,
            topOfBookSpread,
            liquidityStacking: { bidStack, askStack },
            liquidityPulling: { bidPull, askPull },
            liquidityReplenishment: { bidReplenished, askReplenished },
            priceResponse,
            failedAuctionUp,
            failedAuctionDown,
            absorptionSignal
        };
    }

    private evaluateAbsorptionSignal(
        currentPrice: number,
        depthImbalance: number,
        askReplenished: number,
        bidReplenished: number,
        priceResponse: number,
        rangeLocation: number | null,
        sessionRanges: SessionRange,
        failedAuctionUp: boolean,
        failedAuctionDown: boolean,
        candles: OHLC[]
    ): OrderFlowAbsorptionSignal {
        const evidence: string[] = [];
        let type: 'SELL_ABSORPTION' | 'BUY_ABSORPTION' | 'NEUTRAL' = 'NEUTRAL';
        let confidence = 0;
        let confirmation = false;
        let liquidityReplenishmentVal: number | null = null;

        const isNearAsianHigh = sessionRanges.asianHigh !== null && Math.abs(currentPrice - sessionRanges.asianHigh) / sessionRanges.asianHigh < 0.0015;
        const isNearAsianLow = sessionRanges.asianLow !== null && Math.abs(currentPrice - sessionRanges.asianLow) / sessionRanges.asianLow < 0.0015;
        const isNearSessionHigh = rangeLocation !== null && rangeLocation >= 0.85;
        const isNearSessionLow = rangeLocation !== null && rangeLocation <= 0.15;

        // Monitored Session Opening Anchors
        const monitoredZones = sessionRanges.sessionAnchors?.monitoredZones || [];
        const activeTestingZone = monitoredZones.find(z => z.interaction === 'TESTING' || z.distancePips <= 3.0);

        if (activeTestingZone) {
            evidence.push(`Monitored Session Zone: Active interaction at ${activeTestingZone.levelName} (${activeTestingZone.price.toFixed(5)}) [${activeTestingZone.distancePips} pips dist, ${activeTestingZone.interaction}]`);
        }

        // --- POTENTIAL SELL ABSORPTION (Short Setup) ---
        // Conditions: Buying pressure attempting to break resistance/range high/session open high, heavy ask replenishment, weak upward price response, failed breakout.
        const sellAbsorptionConditions: boolean[] = [];

        if (isNearAsianHigh || isNearSessionHigh) {
            sellAbsorptionConditions.push(true);
            evidence.push(`Location: Near ${isNearAsianHigh ? 'Asian Range High' : 'Session Resistance High'}`);
        } else if (activeTestingZone && (activeTestingZone.zoneType === 'RESISTANCE' || activeTestingZone.levelName.includes('High'))) {
            sellAbsorptionConditions.push(true);
            evidence.push(`Location: Testing Monitored Session Open High Level (${activeTestingZone.levelName})`);
        } else if (rangeLocation !== null && rangeLocation > 0.65) {
            sellAbsorptionConditions.push(true);
            evidence.push(`Location: Upper Range Tier (${(rangeLocation * 100).toFixed(0)}%)`);
        }

        // Depth / Ask interaction
        if (askReplenished > 20 || depthImbalance < -0.2) {
            sellAbsorptionConditions.push(true);
            liquidityReplenishmentVal = askReplenished;
            evidence.push(`Ask Liquidity: High ask depth & replenishment detected (${askReplenished}% refill)`);
        }

        // Price response weakness
        if (priceResponse < 0.25) {
            sellAbsorptionConditions.push(true);
            evidence.push(`Price Response: WEAK upward advance relative to volume (buying absorbed)`);
        }

        // Failed breakout / auction
        if (failedAuctionUp) {
            sellAbsorptionConditions.push(true);
            evidence.push(`Breakout Attempt: FAILED auction at high with rejection wick`);
        }

        // Confirmation (subsequent candle displacement lower)
        if (candles.length >= 2) {
            const lastBar = candles[candles.length - 1];
            if (lastBar.close < lastBar.open) {
                confirmation = true;
                evidence.push(`Bearish Confirmation: Active bar displacing lower`);
            }
        }

        if (sellAbsorptionConditions.filter(Boolean).length >= 3) {
            type = 'SELL_ABSORPTION';
            let baseScore = sellAbsorptionConditions.filter(Boolean).length * 20;

            // Boost score if occurring at Asian High or Monitored Session Anchor High
            if (isNearAsianHigh) baseScore += 20;
            if (activeTestingZone && activeTestingZone.levelName.includes('High')) baseScore += 20;
            if (failedAuctionUp) baseScore += 15;
            if (confirmation) baseScore += 10;

            confidence = Math.min(98, baseScore);
        }

        // --- POTENTIAL BUY ABSORPTION (Long Setup) ---
        // Conditions: Selling pressure attempting to break support/range low/session open low, heavy bid replenishment, weak downward price response, failed breakdown.
        if (type === 'NEUTRAL') {
            const buyAbsorptionConditions: boolean[] = [];

            if (isNearAsianLow || isNearSessionLow) {
                buyAbsorptionConditions.push(true);
                evidence.push(`Location: Near ${isNearAsianLow ? 'Asian Range Low' : 'Session Support Low'}`);
            } else if (activeTestingZone && (activeTestingZone.zoneType === 'SUPPORT' || activeTestingZone.levelName.includes('Low'))) {
                buyAbsorptionConditions.push(true);
                evidence.push(`Location: Testing Monitored Session Open Low Level (${activeTestingZone.levelName})`);
            } else if (rangeLocation !== null && rangeLocation < 0.35) {
                buyAbsorptionConditions.push(true);
                evidence.push(`Location: Lower Range Tier (${(rangeLocation * 100).toFixed(0)}%)`);
            }

            // Depth / Bid interaction
            if (bidReplenished > 20 || depthImbalance > 0.2) {
                buyAbsorptionConditions.push(true);
                liquidityReplenishmentVal = bidReplenished;
                evidence.push(`Bid Liquidity: High bid depth & replenishment detected (${bidReplenished}% refill)`);
            }

            // Price response weakness
            if (priceResponse > -0.25 && priceResponse <= 0.1) {
                buyAbsorptionConditions.push(true);
                evidence.push(`Price Response: WEAK downward decline relative to volume (selling absorbed)`);
            }

            // Failed breakdown / auction
            if (failedAuctionDown) {
                buyAbsorptionConditions.push(true);
                evidence.push(`Breakdown Attempt: FAILED auction at low with rejection wick`);
            }

            // Confirmation (subsequent candle displacement higher)
            if (candles.length >= 2) {
                const lastBar = candles[candles.length - 1];
                if (lastBar.close > lastBar.open) {
                    confirmation = true;
                    evidence.push(`Bullish Confirmation: Active bar displacing higher`);
                }
            }

            if (buyAbsorptionConditions.filter(Boolean).length >= 3) {
                type = 'BUY_ABSORPTION';
                let baseScore = buyAbsorptionConditions.filter(Boolean).length * 20;

                if (isNearAsianLow) baseScore += 20;
                if (failedAuctionDown) baseScore += 15;
                if (confirmation) baseScore += 10;

                confidence = Math.min(98, baseScore);
            }
        }

        if (type !== 'NEUTRAL') {
            evidence.unshift('Data Integrity: Inference derived from Level 2 Depth & Price Action (Executed trade tape unavailable).');
        } else {
            evidence.push('Order Flow: Balanced DOM depth; no acute absorption detected at range boundaries.');
        }

        return {
            type,
            price: currentPrice,
            confidence: Math.round(confidence),
            isDOMDerived: true,
            source: 'Level 2 Depth & Price Action (DOM-Derived)',
            aggression: null, // STRICT DATA INTEGRITY: Executed trade tape is unavailable from cTrader L2 stream
            bidAskImbalance: parseFloat(depthImbalance.toFixed(3)),
            liquidityReplenishment: liquidityReplenishmentVal,
            priceResponse: parseFloat(priceResponse.toFixed(3)),
            rangeLocation: rangeLocation !== null ? parseFloat(rangeLocation.toFixed(3)) : null,
            confirmation,
            evidence
        };
    }
}

// Global instance helper
export const globalOrderFlowEngine = new OrderFlowEngine();
