import { MathEngine } from './mathEngine';

export type RegimeType = 'TREND_BULLISH' | 'TREND_BEARISH' | 'MEAN_REVERSION' | 'CHAOS';

interface NeuralInput {
    priceVolatility: number;
    volumeImbalance: number; // +1 buyer dominated, -1 seller dominated
    momentum: number; // RSI normalized or similar
    timeOfDayWeight: number;
}

export interface NeuralAnalysis {
    classifiedRegime: RegimeType;
    confidence: number;
    orderflowDirection: 'BUY' | 'SELL' | 'NEUTRAL';
    expectedMove: number;
    anomalyDetected: boolean;
}

/**
 * Lightweight Matrix Operations
 */
class MatrixOps {
    static dotProduct(vecA: number[], vecB: number[]): number {
        if (vecA.length !== vecB.length) throw new Error("Vector length mismatch");
        return vecA.reduce((sum, a, i) => sum + (a * vecB[i]), 0);
    }
    
    static relu(x: number): number {
        return Math.max(0, x);
    }

    static sigmoid(x: number): number {
        return 1 / (1 + Math.exp(-x));
    }
    
    static tanh(x: number): number {
        return Math.tanh(x);
    }
}

export class NeuralEngine {
    // Pre-trained minimal weights for rapid in-browser inference
    private static regimeWeights = {
        bullish: [0.2, 0.5, 0.4, 0.1],
        bearish: [0.2, -0.5, -0.4, 0.1],
        reversion: [0.6, 0.0, 0.0, 0.2]
    };

    /**
     * Infer the market regime based on normalized inputs
     */
    static inferRegime(inputs: NeuralInput): { regime: RegimeType, confidence: number } {
        const inputVec = [inputs.priceVolatility, inputs.volumeImbalance, inputs.momentum, inputs.timeOfDayWeight];
        
        const bullishScore = MatrixOps.tanh(MatrixOps.dotProduct(inputVec, this.regimeWeights.bullish));
        const bearishScore = MatrixOps.tanh(MatrixOps.dotProduct(inputVec, this.regimeWeights.bearish));
        const reversionScore = MatrixOps.relu(MatrixOps.dotProduct(inputVec, this.regimeWeights.reversion));
        
        let maxScore = Math.max(bullishScore, bearishScore, reversionScore);
        
        let regime: RegimeType = 'CHAOS';
        let confidence = Math.abs(maxScore);
        
        // High volatility implies chaos or strong trend. If directional scores are low but volatility is high:
        if (inputs.priceVolatility > 0.8 && confidence < 0.3) {
            regime = 'CHAOS';
            confidence = inputs.priceVolatility;
        } else if (maxScore === bullishScore) {
            regime = 'TREND_BULLISH';
        } else if (maxScore === bearishScore) {
            regime = 'TREND_BEARISH';
        } else if (maxScore === reversionScore) {
            regime = 'MEAN_REVERSION';
        }

        return {
            regime,
            confidence: Math.min(1.0, confidence)
        };
    }

    /**
     * Classifies orderflow context
     */
    static classifyOrderflow(volumeImbalance: number, recentReturns: number[]): { direction: 'BUY' | 'SELL' | 'NEUTRAL', anomaly: boolean } {
        // Detect if recent moves are anomalous using MathEngine
        let isAnomaly = false;
        if (recentReturns.length >= 5) {
            const currentReturn = recentReturns[recentReturns.length - 1];
            const history = recentReturns.slice(0, -1);
            const anomalyData = MathEngine.detectAnomaly(currentReturn, history, 2.5);
            isAnomaly = anomalyData.isAnomaly;
        }
        
        let direction: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';
        if (Math.abs(volumeImbalance) > 0.4) {
            direction = volumeImbalance > 0 ? 'BUY' : 'SELL';
        }

        return {
            direction,
            anomaly: isAnomaly
        };
    }

    /**
     * Full execution cycle for Neural Reasoning
     */
    static runReasoningCycle(
        returnsHistory: number[],
        normalizedMomentum: number, // -1 to 1
        volumeImbalance: number,    // -1 to 1
        timeOfDayWeight: number     // 0 to 1
    ): NeuralAnalysis {
        // 1. Math Analysis
        const currentReturn = returnsHistory[returnsHistory.length - 1] || 0;
        const history = returnsHistory.slice(0, -1);
        const anomalyData = MathEngine.detectAnomaly(currentReturn, history);
        
        // Normalize Volatility
        const recentStdDev = MathEngine.calculateStdDev(returnsHistory.slice(-10));
        const normVol = Math.min(1.0, recentStdDev / 0.05); // pseudo normalized

        // 2. Neural Inputs
        const inputs: NeuralInput = {
            priceVolatility: normVol,
            volumeImbalance: volumeImbalance,
            momentum: normalizedMomentum,
            timeOfDayWeight: timeOfDayWeight
        };

        // 3. Inference
        const regimeResult = this.inferRegime(inputs);
        const orderflowClass = this.classifyOrderflow(volumeImbalance, returnsHistory);

        // Calculate expected move magnitude using EWMA/GARCH combined
        const expectedMove = (anomalyData.ewma + anomalyData.garchEquivalent) / 2;

        return {
            classifiedRegime: regimeResult.regime,
            confidence: regimeResult.confidence,
            orderflowDirection: orderflowClass.direction,
            expectedMove: expectedMove,
            anomalyDetected: orderflowClass.anomaly || anomalyData.isAnomaly
        };
    }
}
