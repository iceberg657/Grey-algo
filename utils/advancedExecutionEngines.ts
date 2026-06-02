import { WeightedScore } from './quantEngine';

export type OrderSignal = 'BUY' | 'SELL';
export type StrategyTier = 'A+' | 'A' | 'B+' | 'B' | 'C' | 'NO TRADE';

export interface MarketBar {
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    timestamp: Date;
}

export interface MarketSeries {
    symbol: string;
    bars: MarketBar[];
}

export interface TechnicalArrays {
    closes: number[];
    highs: number[];
    lows: number[];
    opens: number[];
    volumes: number[];
    times: Date[];
}

export interface FairValueGap {
    index: number;
    type: 'BULLISH' | 'BEARISH';
    top: number;
    bottom: number;
    isMitigated: boolean;
}

export class QuantMath {
    /**
     * Extracts a flat array of numbers into a standardized utility structure
     */
    public static extractArrays(series: MarketSeries): TechnicalArrays {
        return {
            closes: series.bars.map(b => b.close),
            highs: series.bars.map(b => b.high),
            lows: series.bars.map(b => b.low),
            opens: series.bars.map(b => b.open),
            volumes: series.bars.map(b => b.volume),
            times: series.bars.map(b => b.timestamp)
        };
    }

    public static rollingMax(values: number[], lookback: number, offset: number = 0): number {
        const start = values.length - lookback - offset;
        const end = values.length - offset;
        if (start < 0) return Math.max(...values.slice(0, end));
        return Math.max(...values.slice(start, end));
    }

    public static rollingMin(values: number[], lookback: number, offset: number = 0): number {
        const start = values.length - lookback - offset;
        const end = values.length - offset;
        if (start < 0) return Math.min(...values.slice(0, end));
        return Math.min(...values.slice(start, end));
    }

    public static calculateMean(values: number[]): number {
        if (values.length === 0) return 0;
        return values.reduce((sum, val) => sum + val, 0) / values.length;
    }

    public static calculateStdDev(values: number[], mean: number): number {
        if (values.length <= 1) return 0;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        return Math.sqrt(variance);
    }

    /**
     * Calculates True Range for a single bar index
     */
    public static trueRange(high: number, low: number, prevClose: number | null): number {
        if (prevClose === null) return high - low;
        return Math.max(
            high - low,
            Math.abs(high - prevClose),
            Math.abs(low - prevClose)
        );
    }

    /**
     * Calculates wilder-smoothed Average True Range (ATR)
     */
    public static calculateATR(highs: number[], lows: number[], closes: number[], period: number): number[] {
        const atr: number[] = new Array(closes.length).fill(0);
        if (closes.length < period) return atr;

        let trSum = 0;
        for (let i = 0; i < period; i++) {
            trSum += this.trueRange(highs[i], lows[i], i > 0 ? closes[i - 1] : null);
        }
        atr[period - 1] = trSum / period;

        for (let i = period; i < closes.length; i++) {
            const currentTR = this.trueRange(highs[i], lows[i], closes[i - 1]);
            atr[i] = (atr[i - 1] * (period - 1) + currentTR) / period;
        }
        return atr;
    }
}

export class IndexQuantMath extends QuantMath {
    /**
     * Calculates dynamic hedge ratio (Beta) and Correlation (r) over a rolling window
     */
    public static calculateRegressionAndCorrelation(x: number[], y: number[]): { beta: number; correlation: number } {
        if (x.length !== y.length || x.length === 0) return { beta: 1, correlation: 0 };
        
        const n = x.length;
        const meanX = this.calculateMean(x);
        const meanY = this.calculateMean(y);
        
        let covariance = 0;
        let varianceX = 0;
        let varianceY = 0;

        for (let i = 0; i < n; i++) {
            const dx = x[i] - meanX;
            const dy = y[i] - meanY;
            covariance += dx * dy;
            varianceX += dx * dx;
            varianceY += dy * dy;
        }

        const beta = varianceX === 0 ? 0 : covariance / varianceX;
        const correlation = (varianceX === 0 || varianceY === 0) ? 0 : covariance / Math.sqrt(varianceX * varianceY);

        return { beta, correlation };
    }
}

export class SMTEngine {
    private lookback: number;

