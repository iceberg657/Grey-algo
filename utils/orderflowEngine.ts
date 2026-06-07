import type { OHLC } from './quantEngine';

export interface OrderflowMetrics {
    buyingPressure: number;
    sellingPressure: number;
    imbalanceRatio: number; // >1 means buyer dominated, <1 means seller dominated
    institutionalFootprint: 'STRONG_BUY' | 'WEAK_BUY' | 'NEUTRAL' | 'WEAK_SELL' | 'STRONG_SELL';
    exhaustionWarning: boolean;
}

export const analyzeOrderflow = (candles: OHLC[]): OrderflowMetrics => {
    if (!candles || candles.length < 5) {
        return {
            buyingPressure: 0,
            sellingPressure: 0,
            imbalanceRatio: 1,
            institutionalFootprint: 'NEUTRAL',
            exhaustionWarning: false
        };
    }

    // Analyze the most recent window for micro-decisions
    const recentCandles = candles.slice(-5);
    
    let totalBuyingPressure = 0;
    let totalSellingPressure = 0;
    
    recentCandles.forEach(c => {
        // Upper wick = selling pressure
        const upperWick = c.high - Math.max(c.open, c.close);
        // Lower wick = buying pressure
        const lowerWick = Math.min(c.open, c.close) - c.low;
        // Body
        const body = Math.abs(c.close - c.open);
        
        if (c.close > c.open) {
            totalBuyingPressure += body + lowerWick;
            totalSellingPressure += upperWick;
        } else {
            totalSellingPressure += body + upperWick;
            totalBuyingPressure += lowerWick;
        }
    });

    // Avoid division by zero
    totalBuyingPressure = Math.max(totalBuyingPressure, 0.000001);
    totalSellingPressure = Math.max(totalSellingPressure, 0.000001);
    
    const imbalanceRatio = totalBuyingPressure / totalSellingPressure;
    
    let institutionalFootprint: 'STRONG_BUY' | 'WEAK_BUY' | 'NEUTRAL' | 'WEAK_SELL' | 'STRONG_SELL' = 'NEUTRAL';
    if (imbalanceRatio > 2.5) institutionalFootprint = 'STRONG_BUY';
    else if (imbalanceRatio > 1.5) institutionalFootprint = 'WEAK_BUY';
    else if (imbalanceRatio < 0.4) institutionalFootprint = 'STRONG_SELL';
    else if (imbalanceRatio < 0.7) institutionalFootprint = 'WEAK_SELL';
    
    // Exhaustion logic: price moving fast but wicks are getting longer
    const lastCandle = recentCandles[recentCandles.length - 1];
    const prevCandle = recentCandles[recentCandles.length - 2];
    
    let exhaustionWarning = false;
    if (institutionalFootprint.includes('BUY') && lastCandle.high - Math.max(lastCandle.open, lastCandle.close) > Math.abs(lastCandle.close - lastCandle.open) * 1.5) {
        exhaustionWarning = true;
    } else if (institutionalFootprint.includes('SELL') && Math.min(lastCandle.open, lastCandle.close) - lastCandle.low > Math.abs(lastCandle.open - lastCandle.close) * 1.5) {
        exhaustionWarning = true;
    }

    return {
        buyingPressure: totalBuyingPressure,
        sellingPressure: totalSellingPressure,
        imbalanceRatio,
        institutionalFootprint,
        exhaustionWarning
    };
};
