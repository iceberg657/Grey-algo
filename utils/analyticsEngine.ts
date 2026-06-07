import type { OHLC } from './quantEngine';

// Generic Technical Analysis Utils 
export const calculateEMA = (data: number[], period: number): number[] => {
    if (data.length < period) return [];
    const k = 2 / (period + 1);
    const ema = [];
    let sum = 0;
    for (let i = 0; i < period; i++) sum += data[i];
    ema.push(sum / period);
    for (let i = period; i < data.length; i++) {
        ema.push(data[i] * k + ema[ema.length - 1] * (1 - k));
    }
    return ema;
};

export const calculateRSI = (data: number[], period: number = 14): number[] => {
    if (data.length < period + 1) return [];
    let gains = 0, losses = 0;
    for (let i = 1; i <= period; i++) {
        const diff = data[i] - data[i - 1];
        if (diff >= 0) gains += diff;
        else losses -= diff;
    }
    let avgGain = gains / period;
    let avgLoss = losses / period;
    const rsi = [];
    if (avgLoss === 0) rsi.push(100);
    else rsi.push(100 - (100 / (1 + avgGain / avgLoss)));

    for (let i = period + 1; i < data.length; i++) {
        const diff = data[i] - data[i - 1];
        avgGain = (avgGain * (period - 1) + (diff >= 0 ? diff : 0)) / period;
        avgLoss = (avgLoss * (period - 1) + (diff < 0 ? -diff : 0)) / period;
        if (avgLoss === 0) rsi.push(100);
        else rsi.push(100 - (100 / (1 + avgGain / avgLoss)));
    }
    return rsi;
};

export const findSwings = (candles: OHLC[], leftBars = 3, rightBars = 3) => {
    const swingHighs: {index: number, price: number}[] = [];
    const swingLows: {index: number, price: number}[] = [];
    for (let i = leftBars; i < candles.length - rightBars; i++) {
        let isHigh = true, isLow = true;
        for (let j = i - leftBars; j <= i + rightBars; j++) {
            if (i === j) continue;
            if (candles[j].high >= candles[i].high) isHigh = false;
            if (candles[j].low <= candles[i].low) isLow = false;
        }
        if (isHigh) swingHighs.push({ index: i, price: candles[i].high });
        if (isLow) swingLows.push({ index: i, price: candles[i].low });
    }
    return { swingHighs, swingLows };
};