    constructor(lookbackBars: number = 48) {
        this.lookback = lookbackBars;
    }

    /**
     * Detects micro Fair Value Gaps in lower timeframe (30s/1m) data streams
     */
    public scanFairValueGaps(data: TechnicalArrays, depth: number = 5): FairValueGap[] {
        const fvgs: FairValueGap[] = [];
        const t = data.closes.length - 1;

        // Loop backwards through recent structural formations
        for (let i = t - 1; i > t - depth && i > 1; i--) {
            // Bullish FVG: Low of Bar[i+1] > High of Bar[i-1]
            if (data.lows[i + 1] > data.highs[i - 1] && data.closes[i] > data.opens[i]) {
                fvgs.push({
                    index: i,
                    type: 'BULLISH',
                    top: data.lows[i + 1],
                    bottom: data.highs[i - 1],
                    isMitigated: data.lows[t] <= data.highs[i - 1]
                });
            }
            // Bearish FVG: High of Bar[i+1] < Low of Bar[i-1]
            if (data.highs[i + 1] < data.lows[i - 1] && data.closes[i] < data.opens[i]) {
                fvgs.push({
                    index: i,
                    type: 'BEARISH',
                    top: data.lows[i - 1],
                    bottom: data.highs[i + 1],
                    isMitigated: data.highs[t] >= data.lows[i - 1]
                });
            }
        }
        return fvgs;
    }

    public evaluate(
        dxySeries: MarketSeries,
        eurusdSeries: MarketSeries,
        gbpusdSeries: MarketSeries,
        newsSentiment: number
    ): Partial<WeightedScore> {
        const dxy = QuantMath.extractArrays(dxySeries);
        const eu = QuantMath.extractArrays(eurusdSeries);
        const gu = QuantMath.extractArrays(gbpusdSeries);

        const t = gu.closes.length - 1;
        if (t < this.lookback) return { grade: 'NO TRADE' };
        
        const breakdown: string[] = [];

        // 1. Session Timing Module
        const estTime = gu.times[t] || new Date();
        const hour = estTime.getUTCHours() - 5; // Simplified EST conversion
        const adjustedHour = hour < 0 ? hour + 24 : hour;
        
        let sessionTiming = 0;
        if ((adjustedHour >= 3 && adjustedHour < 5) || (adjustedHour >= 8 && adjustedHour < 11)) {
            sessionTiming = 15;
            breakdown.push(`Premium Volume Windows Active: ${adjustedHour}:00 EST`);
        } else {
            sessionTiming = 5;
            breakdown.push(`Off-Peak Session Window: ${adjustedHour}:00 EST`);
        }

        // 2. High Probability Structural Sweeps Math
        const dxySessionHigh = QuantMath.rollingMax(dxy.highs, this.lookback, 1);
        const euSessionLow = QuantMath.rollingMin(eu.lows, this.lookback, 1);
        const guSessionLow = QuantMath.rollingMin(gu.lows, this.lookback, 1);

        const dxySwept = dxy.highs[t] > dxySessionHigh;
        const euSwept = eu.lows[t] < euSessionLow;
        const guFailedToSweep = gu.lows[t] >= guSessionLow && gu.lows[t] <= guSessionLow + 0.00025; 

        let smcStructure = 0;
        if (dxySwept && euSwept && guFailedToSweep) {
            smcStructure = 30;
            breakdown.push("SMT CONFIRMED: DXY/EURUSD Swept External Pools, GBPUSD Formed Higher Low");
        } else {
            breakdown.push("SMT Dissimilarity Check Inconclusive");
        }

        // 3. Lower Timeframe Confirmation Tracker (BOS & FVG Validation)
        let volumeProfile = 0;
        const recentFVGs = this.scanFairValueGaps(gu, 6);
        const unmitigatedBullishFVG = recentFVGs.find(f => f.type === 'BULLISH' && !f.isMitigated);
        
        const lowerTimeframeBOS = gu.closes[t] > gu.highs[t - 2];

        if (unmitigatedBullishFVG && lowerTimeframeBOS) {
            volumeProfile = 20;
            breakdown.push("Lower Timeframe BOS Confirmed with Active Discount Fair Value Gap");
        } else if (unmitigatedBullishFVG) {
            volumeProfile = 12;
            breakdown.push("Discount Structural Anomalies Discovered; Awaiting BOS Displacement");
        }

        // 4. Macro Trend Bias Matrix
        let globalTrend = 0;
        const rollingHTFMean = QuantMath.calculateMean(gu.closes.slice(-20));
        if (gu.closes[t] > rollingHTFMean) {
            globalTrend = 20;
            breakdown.push("Structural Trend Alignment Bias: Bullish");
        }

        const totalScore = smcStructure + volumeProfile + globalTrend + newsSentiment + sessionTiming;
        let grade: StrategyTier = 'NO TRADE';
        let suggestedRiskPercent = 0;

        if (totalScore >= 85 && smcStructure === 30) { grade = 'A+'; suggestedRiskPercent = 2.0; }
        else if (totalScore >= 70) { grade = 'A';  suggestedRiskPercent = 1.5; }
        else if (totalScore >= 55) { grade = 'B+'; suggestedRiskPercent = 1.0; }
        else if (totalScore >= 40) { grade = 'B';  suggestedRiskPercent = 0.5; }

        return { grade, totalScore, suggestedRiskPercent, smcStructure, volumeProfile, globalTrend, newsSentiment, sessionTiming, breakdown };
    }
}

