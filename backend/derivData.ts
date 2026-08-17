import WebSocket from 'ws';
import { Request, Response } from 'express';

const DERIV_APP_ID = 1089; // Default app id for testing or use a specific one if provided

export async function fetchDerivQuote(symbol: string, _clientToken: string | null = null, fetchHistory: boolean = false, granularity: any = 60, count: any = 1000): Promise<any> {
    // Map common symbols to Deriv format if needed
    const normalized = symbol.toUpperCase().replace('/', '').replace(' ', '').replace(/[^A-Z0-9_]/g, '');
    let mappedSymbol = normalized;
    
    // Mapping logic
    if (normalized === 'BTC' || normalized === 'BTCUSD' || normalized === 'CRYBTCUSD') {
        mappedSymbol = 'cryBTCUSD';
    } else if (normalized === 'ETH' || normalized === 'ETHUSD' || normalized === 'CRYETHUSD') {
        mappedSymbol = 'cryETHUSD';
    } else if (normalized === 'LTC' || normalized === 'LTCUSD' || normalized === 'CRYLTCUSD') {
        mappedSymbol = 'cryLTCUSD';
    } else if (normalized === 'US30' || normalized === 'OTCDJI' || normalized.includes('DJI') || normalized.includes('DOW') || normalized.includes('US30')) {
        mappedSymbol = 'OTC_DJI';
    } else if (normalized === 'US100' || normalized === 'NDX' || normalized.includes('NAS100') || normalized.includes('USTEC') || normalized.includes('US100')) {
        mappedSymbol = 'OTC_NDX';
    } else if (normalized === 'US500' || normalized === 'SP500' || normalized.includes('SPX500') || normalized.includes('US500')) {
        mappedSymbol = 'OTC_SPC';
    } else if (normalized === 'EUROPE50' || normalized === 'STOXX50' || normalized.includes('STOXX50E')) {
        mappedSymbol = 'OTC_STOXX50E';
    } else if (normalized === 'UK100' || normalized === 'FTSE' || normalized.includes('FTSE100') || normalized.includes('UK100')) {
        mappedSymbol = 'OTC_FTSE';
    } else if (normalized === 'FRANCE40' || normalized === 'CAC' || normalized === 'OTCFCHI' || normalized.includes('FCHI')) {
        mappedSymbol = 'OTC_FCHI';
    } else if (normalized === 'GERMANY40' || normalized === 'DAX' || normalized === 'OTCGDAXI' || normalized.includes('DAX')) {
        mappedSymbol = 'OTC_GDAXI';
    } else if (normalized === 'JAPAN225' || normalized === 'N225' || normalized.includes('N225')) {
        mappedSymbol = 'OTC_N225';
    } else if (normalized === 'AUSTRALIA200' || normalized === 'AS51' || normalized.includes('AS51')) {
        mappedSymbol = 'OTC_AS51';
    } else if (normalized === 'V10' || normalized === 'VOLATILITY10' || normalized === 'R_10') {
        mappedSymbol = 'R_10';
    } else if (normalized === 'V25' || normalized === 'VOLATILITY25' || normalized === 'R_25') {
        mappedSymbol = 'R_25';
    } else if (normalized === 'V50' || normalized === 'VOLATILITY50' || normalized === 'R_50') {
        mappedSymbol = 'R_50';
    } else if (normalized === 'V75' || normalized === 'VOLATILITY75' || normalized === 'R_75') {
        mappedSymbol = 'R_75';
    } else if (normalized === 'V100' || normalized === 'VOLATILITY100' || normalized === 'R_100') {
        mappedSymbol = 'R_100';
    } else if (normalized === 'V101S' || normalized === '1HZ10V') {
        mappedSymbol = '1HZ10V';
    } else if (normalized === 'V251S' || normalized === '1HZ25V') {
        mappedSymbol = '1HZ25V';
    } else if (normalized === 'V501S' || normalized === '1HZ50V') {
        mappedSymbol = '1HZ50V';
    } else if (normalized === 'V751S' || normalized === '1HZ75V') {
        mappedSymbol = '1HZ75V';
    } else if (normalized === 'V1001S' || normalized === '1HZ100V') {
        mappedSymbol = '1HZ100V';
    } else if (normalized === 'BOOM150') {
        mappedSymbol = 'BOOM150N';
    } else if (normalized === 'BOOM300') {
        mappedSymbol = 'BOOM300N';
    } else if (normalized === 'CRASH150') {
        mappedSymbol = 'CRASH150N';
    } else if (normalized === 'CRASH300') {
        mappedSymbol = 'CRASH300N';
    } else if (normalized === 'BOOM1000') {
        mappedSymbol = 'BOOM1000';
    } else if (normalized === 'BOOM500') {
        mappedSymbol = 'BOOM500';
    } else if (normalized === 'CRASH1000') {
        mappedSymbol = 'CRASH1000';
    } else if (normalized === 'CRASH500') {
        mappedSymbol = 'CRASH500';
    } else if (normalized === 'STEP' || normalized === 'STEPINDEX' || normalized === 'STP') {
        mappedSymbol = 'STP';
    } else if (normalized.startsWith('JUMP')) {
        const num = normalized.replace('JUMP', '');
        mappedSymbol = `JDM${num}`;
    } else if (normalized === 'RANGE100' || normalized === 'RB_100') {
        mappedSymbol = 'RB_100';
    } else if (normalized === 'RANGE200' || normalized === 'RB_200') {
        mappedSymbol = 'RB_200';
    } else if (normalized === 'GOLD' || normalized === 'XAUUSD') {
        mappedSymbol = 'frxXAUUSD';
    } else if (normalized === 'EURUSD') {
        mappedSymbol = 'frxEURUSD';
    } else if (normalized === 'GBPUSD') {
        mappedSymbol = 'frxGBPUSD';
    } else if (normalized === 'USDJPY') {
        mappedSymbol = 'frxUSDJPY';
    } else if (normalized === 'AUDUSD') {
        mappedSymbol = 'frxAUDUSD';
    } else if (normalized === 'USDCAD') {
        mappedSymbol = 'frxUSDCAD';
    } else if (normalized === 'USDCHF') {
        mappedSymbol = 'frxUSDCHF';
    } else if (normalized === 'NZDUSD') {
        mappedSymbol = 'frxNZDUSD';
    } else if (normalized.startsWith('FRX')) {
        mappedSymbol = 'frx' + normalized.substring(3);
    } else if (normalized.length === 6 && !['BOOM', 'CRAS', 'STEP', 'R_10', 'R_25', 'R_50', 'R_75', 'R_100', 'BTCU', 'ETHU', 'LTCU'].some(p => normalized.startsWith(p))) {
        mappedSymbol = 'frx' + normalized;
    }

    console.log(`[DerivData] Mapping: "${symbol}" -> "${normalized}" -> "${mappedSymbol}"`);

    // For Gold, Forex, Equity Indices, and Crypto, try Yahoo Finance directly or as instantaneous fallback
    const upperNorm = normalized.toUpperCase();
    const isMajorGlobalAsset = ['GOLD', 'XAUUSD', 'FRXXAUUSD', 'SILVER', 'XAGUSD', 'US30', 'OTCDJI', 'NAS100', 'OTCNDX', 'SP500', 'OTCSPC', 'EURUSD', 'FRXEURUSD', 'GBPUSD', 'FRXGBPUSD', 'USDJPY', 'FRXUSDJPY'].includes(upperNorm) || upperNorm.startsWith('FRX') || (upperNorm.length === 6 && !upperNorm.startsWith('R_') && !upperNorm.startsWith('BOOM') && !upperNorm.startsWith('CRASH'));

    return new Promise((resolve, reject) => {
        let isSettled = false;
        const ws = new WebSocket(`wss://ws.binaryws.com/websockets/v3?app_id=${DERIV_APP_ID}`);

        const safeResolve = (data: any) => {
            if (isSettled) return;
            isSettled = true;
            clearTimeout(timeout);
            try { ws.close(); } catch {}
            resolve(data);
        };

        const safeReject = async (err: any) => {
            if (isSettled) return;
            // Attempt Yahoo Finance fallback for global assets before rejecting
            if (isMajorGlobalAsset) {
                try {
                    const fallbackData = await fetchYahooFallbackQuote(symbol, fetchHistory, granularity, count);
                    isSettled = true;
                    clearTimeout(timeout);
                    try { ws.close(); } catch {}
                    resolve(fallbackData);
                    return;
                } catch (fallbackErr) {
                    console.warn('[DerivData] Yahoo fallback also failed:', fallbackErr);
                }
            }

            isSettled = true;
            clearTimeout(timeout);
            try { ws.close(); } catch {}
            reject(err);
        };

        const timeout = setTimeout(() => {
            safeReject(new Error('Deriv API timeout'));
        }, 5000);

        ws.on('open', () => {
            // Ticks API does not require authorization
            if (fetchHistory) {
                ws.send(JSON.stringify({ 
                    ticks_history: mappedSymbol,
                    adjust_start_time: 1,
                    count: parseInt(count) || 1000,
                    end: 'latest',
                    style: 'candles',
                    granularity: parseInt(granularity) || 60
                }));
            } else {
                ws.send(JSON.stringify({ ticks: mappedSymbol }));
            }
        });

        ws.on('message', (data: any) => {
            try {
                const response = JSON.parse(data.toString());

                if (response.error) {
                    safeReject(new Error(response.error.message || JSON.stringify(response.error)));
                    return;
                }

                if (response.msg_type === 'tick' && !fetchHistory) {
                    const tick = response.tick;
                    safeResolve({
                        symbol: tick.symbol,
                        price: tick.quote,
                        bid: tick.bid,
                        ask: tick.ask,
                        epoch: tick.epoch
                    });
                } else if (response.msg_type === 'ohlc' || response.msg_type === 'candles' || response.msg_type === 'history') {
                    const rawCandles = response.candles || response.history?.prices?.map((p: any, i: number) => ({
                        epoch: response.history.times[i],
                        close: p,
                        high: p,
                        low: p,
                        open: p
                    })) || [];

                    const normalizedCandles = rawCandles.map((c: any) => {
                        const open = Number(c.open ?? c.close ?? 0);
                        const high = Number(c.high ?? Math.max(open, Number(c.close ?? 0)));
                        const low = Number(c.low ?? Math.min(open, Number(c.close ?? 0)));
                        const close = Number(c.close ?? open);
                        const epoch = Number(c.epoch ?? (c.datetime ? Math.floor(new Date(c.datetime).getTime() / 1000) : Date.now() / 1000));
                        const volume = Number(c.volume ?? c.tick_volume ?? c.tickVolume ?? 0);

                        return {
                            epoch,
                            datetime: c.datetime || new Date(epoch * 1000).toISOString(),
                            open,
                            high,
                            low,
                            close,
                            volume,
                            tick_volume: volume
                        };
                    });

                    safeResolve({
                        symbol: mappedSymbol,
                        candles: normalizedCandles
                    });
                }
            } catch (err: any) {
                safeReject(new Error('Failed to parse Deriv API response: ' + err.message));
            }
        });

        ws.on('error', (error: any) => {
            safeReject(new Error(error.message || 'WebSocket Error'));
        });
        
        ws.on('close', (code, reason) => {
            safeReject(new Error(`Deriv WS Closed: ${code} ${reason}`));
        });
    });
}

