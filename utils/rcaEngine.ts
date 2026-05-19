
import { detectFVG, detectOrderBlock } from './sharedEngine';
import { calculateEMA, calculateRSI } from './analyticsEngine';

export function analyzeRCA(candles: any[]) {
    if (!candles || candles.length < 50) return null;

    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);

    const ema50 = calculateEMA(closes, 50)[calculateEMA(closes, 50).length - 1];
    const ema200 = calculateEMA(closes, 200)[calculateEMA(closes, 200).length - 1];
    const rsi = calculateRSI(closes)[calculateRSI(closes).length - 1];
    const currentPrice = closes[closes.length - 1];

    const trend = ema50 > ema200 && currentPrice > ema50 ? 'BULLISH' :
                  ema50 < ema200 && currentPrice < ema50 ? 'BEARISH' : 'RANGING';

    const prevHigh = Math.max(...highs.slice(-12, -1));
    const prevLow = Math.min(...lows.slice(-12, -1));
    
    let bos = false;
    if (trend === 'BULLISH') bos = currentPrice > prevHigh;
    else if (trend === 'BEARISH') bos = currentPrice < prevLow;

    const fvg = detectFVG(candles);
    const ob = detectOrderBlock(candles, trend, currentPrice);

    return {
        trend,
        ema50,
        ema200,
        rsi,
        bos,
        fvg,
        ob,
        message: "RCA Engine Analysis Complete"
    };
}
