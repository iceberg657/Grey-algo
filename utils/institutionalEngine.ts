import { OHLC } from './quantEngine';

export interface InstitutionalExecutionData {
    vwap: number;
    twap: number;
    priceToVWAPRatio: number;
    tca: {
        estimatedSlippage: number;
        marketImpact: number;
    };
    preTradeRisk: {
        fatFingerCheck: boolean; // Protects against bad pricing
        volatilityCircuitBreaker: boolean; // Protects against flash crashes
        executionAllowed: boolean;
    };
    microstructure: {
        spoofingDetected: boolean;
        layeringProbability: number;
    };
    oms: {
        recommendedRouting: 'AGGRESSIVE_TAKER' | 'PASSIVE_MAKER' | 'SMART_VWAP_SLICE';
    };
}

export function calculateInstitutionalExecution(candles: OHLC[], currentPrice: number, atr: number): InstitutionalExecutionData {
    if (candles.length < 20) {
        return {
            vwap: currentPrice, twap: currentPrice, priceToVWAPRatio: 1,
            tca: { estimatedSlippage: 0.0001, marketImpact: 0 },
            preTradeRisk: { fatFingerCheck: true, volatilityCircuitBreaker: false, executionAllowed: true },
            microstructure: { spoofingDetected: false, layeringProbability: 0 },
            oms: { recommendedRouting: 'PASSIVE_MAKER' }
        };
    }

    // 1. VWAP & TWAP (Approximation since we lack absolute tick volume, using relative candle size)
    let cumulativeTypicalPriceVolume = 0;
    let cumulativeVolume = 0;
    let sumTypicalPrice = 0;

    for (let i = candles.length - 20; i < candles.length; i++) {
        const c = candles[i];
        const typicalPrice = (c.high + c.low + c.close) / 3;
        // Pseudo-volume: candle range
        const proxyVolume = (c.high - c.low) * 10000; 
        cumulativeTypicalPriceVolume += (typicalPrice * proxyVolume);
        cumulativeVolume += proxyVolume;
        sumTypicalPrice += typicalPrice;
    }

    const vwap = cumulativeVolume > 0 ? cumulativeTypicalPriceVolume / cumulativeVolume : currentPrice;
    const twap = sumTypicalPrice / 20;
    const priceToVWAPRatio = currentPrice / vwap;

    // 2. Pre-Trade Risk
    const dailyPriceChange = Math.abs(currentPrice - candles[0].close) / candles[0].close;
    const isFatFinger = currentPrice <= 0 || dailyPriceChange > 0.2; // 20% move in single session is suspect
    const isFlashCrash = atr > (currentPrice * 0.05); // ATR is 5% of price -> extreme volatility

    const preTradeRisk = {
        fatFingerCheck: !isFatFinger,
        volatilityCircuitBreaker: isFlashCrash,
        executionAllowed: !isFatFinger && !isFlashCrash
    };

    // 3. Microstructure Anomaly (Spoofing proxy: rapid massive wicks failing to move price)
    let wickToBodyRatios = 0;
    for (let i = candles.length - 5; i < candles.length; i++) {
        const c = candles[i];
        const body = Math.abs(c.open - c.close);
        const wickLength = (c.high - c.low) - body;
        if (body > 0) wickToBodyRatios += (wickLength / body);
    }
    const avgWickToBody = wickToBodyRatios / 5;
    const spoofingDetected = avgWickToBody > 4.0; // Wicks are 4x the body consistently

    // 4. TCA (Transaction Cost Analysis)
    const marketImpact = spoofingDetected ? 0.005 : 0.001;
    const estimatedSlippage = (atr / currentPrice) * 100; // Slippage proportional to volatility

    // 5. Smart Order Routing Logic
    let routing: 'AGGRESSIVE_TAKER' | 'PASSIVE_MAKER' | 'SMART_VWAP_SLICE' = 'PASSIVE_MAKER';
    if (spoofingDetected) routing = 'SMART_VWAP_SLICE';
    else if (!isFlashCrash && currentPrice < vwap) routing = 'AGGRESSIVE_TAKER';

    return {
        vwap,
        twap,
        priceToVWAPRatio,
        tca: { estimatedSlippage, marketImpact },
        preTradeRisk,
        microstructure: {
            spoofingDetected,
            layeringProbability: spoofingDetected ? 0.8 : 0.1
        },
        oms: { recommendedRouting: routing }
    };
}
