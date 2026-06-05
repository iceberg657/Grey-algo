export interface VolatilityProfile {
    ewma: number;
    garchEquivalent: number;
    anomalyScore: number;
    zScore: number;
    isAnomaly: boolean;
}

export class MathEngine {
    /**
     * Calculate Standard Deviation
     */
    static calculateStdDev(returns: number[]): number {
        if (returns.length < 2) return 0;
        const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
        const squaredDiffs = returns.map(r => Math.pow(r - mean, 2));
        const variance = squaredDiffs.reduce((a, b) => a + b, 0) / (returns.length - 1);
        return Math.sqrt(variance);
    }

    /**
     * Calculate Z-Score
     */
    static calculateZScore(currentValue: number, memory: number[]): number {
        if (memory.length < 2) return 0;
        const mean = memory.reduce((a, b) => a + b, 0) / memory.length;
        const stdDev = this.calculateStdDev(memory);
        if (stdDev === 0) return 0;
        return (currentValue - mean) / stdDev;
    }

    /**
     * Exponentially Weighted Moving Average (EWMA) for Volatility
     * Uses lambda = 0.94 which is standard in RiskMetrics for daily data
     */
    static calculateEWMAVolatility(returns: number[], lambda = 0.94): number {
        if (returns.length === 0) return 0;
        
        // Initialize with standard variance
        let ewmaVariance = Math.pow(this.calculateStdDev(returns), 2);
        
        // Iteratively update variance
        for (let i = 1; i < returns.length; i++) {
            ewmaVariance = lambda * ewmaVariance + (1 - lambda) * Math.pow(returns[i], 2);
        }
        
        return Math.sqrt(ewmaVariance);
    }

    /**
     * Approximated GARCH(1,1) Volatility
     * Typical weights: omega=small, alpha=0.05 (shock), beta=0.90 (persistence)
     */
    static calculateGARCHVolatility(returns: number[], alpha = 0.05, beta = 0.90): number {
        if (returns.length === 0) return 0;
        
        const longTermVariance = Math.pow(this.calculateStdDev(returns), 2);
        const omega = longTermVariance * (1 - alpha - beta);
        
        let garchVariance = longTermVariance;
        
        for (let i = 1; i < returns.length; i++) {
            garchVariance = omega + alpha * Math.pow(returns[i - 1], 2) + beta * garchVariance;
        }
        
        return Math.sqrt(garchVariance);
    }

    /**
     * Detect anomalies based on price returns
     */
    static detectAnomaly(currentReturn: number, returnHistory: number[], zScoreThreshold: number = 2.5): VolatilityProfile {
        const zScore = this.calculateZScore(currentReturn, returnHistory);
        const ewma = this.calculateEWMAVolatility(returnHistory);
        const garch = this.calculateGARCHVolatility(returnHistory);
        
        // Define anomaly if deviation exceeds threshold
        const isAnomaly = Math.abs(zScore) >= zScoreThreshold;
        
        // Scale anomaly based on how far past threshold it is
        const anomalyScore = isAnomaly ? Math.min(100, Math.abs(zScore) * 10) : 0;

        return {
            ewma,
            garchEquivalent: garch,
            anomalyScore,
            zScore,
            isAnomaly
        };
    }

    /**
     * Simple Normal Distribution CDF
     */
    static normalCDF(x: number, mean: number, stdDev: number): number {
        return 0.5 * (1 + this.erf((x - mean) / (stdDev * Math.sqrt(2))));
    }

    /**
     * Error function approximation
     */
    private static erf(x: number): number {
        const sign = (x >= 0) ? 1 : -1;
        x = Math.abs(x);
        
        const a1 =  0.254829592;
        const a2 = -0.284496736;
        const a3 =  1.421413741;
        const a4 = -1.453152027;
        const a5 =  1.061405429;
        const p  =  0.3275911;

        const t = 1.0 / (1.0 + p * x);
        const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

        return sign * y;
    }
}