async function fetchYahooFallbackQuote(symbol: string, fetchHistory: boolean = false, granularity: any = 60, count: any = 1000): Promise<any> {
    let yahooSym = symbol;
    const upper = symbol.toUpperCase().replace('/', '').replace(' ', '');
    if (upper === 'GOLD' || upper === 'XAUUSD' || upper === 'FRXXAUUSD') yahooSym = 'GC=F';
    else if (upper === 'SILVER' || upper === 'XAGUSD') yahooSym = 'SI=F';
    else if (upper === 'US30' || upper === 'DJI' || upper === 'OTCDJI') yahooSym = '^DJI';
    else if (upper === 'NAS100' || upper === 'NDX' || upper === 'OTCNDX') yahooSym = '^NDX';
    else if (upper === 'SP500' || upper === 'SPX' || upper === 'US500' || upper === 'OTCSPC') yahooSym = '^GSPC';
    else if (upper === 'BTCUSD' || upper === 'CRYBTCUSD' || upper === 'BTC') yahooSym = 'BTC-USD';
    else if (upper === 'ETHUSD' || upper === 'CRYETHUSD' || upper === 'ETH') yahooSym = 'ETH-USD';
    else if (upper.length === 6 || upper.startsWith('FRX')) {
        const cleanForex = upper.replace('FRX', '');
        yahooSym = cleanForex + '=X';
    }

    let interval = '15m';
    let range = '5d';
    const granSec = parseInt(granularity) || 60;
    if (granSec <= 60) { interval = '1m'; range = '1d'; }
    else if (granSec <= 300) { interval = '5m'; range = '1d'; }
    else if (granSec <= 900) { interval = '15m'; range = '5d'; }
    else if (granSec <= 3600) { interval = '60m'; range = '1mo'; }
    else { interval = '1d'; range = '3mo'; }

    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?interval=${interval}&range=${range}`);
    if (!res.ok) throw new Error(`Yahoo Finance HTTP ${res.status}`);
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) throw new Error("No Yahoo result data");

    const meta = result.meta;
    const quotes = result.indicators?.quote?.[0];
    const timestamps = result.timestamp || [];

    if (fetchHistory && quotes && timestamps && timestamps.length > 0) {
        const candles: any[] = [];
        for (let i = 0; i < timestamps.length; i++) {
            if (quotes.open[i] != null && quotes.close[i] != null) {
                candles.push({
                    epoch: timestamps[i],
                    datetime: new Date(timestamps[i] * 1000).toISOString(),
                    open: quotes.open[i],
                    high: quotes.high[i] || quotes.open[i],
                    low: quotes.low[i] || quotes.open[i],
                    close: quotes.close[i],
                    volume: quotes.volume[i] || 100,
                    tick_volume: quotes.volume[i] || 100
                });
            }
        }
        if (candles.length > 0) {
            return {
                symbol,
                candles: candles.slice(-count)
            };
        }
    }

    const validCloses = (quotes?.close || []).filter((c: any) => typeof c === 'number' && !isNaN(c));
    const lastPrice = validCloses[validCloses.length - 1] || meta?.regularMarketPrice;
    if (!lastPrice) throw new Error("No price found");

    const spreadVal = yahooSym.includes('GC=F') ? 0.3 : (lastPrice * 0.0001);
    return {
        symbol,
        price: Number(lastPrice.toFixed(5)),
        bid: Number((lastPrice - spreadVal / 2).toFixed(5)),
        ask: Number((lastPrice + spreadVal / 2).toFixed(5)),
        epoch: Math.floor(Date.now() / 1000)
    };
}

export default async (req: Request, res: Response) => {
    const { symbol, token, history, granularity, count } = req.query as any;
    if (!symbol) {
        return res.status(400).json({ error: 'Missing symbol' });
    }

    try {
        const fetchHistory = history === 'true';
        const data = await fetchDerivQuote(symbol, token, fetchHistory, granularity, count);
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.status(200).json(data);
    } catch (error: any) {
        console.error('[DerivData] Error:', error.message || error);
        res.status(500).json({ error: error.message || String(error) });
    }
};