export class StatArbEngine {
    private lookback: number;
    private zThreshold: number;

    constructor(lookbackBars: number = 120, threshold: number = 2.0) {
        this.lookback = lookbackBars;
        this.zThreshold = threshold;
    }

    public evaluate(
        eurusdSeries: MarketSeries,
        gbpusdSeries: MarketSeries,
        newsSentiment: number
    ): Partial<WeightedScore> {
        const eu = QuantMath.extractArrays(eurusdSeries);
        const gu = QuantMath.extractArrays(gbpusdSeries);
        const t = eu.closes.length - 1;
        const breakdown: string[] = [];

        if (eu.closes.length < this.lookback) {
            return { grade: 'NO TRADE', breakdown: ["Data stream initialization error"] };
        }

        // 1. Rolling Ratio Calculations Matrix
        const ratios: number[] = [];
        for (let i = t - this.lookback + 1; i <= t; i++) {
            ratios.push(eu.closes[i] / gu.closes[i]);
        }

        const currentRatio = ratios[ratios.length - 1];
        const mean = QuantMath.calculateMean(ratios);
        const stdDev = QuantMath.calculateStdDev(ratios, mean);
        const zScore = stdDev !== 0 ? (currentRatio - mean) / stdDev : 0;

        let globalTrend = 0;
        if (Math.abs(zScore) >= this.zThreshold) {
            globalTrend = 20;
            breakdown.push(`STATISTICAL ARBITRAGE ACTIVE: Real-Time Z-Score [${zScore.toFixed(3)}] >= Threshold [${this.zThreshold}]`);
        } else if (Math.abs(zScore) >= 1.5) {
            globalTrend = 10;
            breakdown.push(`Spread Expanding outside normal distribution lines: Z-Score = ${zScore.toFixed(3)}`);
        } else {
            breakdown.push(`Spread contained inside equilibrium parameters: Z-Score = ${zScore.toFixed(3)}`);
        }

        // 2. Volatility Alignment Calculations via ATR Tracking
        let volumeProfile = 0;
        const euAtrArray = QuantMath.calculateATR(eu.highs, eu.lows, eu.closes, 14);
        const guAtrArray = QuantMath.calculateATR(gu.highs, gu.lows, gu.closes, 14);
        
        const currentEuAtr = euAtrArray[t];
        const currentGuAtr = guAtrArray[t];
        const atrRatio = currentGuAtr !== 0 ? currentEuAtr / currentGuAtr : 1.0;

        if (atrRatio >= 0.75 && atrRatio <= 1.35) {
            volumeProfile = 20;
            breakdown.push(`Volatility distribution stable. Dynamic Hedging Ratio Weighting: ${atrRatio.toFixed(3)}`);
        } else {
            volumeProfile = 5;
            breakdown.push(`Asymmetric Volatility Discovered. Hedge Ratios requiring increased cushion.`);
        }

        let smcStructure = Math.abs(zScore) >= this.zThreshold ? 25 : 5;
        let sessionTiming = 15;

        const totalScore = smcStructure + volumeProfile + globalTrend + newsSentiment + sessionTiming;
        let grade: StrategyTier = 'NO TRADE';
        let suggestedRiskPercent = 0;

        if (totalScore >= 80 && Math.abs(zScore) >= this.zThreshold) { grade = 'A'; suggestedRiskPercent = 1.5; }
        else if (totalScore >= 65) { grade = 'B+'; suggestedRiskPercent = 1.0; }
        else if (totalScore >= 45) { grade = 'B';  suggestedRiskPercent = 0.5; }

        return { grade, totalScore, suggestedRiskPercent, smcStructure, volumeProfile, globalTrend, newsSentiment, sessionTiming, breakdown };
    }
}

