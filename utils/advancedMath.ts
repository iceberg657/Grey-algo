import { KalmanFilter } from './kalmanFilter';

export class GaussianMixtureModel {
    private k: number;
    private means: number[];
    private variances: number[];
    private weights: number[];

    constructor(k: number = 2) {
        this.k = k;
        this.means = [0, 0];
        this.variances = [1, 1];
        this.weights = [0.5, 0.5];
    }

    // Simplified EM algorithm for 1D Data clustering (Regime Detection)
    public fit(data: number[], iterations: number = 10) {
        if (data.length < this.k) return;
        
        // Initial defaults based on data
        const min = Math.min(...data);
        const max = Math.max(...data);
        this.means = [min + (max-min)*0.25, max - (max-min)*0.25];
        const initialVar = Math.pow((max - min)/4, 2);
        this.variances = [initialVar, initialVar];

        for (let iter = 0; iter < iterations; iter++) {
            // E-Step
            const responsibilities: number[][] = data.map(() => [0, 0]);
            
            for (let i = 0; i < data.length; i++) {
                const x = data[i];
                let totalProb = 0;
                const probs = [];
                for (let j = 0; j < this.k; j++) {
                    const prob = this.weights[j] * this.gaussianPdf(x, this.means[j], Math.sqrt(this.variances[j]));
                    probs.push(prob);
                    totalProb += prob;
                }
                if (totalProb > 0) {
                    for (let j = 0; j < this.k; j++) {
                        responsibilities[i][j] = probs[j] / totalProb;
                    }
                }
            }

            // M-Step
            const N = data.length;
            for (let j = 0; j < this.k; j++) {
                let N_k = 0;
                for (let i = 0; i < N; i++) N_k += responsibilities[i][j];
                
                if (N_k > 0) {
                    this.weights[j] = N_k / N;
                    
                    let newMean = 0;
                    for (let i = 0; i < N; i++) newMean += responsibilities[i][j] * data[i];
                    this.means[j] = newMean / N_k;
                    
                    let newVar = 0;
                    for (let i = 0; i < N; i++) newVar += responsibilities[i][j] * Math.pow(data[i] - this.means[j], 2);
                    this.variances[j] = Math.max(newVar / N_k, 1e-6); // Avoid zero variance
                }
            }
        }
    }

    public predict(x: number): number {
        // Return index of most likely cluster
        let maxProb = -1;
        let bestCluster = 0;
        for (let j = 0; j < this.k; j++) {
            const prob = this.weights[j] * this.gaussianPdf(x, this.means[j], Math.sqrt(this.variances[j]));
            if (prob > maxProb) {
                maxProb = prob;
                bestCluster = j;
            }
        }
        return bestCluster; // 0 or 1
    }

    public getMeans() {
        return this.means;
    }

    private gaussianPdf(x: number, mean: number, stdDev: number): number {
        return (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mean) / stdDev, 2));
    }
}

export class LSTMMath {
    // Ultra-simplified mock of a Recurrent cell for tracking continuous momentum state across sequential steps.
    private hiddenState: number = 0;
    private cellState: number = 0;
    
    // Abstract weights for simplistic tick momentum representation
    private w_f = 0.5; private u_f = 0.1; private b_f = 0.1;
    private w_i = 0.5; private u_i = 0.1; private b_i = 0.1;
    private w_c = 0.5; private u_c = 0.1; private b_c = 0.1;
    private w_o = 0.5; private u_o = 0.1; private b_o = 0.1;

    public step(input: number): number {
        const h_prev = this.hiddenState;
        
        // Forget Gate
        const f_t = this.sigmoid(this.w_f * input + this.u_f * h_prev + this.b_f);
        // Input Gate
        const i_t = this.sigmoid(this.w_i * input + this.u_i * h_prev + this.b_i);
        // Cell Candidate
        const c_tilde = Math.tanh(this.w_c * input + this.u_c * h_prev + this.b_c);
        
        // Update Cell
        this.cellState = f_t * this.cellState + i_t * c_tilde;
        
        // Output Gate
        const o_t = this.sigmoid(this.w_o * input + this.u_o * h_prev + this.b_o);
        
        // Hidden State / Output
        this.hiddenState = o_t * Math.tanh(this.cellState);
        return this.hiddenState;
    }

    private sigmoid(x: number) {
        return 1 / (1 + Math.exp(-x));
    }
}

export class MarkovDecisionProcess {
    // State: [Trend, Volatility]
    // Action: [Hold, Buy, Sell]
    // Simple Q-learning formulation mock for immediate decision rewards
    public evaluatePolicy(stateSignal: number, zScore: number): 'BUY' | 'SELL' | 'HOLD' | 'REDUCE' {
        if (Math.abs(zScore) > 2.5) {
            // Reward function heavily penalizes taking trades in extreme tail events
            return 'REDUCE'; 
        }

        if (stateSignal > 0.6) return 'BUY';
        if (stateSignal < -0.6) return 'SELL';
        return 'HOLD';
    }
}

export class MSGARCH {
    // Markov-Switching GARCH 
    // Dynamically switches between two volatility regimes
    constructor() {}
    
    public predictVolatility(returns: number[], currentRegimeMode: 0 | 1): number {
        if (returns.length < 2) return 0.001;
        
        // 0 = Low Volatility Regime, 1 = High Volatility Regime
        const omega = [0.00001, 0.0001];
        const alpha = [0.05, 0.15];
        const beta = [0.90, 0.70];

        let garchVar = Math.pow(returns[0], 2);
        for (let i = 1; i < returns.length; i++) {
            garchVar = omega[currentRegimeMode] + alpha[currentRegimeMode] * Math.pow(returns[i-1], 2) + beta[currentRegimeMode] * garchVar;
        }
        
        return Math.sqrt(garchVar);
    }
}
