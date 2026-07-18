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

export const calculateMarkovRegime = (
    candles: OHLC[], 
    period: number = 20,
    depth?: { bids: [number, number][], asks: [number, number][] } | null
): MarkovRegimeResult | null => {
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

    const currentState = adaptiveStates[adaptiveStates.length - 1];

    // --- REAL-TIME L2 ORDERBOOK DEPT SKEWING FOR FOREX PAIRS ---
    if (depth && (depth.bids?.length || depth.asks?.length)) {
        const bids = depth.bids || [];
        const asks = depth.asks || [];
        const totalBids = bids.reduce((sum, b) => sum + (b[1] || 0), 0);
        const totalAsks = asks.reduce((sum, a) => sum + (a[1] || 0), 0);
        const totalL2Depth = totalBids + totalAsks;
        if (totalL2Depth > 0) {
            const l2Imbalance = totalBids / (totalAsks || 1);
            const skewFactor = Math.min(0.15, Math.abs(Math.log(l2Imbalance)) * 0.08); // Precision Forex weighting
            
            if (l2Imbalance > 1.1) {
                // Bull transitions are more likely; bear transitions are less likely
                transitionMatrix.BULL.BULL = Math.min(0.95, transitionMatrix.BULL.BULL + skewFactor);
                transitionMatrix.BEAR.BULL = Math.min(0.95, transitionMatrix.BEAR.BULL + skewFactor);
                transitionMatrix.SIDEWAYS.BULL = Math.min(0.95, transitionMatrix.SIDEWAYS.BULL + skewFactor);
                
                transitionMatrix.BULL.BEAR = Math.max(0.01, transitionMatrix.BULL.BEAR - skewFactor);
                transitionMatrix.BEAR.BEAR = Math.max(0.01, transitionMatrix.BEAR.BEAR - skewFactor);
                transitionMatrix.SIDEWAYS.BEAR = Math.max(0.01, transitionMatrix.SIDEWAYS.BEAR - skewFactor);
            } else if (l2Imbalance < 0.9) {
                // Bear transitions are more likely; bull transitions are less likely
                transitionMatrix.BULL.BEAR = Math.min(0.95, transitionMatrix.BULL.BEAR + skewFactor);
                transitionMatrix.BEAR.BEAR = Math.min(0.95, transitionMatrix.BEAR.BEAR + skewFactor);
                transitionMatrix.SIDEWAYS.BEAR = Math.min(0.95, transitionMatrix.SIDEWAYS.BEAR + skewFactor);
                
                transitionMatrix.BULL.BULL = Math.max(0.01, transitionMatrix.BULL.BULL - skewFactor);
                transitionMatrix.BEAR.BULL = Math.max(0.01, transitionMatrix.BEAR.BULL - skewFactor);
                transitionMatrix.SIDEWAYS.BULL = Math.max(0.01, transitionMatrix.SIDEWAYS.BULL - skewFactor);
            }
            
            // Re-normalize rows to ensure transition probabilities sum to 1
            const states: MarkovState[] = ['BULL', 'BEAR', 'SIDEWAYS'];
            for (const rowState of states) {
                const row = transitionMatrix[rowState];
                const sum = row.BULL + row.BEAR + row.SIDEWAYS;
                if (sum > 0) {
                    row.BULL = row.BULL / sum;
                    row.BEAR = row.BEAR / sum;
                    row.SIDEWAYS = row.SIDEWAYS / sum;
                }
            }
        }
    }

    // 3. Stickiness (Persistence)
    const persistence = {
        BULL: transitionMatrix.BULL.BULL,
        BEAR: transitionMatrix.BEAR.BEAR,
        SIDEWAYS: transitionMatrix.SIDEWAYS.SIDEWAYS
    };

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
