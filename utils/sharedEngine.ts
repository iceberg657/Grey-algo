
import { OHLC } from './quantEngine';

export const detectFVG = (candles: any[]) => {
    if (candles.length < 3) return null;
    const c1 = candles[candles.length - 3];
    const c3 = candles[candles.length - 1];

    if (c1.high < c3.low) {
        return { type: 'BULLISH', upper: c3.low, lower: c1.high };
    }
    if (c1.low > c3.high) {
        return { type: 'BEARISH', upper: c1.low, lower: c3.high };
    }
    return null;
};

export const detectOrderBlock = (candles: any[], trend: string, currentPrice: number) => {
    const recent = candles.slice(-10);
    if (trend === 'BULLISH') {
        for (let i = recent.length - 2; i >= 0; i--) {
            if (recent[i].close < recent[i].open && recent[i + 1].close > recent[i + 1].open) {
                return { type: 'BULLISH_OB', upper: recent[i].open, lower: recent[i].close };
            }
        }
    } else if (trend === 'BEARISH') {
        for (let i = recent.length - 2; i >= 0; i--) {
            if (recent[i].close > recent[i].open && recent[i + 1].close < recent[i + 1].open) {
                return { type: 'BEARISH_OB', upper: recent[i].close, lower: recent[i].open };
            }
        }
    }
    return null;
};