export class VelocityLagEngine {
    private kBars: number;
    private entryThresholdPips: number;

    constructor(kBarsLookback: number = 4, pipThreshold: number = 15.0) {
        this.kBars = kBarsLookback;             
        this.entryThresholdPips = pipThreshold; 
    }

    public evaluate(
        eurusdSeries: MarketSeries,
        gbpusdSeries: MarketSeries,
        newsSentiment: number
    ): Partial<WeightedScore> {
        const eu = QuantMath.extractArrays(eurusdSeries);
        const gu = QuantMath.extractArrays(gbpusdSeries);
        const t = eu.closes.length - 1;
        const breakdown: string[] = [];

        if (eu.closes.length <= this.kBars) {
            return { grade: 'NO TRADE', breakdown: ["Historical streams insufficient"] };
        }

        const timeStamp = gu.times[t] || new Date();
        const hour = timeStamp.getUTCHours() - 5; 
        const minute = timeStamp.getUTCMinutes();

        let sessionTiming = 0;
        if (hour === 3 && minute <= 20) {
            sessionTiming = 15;
            breakdown.push(`CRITICAL VELOCITY BOUNDARY: London Bank Clearing Open detected.`);
        } else if (hour === 3 || hour === 8) {
            sessionTiming = 10;
            breakdown.push("Active trading session volume present.");
        } else {
            sessionTiming = 2;
            breakdown.push("Velocity mechanics inactive outside major session transitions.");
        }

        const euVelocityPips = ((eu.closes[t] - eu.closes[t - this.kBars]) / eu.closes[t - this.kBars]) * 10000;
        const guVelocityPips = ((gu.closes[t] - gu.closes[t - this.kBars]) / gu.closes[t - this.kBars]) * 10000;
        
        const absoluteVelocityDelta = Math.abs(guVelocityPips - euVelocityPips);

        let volumeProfile = 0;
        let smcStructure = 0;

        if (Math.abs(guVelocityPips) >= 20.0 && absoluteVelocityDelta >= this.entryThresholdPips) {
            volumeProfile = 20;
            smcStructure = 25;
            breakdown.push(`ARBITRAGE DELTA DISCOVERED: Velocity Delta = ${absoluteVelocityDelta.toFixed(1)} Pips. [Cable Velocity: ${guVelocityPips.toFixed(1)} | Euro Velocity: ${euVelocityPips.toFixed(1)}]`);
        } else {
            breakdown.push(`System velocities synchronized inside normal boundaries. Real-time Delta: ${absoluteVelocityDelta.toFixed(1)} pips.`);
        }

        let globalTrend = 15; 
        const totalScore = smcStructure + volumeProfile + globalTrend + newsSentiment + sessionTiming;

        let grade: StrategyTier = 'NO TRADE';
        let suggestedRiskPercent = 0;

        if (totalScore >= 75 && sessionTiming === 15) { grade = 'A'; suggestedRiskPercent = 1.00; }
        else if (totalScore >= 60) { grade = 'B+'; suggestedRiskPercent = 0.75; }
        else if (totalScore >= 45) { grade = 'B';  suggestedRiskPercent = 0.50; }

        return { grade, totalScore, suggestedRiskPercent, smcStructure, volumeProfile, globalTrend, newsSentiment, sessionTiming, breakdown };
    }
}

export class IndexSMTEngine {
    private lookback: number;

    constructor(lookbackBars: number = 60) {
        this.lookback = lookbackBars;
    }

