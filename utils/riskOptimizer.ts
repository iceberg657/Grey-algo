import type { WeightedScore } from './quantEngine';

export interface RiskOptimization {
    suggestedRiskPercentage: number; // dynamically scaled Kelly Criterion
    maxDrawdownTolerance: number;
    splitOrders: boolean; // whether to split entries
    stopLossBufferMultiplier: number; // ATR buffer
    approval: boolean; // boolean if risk-to-reward metrics fit hedge fund standards
    reason: string;
}

export const executeRiskOptimization = (
    winRateEstimate: number, // between 0 and 1
    rewardToRiskRatio: number,
    baseAccountRisk: number = 1.0, // 1% default
    weightedScore: WeightedScore,
    noiseRatio: number
): RiskOptimization => {
    
    // 1. Calculate Kelly Criterion
    // Kelly % = W - [(1 - W) / R]
    // where W = win rate, R = Reward/Risk ratio
    let kellyPct = 0;
    if (rewardToRiskRatio > 0) {
        kellyPct = winRateEstimate - ((1 - winRateEstimate) / rewardToRiskRatio);
    }
    
    // Half-Kelly is used in institutional trading to limit drawdown
    let halfKelly = kellyPct / 2;
    // ensure within boundaries [0, max risk]
    halfKelly = Math.max(0, Math.min(halfKelly, 0.05)); // hard cap at 5%
    
    // Convert to percentage (0.01 = 1%)
    let dynamicRisk = halfKelly * 100;
    
    // 2. Adjust using Weighted Score
    if (weightedScore.totalScore < 50) {
        dynamicRisk = 0; // Rejected by quant engine
    } else if (weightedScore.totalScore < 70) {
        dynamicRisk *= 0.5; // Scale down risk on moderate conviction
    }
    
    // If halfKelly risk drops below 0.1%, it's not worth trading
    let approval = dynamicRisk >= 0.1;
    let reason = "Optimal Risk Configured";
    
    if (!approval) {
        reason = `Statistical expectation negative or marginal (Kelly: ${dynamicRisk.toFixed(2)}%). Vetoed.`;
    }
    
    // 3. Stop Loss Buffer based on Noise Ratio
    let stopLossBufferMultiplier = 1.5;
    if (noiseRatio > 0.7) {
        stopLossBufferMultiplier = 2.5; // widen SL if noise is high
        dynamicRisk *= 0.5; // lower position size when widening SL
    } else if (noiseRatio < 0.3) {
        stopLossBufferMultiplier = 1.2; // tighter SL on clean trends
    }

    // Determine if splitting is efficient
    const splitOrders = dynamicRisk >= 0.5 && rewardToRiskRatio >= 2.0;
    
    // Hard cap standard risk
    const finalRiskPercentage = Math.min(baseAccountRisk * 2, Math.max(0.1, dynamicRisk));

    return {
        suggestedRiskPercentage: approval ? finalRiskPercentage : 0,
        maxDrawdownTolerance: finalRiskPercentage * stopLossBufferMultiplier * 1.5,
        splitOrders,
        stopLossBufferMultiplier,
        approval,
        reason
    };
};
