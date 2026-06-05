import { LiquidityHeatmap } from './quantEngine';
import { MarkovRegimeResult } from './markovEngine';
import { QuantMathematics } from './quantEngine';

export interface LiquidityPrediction {
    nextTarget: 'BSL' | 'SSL' | 'NONE';
    probability: number;
    imminentSweep: boolean;
    reason: string[];
}

export const predictNextLiquiditySweep = (
    heatmap: LiquidityHeatmap,
    markovRegime: MarkovRegimeResult | null,
    quantMath: QuantMathematics,
    currentPrice: number,
    trend: string
): LiquidityPrediction => {
    let bslProb = 50;
    let sslProb = 50;
    let reason: string[] = [];
    
    // 1. proximity mapping
    if (heatmap.nearestBSL && heatmap.nearestSSL) {
        if (heatmap.nearestBSL.distanceFromPrice < heatmap.nearestSSL.distanceFromPrice) {
            bslProb += 15;
            sslProb -= 15;
            reason.push('BSL is closer to current price.');
        } else {
            sslProb += 15;
            bslProb -= 15;
            reason.push('SSL is closer to current price.');
        }
    }
    
    // 2. Trend & Regime mapping
    if (trend === 'BULLISH' || (markovRegime && markovRegime.signal === 'BUY')) {
        bslProb += 20;
        sslProb -= 20;
        reason.push('Bullish momentum pushes probability towards BSL sweep.');
    } else if (trend === 'BEARISH' || (markovRegime && markovRegime.signal === 'SELL')) {
        sslProb += 20;
        bslProb -= 20;
        reason.push('Bearish momentum pushes probability towards SSL sweep.');
    }
    
    // 3. Fakeout / Reversal mapping (If fakeout prob is high, it attacks the opposite)
    if (quantMath.fakeoutProbability > 0.6) {
        if (bslProb > sslProb) {
            reason.push('High fakeout probability: BSL target may be inducement, shifting probability to SSL.');
            bslProb -= 25;
            sslProb += 25;
        } else {
            reason.push('High fakeout probability: SSL target may be inducement, shifting probability to BSL.');
            sslProb -= 25;
            bslProb += 25;
        }
    }
    
    // 4. Recency (If one was just swept, what next?)
    if (heatmap.priceJustSweptSSL) {
        bslProb += 10;
        sslProb -= 10;
        reason.push('SSL just swept, generating liquidity to fuel BSL run.');
    } else if (heatmap.priceJustSweptBSL) {
        sslProb += 10;
        bslProb -= 10;
        reason.push('BSL just swept, generating liquidity to fuel SSL run.');
    }
    
    let nextTarget: 'BSL' | 'SSL' | 'NONE' = 'NONE';
    let probability = 50;
    
    if (bslProb > 65) {
        nextTarget = 'BSL';
        probability = bslProb;
    } else if (sslProb > 65) {
        nextTarget = 'SSL';
        probability = sslProb;
    }
    
    const imminentSweep = probability >= 75 && quantMath.statisticalNoiseRatio < 0.6;
    
    return {
        nextTarget,
        probability: Math.min(99, Math.max(1, probability)),
        imminentSweep,
        reason
    };
};
