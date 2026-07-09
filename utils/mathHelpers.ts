export function calculateSMA(data: number[], period: number): number {
    if (data.length < period) return 0;
    const sum = data.slice(-period).reduce((a, b) => a + b, 0);
    return sum / period;
}

export function calculateStandardDeviation(data: number[], period: number, sma: number): number {
    if (data.length < period) return 0;
    const slice = data.slice(-period);
    const squaredDiffs = slice.map(x => Math.pow(x - sma, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
    return Math.sqrt(variance);
}

export function calculateRSI(closes: number[], period: number): number {
    if (closes.length < period + 1) return 50;
    let gains = 0;
    let losses = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
        const diff = closes[i] - closes[i - 1];
        if (diff >= 0) gains += diff;
        else losses -= diff;
    }
    if (losses === 0) return 100;
    const rs = gains / losses;
    return 100 - (100 / (1 + rs));
}