    public evaluate(
        us30Series: MarketSeries,
        nas100Series: MarketSeries,
        newsSentiment: number
    ): Partial<WeightedScore> {
        const us30 = IndexQuantMath.extractArrays(us30Series);
        const nas = IndexQuantMath.extractArrays(nas100Series);
        const t = us30.closes.length - 1;
        if (t < this.lookback) return { grade: 'NO TRADE' };
        
        const breakdown: string[] = [];

        const timeStamp = us30.times[t] || new Date();
        const hour = timeStamp.getUTCHours() - 5; 
        const minute = timeStamp.getUTCMinutes();
        const timeDecimal = hour + (minute / 60);

        let sessionTiming = 0;
        if ((timeDecimal >= 9.5 && timeDecimal <= 11.5) || (timeDecimal >= 14.0 && timeDecimal <= 16.0)) {
            sessionTiming = 15;
            breakdown.push("Peak New York Equities Open/Close Volume Window Active.");
        } else if (timeDecimal >= 12.0 && timeDecimal <= 13.5) {
            sessionTiming = 2; 
            breakdown.push("DANGER: Low Liquidity Lunch Hour. Fakeouts probable.");
        } else {
            sessionTiming = 5;
        }

        const us30SessionHigh = IndexQuantMath.rollingMax(us30.highs, this.lookback, 1);
        const nasSessionHigh = IndexQuantMath.rollingMax(nas.highs, this.lookback, 1);

        const us30Swept = us30.highs[t] > us30SessionHigh;
        const nasFailedToSweep = nas.highs[t] <= nasSessionHigh; 

        let smcStructure = 0;
        if (us30Swept && nasFailedToSweep) {
            smcStructure = 30;
            breakdown.push("INTRADAY SMT CONFIRMED: US30 Swept Highs, NAS100 displays Relative Weakness.");
        } else {
            breakdown.push("Indices tracking structurally aligned.");
        }

        let volumeProfile = 0;
        const nasBearishDisplacement = nas.closes[t] < nas.lows[t - 2]; 

        if (nasBearishDisplacement) {
            volumeProfile = 20;
            breakdown.push("Micro Bearish BOS Confirmed on NAS100. Institutional sell-side delivery validated.");
        }

        let globalTrend = us30.closes[t] < us30.opens[Math.max(0, t - 30)] ? 20 : 5; 
        const totalScore = smcStructure + volumeProfile + globalTrend + newsSentiment + sessionTiming;

        let grade: StrategyTier = 'NO TRADE';
        let suggestedRiskPercent = 0;

        if (totalScore >= 80 && smcStructure === 30 && sessionTiming === 15) { grade = 'A+'; suggestedRiskPercent = 2.0; }
        else if (totalScore >= 65) { grade = 'A';  suggestedRiskPercent = 1.0; }
        else if (totalScore >= 50) { grade = 'B';  suggestedRiskPercent = 0.5; }

        return { grade, totalScore, suggestedRiskPercent, smcStructure, volumeProfile, globalTrend, newsSentiment, sessionTiming, breakdown };
    }
}

export class IndexStatArbEngine {
    private lookback: number;
    private entryZ: number;
    private invalidateZ: number;

    constructor(lookbackBars: number = 400, entryZ: number = 2.5, invalidateZ: number = 4.0) {
        this.lookback = lookbackBars;
        this.entryZ = entryZ;
        this.invalidateZ = invalidateZ;
    }

