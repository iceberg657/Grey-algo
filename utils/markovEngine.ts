import type { OHLC } from './quantEngine';

// Represents the three market states defined by quant methods
export type MarkovState = 'BULL' | 'BEAR' | 'SIDEWAYS';

export interface TransitionMatrix {
    BULL: { BULL: number, BEAR: number, SIDEWAYS: number };
    BEAR: { BULL: number, BEAR: number, SIDEWAYS: number };
    SIDEWAYS: { BULL: number, BEAR: number, SIDEWAYS: number };
}

export interface MarkovRegimeResult {
    currentState: MarkovState;
    transitionMatrix: TransitionMatrix;
    stationaryDistribution: Record<MarkovState, number>;
    currentProbabilities: Record<MarkovState, number>;
    persistence: Record<MarkovState, number>; 
    signal: 'BUY' | 'SELL' | 'NEUTRAL';
    confidence: number;
}

export const calculateMarkovRegime = (candles: OHLC[], period: number = 20): MarkovRegimeResult | null => {
    if (!candles || candles.length < period * 2) return null;

    const returns: number[] = [];
    for (let i = period; i < candles.length; i++) {
        const currentClose = candles[i].close;
        const pastClose = candles[i - period].close;
        returns.push(((currentClose - pastClose) / pastClose) * 100);
    }
    
    const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length);
    
    // Recalculate states adaptively (Bull > +1 StdDev, Bear < -1 StdDev)
    // In the hedge fund quant model, states are strictly numerical based on trailing performance.
    const adaptiveStates: MarkovState[] = returns.map(r => 
        r > meanReturn + stdDev ? 'BULL' : 
        r < meanReturn - stdDev ? 'BEAR' : 'SIDEWAYS'
    );

    // 2. Build Transition Matrix
    const matrix = {
        BULL: { BULL: 0, BEAR: 0, SIDEWAYS: 0, total: 0 },
        BEAR: { BULL: 0, BEAR: 0, SIDEWAYS: 0, total: 0 },
        SIDEWAYS: { BULL: 0, BEAR: 0, SIDEWAYS: 0, total: 0 },
    };

    for (let i = 0; i < adaptiveStates.length - 1; i++) {
        const current = adaptiveStates[i];
        const next = adaptiveStates[i + 1];
        matrix[current][next]++;
        matrix[current].total++;
    }

    const transitionMatrix: TransitionMatrix = {
        BULL: {
            BULL: matrix.BULL.total ? matrix.BULL.BULL / matrix.BULL.total : 0,
            BEAR: matrix.BULL.total ? matrix.BULL.BEAR / matrix.BULL.total : 0,
            SIDEWAYS: matrix.BULL.total ? matrix.BULL.SIDEWAYS / matrix.BULL.total : 0,
        },
        BEAR: {
            BULL: matrix.BEAR.total ? matrix.BEAR.BULL / matrix.BEAR.total : 0,
            BEAR: matrix.BEAR.total ? matrix.BEAR.BEAR / matrix.BEAR.total : 0,
            SIDEWAYS: matrix.BEAR.total ? matrix.BEAR.SIDEWAYS / matrix.BEAR.total : 0,
        },
        SIDEWAYS: {
            BULL: matrix.SIDEWAYS.total ? matrix.SIDEWAYS.BULL / matrix.SIDEWAYS.total : 0,
            BEAR: matrix.SIDEWAYS.total ? matrix.SIDEWAYS.BEAR / matrix.SIDEWAYS.total : 0,
            SIDEWAYS: matrix.SIDEWAYS.total ? matrix.SIDEWAYS.SIDEWAYS / matrix.SIDEWAYS.total : 0,
        }
    };

    // 3. Stickiness (Persistence)
    const persistence = {
        BULL: transitionMatrix.BULL.BULL,
        BEAR: transitionMatrix.BEAR.BEAR,
        SIDEWAYS: transitionMatrix.SIDEWAYS.SIDEWAYS
    };

    const currentState = adaptiveStates[adaptiveStates.length - 1];

    // 4. Current Probabilities
    const currentProbabilities = {
        BULL: transitionMatrix[currentState].BULL,
        BEAR: transitionMatrix[currentState].BEAR,
        SIDEWAYS: transitionMatrix[currentState].SIDEWAYS
    };

    // 5. Stationary Distribution 
    const stationaryDistribution = {
        BULL: matrix.BULL.total / adaptiveStates.length,
        BEAR: matrix.BEAR.total / adaptiveStates.length,
        SIDEWAYS: matrix.SIDEWAYS.total / adaptiveStates.length
    };

    // 6. Signal Generation
    let signal: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';
    let confidence = 0;

    if (currentState === 'SIDEWAYS') {
        if (currentProbabilities.BULL > currentProbabilities.BEAR && currentProbabilities.BULL > 0.45) {
            signal = 'BUY';
            confidence = currentProbabilities.BULL * 100;
        } else if (currentProbabilities.BEAR > currentProbabilities.BULL && currentProbabilities.BEAR > 0.45) {
            signal = 'SELL';
            confidence = currentProbabilities.BEAR * 100;
        }
    } 
    else if (currentState === 'BULL') {
        if (persistence.BULL >= 0.5) {
            signal = 'BUY';
            confidence = persistence.BULL * 100;
        } else if (currentProbabilities.BEAR > persistence.BULL) {
            signal = 'SELL';
            confidence = currentProbabilities.BEAR * 100;
        }
    } 
    else if (currentState === 'BEAR') {
        if (persistence.BEAR >= 0.5) {
            signal = 'SELL';
            confidence = persistence.BEAR * 100;
        } else if (currentProbabilities.BULL > persistence.BEAR) {
            signal = 'BUY';
            confidence = currentProbabilities.BULL * 100;
        }
    }

    return {
        currentState,
        transitionMatrix,
        stationaryDistribution,
        currentProbabilities,
        persistence,
        signal,
        confidence
    };
};