    public evaluate(
        nas100Series: MarketSeries,
        spx500Series: MarketSeries,
        newsSentiment: number
    ): Partial<WeightedScore> {
        const nas = IndexQuantMath.extractArrays(nas100Series);
        const spx = IndexQuantMath.extractArrays(spx500Series);
        const t = nas.closes.length - 1;
        const breakdown: string[] = [];

        if (nas.closes.length < this.lookback) {
            return { grade: 'NO TRADE', breakdown: ["Buffering data..."] };
        }

        const recentNas = nas.closes.slice(t - this.lookback, t + 1);
        const recentSpx = spx.closes.slice(t - this.lookback, t + 1);
        const { beta, correlation } = IndexQuantMath.calculateRegressionAndCorrelation(recentSpx, recentNas);

        const spreadArray = recentNas.map((nVal, i) => nVal - (beta * recentSpx[i]));
        const currentSpread = spreadArray[spreadArray.length - 1];
        
        const spreadMean = IndexQuantMath.calculateMean(spreadArray);
        const spreadStdDev = IndexQuantMath.calculateStdDev(spreadArray, spreadMean);
        const zScore = spreadStdDev !== 0 ? (currentSpread - spreadMean) / spreadStdDev : 0;

        let globalTrend = 0;
        let smcStructure = 0;

        if (Math.abs(zScore) >= this.invalidateZ) {
            breakdown.push(`STRUCTURAL INVALIDATION: Z-Score [${zScore.toFixed(2)}] hit ±4.0. Regime shift detected. DO NOT TRADE.`);
        } else if (Math.abs(zScore) >= this.entryZ) {
            globalTrend = 20;
            smcStructure = 25;
            breakdown.push(`HFT ARBITRAGE TRIGGER: Spread overextended. Z-Score: ${zScore.toFixed(2)}. Dynamic Beta: ${beta.toFixed(2)}`);
        } else {
            breakdown.push(`Spread stabilizing. Current Z-Score: ${zScore.toFixed(2)}`);
        }

        let volumeProfile = 0;
        if (correlation > 0.85) {
            volumeProfile = 20;
            breakdown.push(`Strong algorithmic correlation intact (r = ${correlation.toFixed(2)}). Mean reversion highly probable.`);
        } else {
            breakdown.push(`Correlation breaking down (r = ${correlation.toFixed(2)}). Proceed with caution.`);
        }

        let sessionTiming = 15; 
        const totalScore = smcStructure + volumeProfile + globalTrend + newsSentiment + sessionTiming;

        let grade: StrategyTier = 'NO TRADE';
        let suggestedRiskPercent = 0;

        if (totalScore >= 80 && Math.abs(zScore) >= this.entryZ && Math.abs(zScore) < this.invalidateZ) { 
            grade = 'A'; suggestedRiskPercent = 1.0; 
        }

        return { grade, totalScore, suggestedRiskPercent, smcStructure, volumeProfile, globalTrend, newsSentiment, sessionTiming, breakdown };
    }
}

export class IndexLeadLagEngine {
    private corrLookback: number;
    private velocityBars: number;

    constructor(corrLookback: number = 10, velocityBars: number = 3) {
        this.corrLookback = corrLookback;
        this.velocityBars = velocityBars;
    }

    public evaluate(
        nas100Series: MarketSeries,
        us30Series: MarketSeries,
        newsSentiment: number
    ): Partial<WeightedScore> {
        const nas = IndexQuantMath.extractArrays(nas100Series);
        const us30 = IndexQuantMath.extractArrays(us30Series);
        const t = nas.closes.length - 1;
        const breakdown: string[] = [];

        if (t < this.corrLookback) return { grade: 'NO TRADE' };

        const recentNas = nas.closes.slice(t - this.corrLookback, t + 1);
        const recentUS30 = us30.closes.slice(t - this.corrLookback, t + 1);
        const { correlation } = IndexQuantMath.calculateRegressionAndCorrelation(recentNas, recentUS30);

        const nasVel = ((nas.closes[t] - nas.closes[t - this.velocityBars]) / nas.closes[t - this.velocityBars]) * 10000;
        const us30Vel = ((us30.closes[t] - us30.closes[t - this.velocityBars]) / us30.closes[t - this.velocityBars]) * 10000;
        const velocityDelta = Math.abs(nasVel - us30Vel);

        let smcStructure = 0;
        let volumeProfile = 0;

        if (correlation > 0.80) {
            volumeProfile = 15;
            breakdown.push(`High Micro-Correlation Intact (r = ${correlation.toFixed(2)}). Basket algorithms active.`);
            
            if (nasVel > 15.0 && velocityDelta > 10.0) {
                smcStructure = 25;
                breakdown.push(`LEAD-LAG ANOMALY: NAS100 Leading Bullish (+${nasVel.toFixed(1)} bps). US30 Lagging. Long US30 execution signaled.`);
            } else if (nasVel < -15.0 && velocityDelta > 10.0) {
                smcStructure = 25;
                breakdown.push(`LEAD-LAG ANOMALY: NAS100 Leading Bearish (${nasVel.toFixed(1)} bps). US30 Lagging. Short US30 execution signaled.`);
            } else {
                breakdown.push("No violent velocity discrepancies detected.");
            }
        } else {
            breakdown.push(`Correlation decoupling (r = ${correlation.toFixed(2)}). Arbitrage gap unsafe to trade.`);
        }

        let sessionTiming = 15; 
        let globalTrend = 15;
        const totalScore = smcStructure + volumeProfile + globalTrend + newsSentiment + sessionTiming;

        let grade: StrategyTier = 'NO TRADE';
        let suggestedRiskPercent = 0;

        if (totalScore >= 70 && smcStructure === 25) { grade = 'A'; suggestedRiskPercent = 1.0; }
        else if (totalScore >= 55 && smcStructure === 25) { grade = 'B'; suggestedRiskPercent = 0.5; }

        return { grade, totalScore, suggestedRiskPercent, smcStructure, volumeProfile, globalTrend, newsSentiment, sessionTiming, breakdown };
    }
}

export interface TieredSignal {
    signal: OrderSignal;
    tier: StrategyTier;
    totalScore: number;
    suggestedRiskPercent: number;
    entry: number;
    stopLoss: number;
    tp1: number;
    tp2: number;
    tp3: number;
    lotSize: number;
    positionSplit: string;
    scoreBreakdown: string[];
    missingFactors: string[];
    keyReason: string;
    upgradeConditions: string[];
}

export class QuantEnginePipeline {
    private smtEngine = new SMTEngine(48);
    private statArbEngine = new StatArbEngine(120, 2.0);
    private velocityEngine = new VelocityLagEngine(4, 15.0);
    private indexSmtEngine = new IndexSMTEngine(60);
    private indexStatArbEngine = new IndexStatArbEngine(400, 2.5, 4.0);
    private indexLeadLagEngine = new IndexLeadLagEngine(10, 3);

    public processLiveExecution(
        strategyId: 'SMT' | 'STAT_ARB' | 'VELOCITY' | 'INDEX_SMT' | 'INDEX_STAT_ARB' | 'INDEX_LEAD_LAG',
        dataA: MarketSeries,
        dataB: MarketSeries,
        dataC: MarketSeries,
        newsSentimentScore: number,
        accountBalance: number
    ): TieredSignal | null {
        
        let score: Partial<WeightedScore> = { grade: 'NO TRADE' };
        let signalDirection: OrderSignal = 'BUY';
        let entryPrice = 0;
        let stopLossPrice = 0;

        const arraysA = QuantMath.extractArrays(dataA);
        const arraysB = QuantMath.extractArrays(dataB);
        const tA = arraysA.closes.length - 1;
        const tB = arraysB.closes.length - 1;

        switch (strategyId) {
            case 'SMT':
                score = this.smtEngine.evaluate(dataA, dataB, dataC, newsSentimentScore);
                signalDirection = 'BUY';
                const arraysC = QuantMath.extractArrays(dataC);
                entryPrice = arraysC.closes[arraysC.closes.length - 1];
                stopLossPrice = entryPrice - 0.00150; 
                break;

            case 'STAT_ARB':
                score = this.statArbEngine.evaluate(dataA, dataB, newsSentimentScore);
                const currentRatio = arraysA.closes[tA] / arraysB.closes[tB];
                const historicalRatios = [];
                for(let i = Math.max(0, tA - 120); i <= tA; i++) historicalRatios.push(arraysA.closes[i] / arraysB.closes[i]);
                const ratioMean = QuantMath.calculateMean(historicalRatios);
                
                signalDirection = currentRatio > ratioMean ? 'SELL' : 'BUY';
                entryPrice = arraysA.closes[tA];
                stopLossPrice = signalDirection === 'SELL' ? entryPrice + 0.00200 : entryPrice - 0.00200;
                break;

            case 'VELOCITY':
                score = this.velocityEngine.evaluate(dataA, dataB, newsSentimentScore);
                const euVel = ((arraysA.closes[tA] - arraysA.closes[Math.max(0, tA - 4)]) / arraysA.closes[Math.max(0, tA - 4)]) * 10000;
                
                signalDirection = euVel < 0 ? 'SELL' : 'BUY';
                entryPrice = arraysA.closes[tA];
                stopLossPrice = signalDirection === 'SELL' ? entryPrice + 0.00100 : entryPrice - 0.00100;
                break;

            case 'INDEX_SMT':
                score = this.indexSmtEngine.evaluate(dataA, dataB, newsSentimentScore);
                signalDirection = 'SELL';
                entryPrice = arraysB.closes[tB];
                stopLossPrice = entryPrice + 20;
                break;

            case 'INDEX_STAT_ARB':
                score = this.indexStatArbEngine.evaluate(dataA, dataB, newsSentimentScore);
                signalDirection = 'BUY';
                entryPrice = arraysA.closes[tA];
                stopLossPrice = entryPrice - 30;
                break;

            case 'INDEX_LEAD_LAG':
                score = this.indexLeadLagEngine.evaluate(dataA, dataB, newsSentimentScore);
                signalDirection = 'BUY';
                entryPrice = arraysB.closes[tB];
                stopLossPrice = entryPrice - 40;
                break;
        }

        if (score.grade === 'NO TRADE') return null;

        return this.buildTieredSignal(signalDirection, entryPrice, stopLossPrice, score as WeightedScore, accountBalance);
    }

    private buildTieredSignal(
        signal: OrderSignal,
        entry: number,
        stopLoss: number,
        weightedScore: WeightedScore,
        accountBalance: number
    ): TieredSignal {
        const risk = Math.abs(entry - stopLoss);

        const tp1 = signal === 'BUY' ? parseFloat((entry + risk * 1.5).toFixed(5)) : parseFloat((entry - risk * 1.5).toFixed(5));
        const tp2 = signal === 'BUY' ? parseFloat((entry + risk * 2.0).toFixed(5)) : parseFloat((entry - risk * 2.0).toFixed(5));
        const tp3 = signal === 'BUY' ? parseFloat((entry + risk * 3.0).toFixed(5)) : parseFloat((entry - risk * 3.0).toFixed(5));

        const riskAmount = accountBalance * ((weightedScore.suggestedRiskPercent || 1) / 100);
        const pipRisk = Math.max(1, Math.abs(entry - stopLoss) * 10000);
        
        const lotSize = parseFloat((riskAmount / (pipRisk * 10)).toFixed(2)) || 0.01;

        const positionSplit =
            (weightedScore as any).grade === 'A+' ? '3 positions: 40% TP1, 40% TP2, 20% TP3' :
            (weightedScore as any).grade === 'A'  ? '2 positions: 50% TP1, 50% TP2' :
            (weightedScore as any).grade === 'B+' ? '2 positions: 60% TP1, 40% TP2' :
            '1 position: 100% TP1 only';

        const missingFactors: string[] = [];
        if ((weightedScore.smcStructure || 0) < 25) missingFactors.push('Stronger SMC structure needed');
        if ((weightedScore.volumeProfile || 0) < 15) missingFactors.push('Volume confluence not confirmed');
        if ((weightedScore.globalTrend || 0) < 15)   missingFactors.push('Correlation alignment weak');
        if ((weightedScore.newsSentiment || 0) < 15) missingFactors.push('News risk present');
        if ((weightedScore.sessionTiming || 0) < 8)  missingFactors.push('Off-peak session');

        const upgradeConditions: string[] = [];
        if ((weightedScore as any).grade === 'B' || (weightedScore as any).grade === 'B+') {
            if ((weightedScore.volumeProfile || 0) < 15) upgradeConditions.push('Wait for price to reach POC/HVN');
            if ((weightedScore.sessionTiming || 0) < 8)  upgradeConditions.push('Wait for London or NY open');
            if ((weightedScore.newsSentiment || 0) < 15) upgradeConditions.push('Wait for news event to pass');
        }

        return {
            signal,
            tier: (weightedScore as any).grade || 'NO TRADE',
            totalScore: weightedScore.totalScore || 0,
            suggestedRiskPercent: (weightedScore as any).suggestedRiskPercent || 0,
            entry,
            stopLoss,
            tp1,
            tp2,
            tp3,
            lotSize,
            positionSplit,
            scoreBreakdown: weightedScore.breakdown || [],
            missingFactors,
            keyReason: (weightedScore.breakdown || [])[0] || 'Structure based entry',
            upgradeConditions
        };
    }
}
