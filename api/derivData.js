
import WebSocket from 'ws';

const DERIV_APP_ID = 1089; // Default app id for testing or use a specific one if provided

export async function fetchDerivQuote(symbol, clientToken = null, fetchHistory = false, granularity = 60, count = 1000) {
    // Map common symbols to Deriv format if needed
    const normalized = symbol.toUpperCase().replace('/', '').replace(' ', '').replace(/[^A-Z0-9_]/g, '');
    let mappedSymbol = normalized;
    
    // Crypto - Deriv uses 'cry' prefix for these
    if (normalized === 'BTC' || normalized === 'BTCUSD' || normalized === 'CRYBTCUSD') mappedSymbol = 'cryBTCUSD';
    else if (normalized === 'ETH' || normalized === 'ETHUSD' || normalized === 'CRYETHUSD') mappedSymbol = 'cryETHUSD';
    else if (normalized === 'LTC' || normalized === 'LTCUSD' || normalized === 'CRYLTCUSD') mappedSymbol = 'cryLTCUSD';
    
    // Forex - Deriv requires lowercase 'frx' prefix for forex pairs
    else if (normalized.startsWith('FRX')) {
        mappedSymbol = 'frx' + normalized.substring(3);
    } else if (normalized === 'GOLD' || normalized === 'XAUUSD') {
        mappedSymbol = 'frxXAUUSD';
    } else if (normalized === 'EURUSD') mappedSymbol = 'frxEURUSD';
    else if (normalized === 'GBPUSD') mappedSymbol = 'frxGBPUSD';
    else if (normalized === 'USDJPY') mappedSymbol = 'frxUSDJPY';
    else if (normalized === 'AUDUSD') mappedSymbol = 'frxAUDUSD';
    else if (normalized === 'USDCAD') mappedSymbol = 'frxUSDCAD';
    else if (normalized === 'USDCHF') mappedSymbol = 'frxUSDCHF';
    else if (normalized === 'NZDUSD') mappedSymbol = 'frxNZDUSD';
    else if (normalized.length === 6 && !['BOOM', 'CRAS', 'STEP', 'R_10', 'R_25', 'R_50', 'R_75', 'R_100', 'BTCU', 'ETHU', 'LTCU'].some(p => normalized.startsWith(p))) {
        mappedSymbol = 'frx' + normalized;
    }
    
    // Volatility Indices
    if (normalized === 'V10' || normalized === 'VOLATILITY10') mappedSymbol = 'R_10';
    else if (normalized === 'V25' || normalized === 'VOLATILITY25') mappedSymbol = 'R_25';
    else if (normalized === 'V50' || normalized === 'VOLATILITY50') mappedSymbol = 'R_50';
    else if (normalized === 'V75' || normalized === 'VOLATILITY75') mappedSymbol = 'R_75';
    else if (normalized === 'V100' || normalized === 'VOLATILITY100') mappedSymbol = 'R_100';
    else if (normalized === 'V101S') mappedSymbol = '1HZ10V';
    else if (normalized === 'V251S') mappedSymbol = '1HZ25V';
    else if (normalized === 'V501S') mappedSymbol = '1HZ50V';
    else if (normalized === 'V751S') mappedSymbol = '1HZ75V';
    else if (normalized === 'V1001S') mappedSymbol = '1HZ100V';
    
    // Boom/Crash
    else if (normalized === 'BOOM1000') mappedSymbol = 'BOOM1000';
    else if (normalized === 'BOOM500') mappedSymbol = 'BOOM500';
    else if (normalized === 'BOOM300') mappedSymbol = 'BOOM300';
    else if (normalized === 'CRASH1000') mappedSymbol = 'CRASH1000';
    else if (normalized === 'CRASH500') mappedSymbol = 'CRASH500';
    else if (normalized === 'CRASH300') mappedSymbol = 'CRASH300';
    
    // Step
    else if (normalized === 'STEP' || normalized === 'STEPINDEX') mappedSymbol = 'STP';
    
    // Jump
    else if (normalized.startsWith('JUMP')) {
      const num = normalized.replace('JUMP', '');
      mappedSymbol = `JDM${num}`;
    }

    // Range Break
    else if (normalized === 'RANGE100') mappedSymbol = 'RB_100';
    else if (normalized === 'RANGE200') mappedSymbol = 'RB_200';

    // Global Indices
    else if (normalized === 'US30' || normalized === 'OTCDJI') mappedSymbol = 'OTC_DJI';
    else if (normalized === 'US100' || normalized === 'NDX') mappedSymbol = 'OTC_NDX';
    else if (normalized === 'US500' || normalized === 'SP500') mappedSymbol = 'OTC_SPC';
    else if (normalized === 'UK100' || normalized === 'FTSE') mappedSymbol = 'OTC_FTSE';
    else if (normalized === 'GERMANY40' || normalized === 'DAX' || normalized === 'OTCGDAXI') mappedSymbol = 'OTC_GDAXI';
    else if (normalized === 'FRANCE40' || normalized === 'CAC' || normalized === 'OTCFCHI') mappedSymbol = 'OTC_FCHI';
    else if (normalized === 'JAPAN225' || normalized === 'N225') mappedSymbol = 'OTC_N225';
    else if (normalized === 'AUSTRALIA200' || normalized === 'AS51') mappedSymbol = 'OTC_AS51';

    return new Promise((resolve, reject) => {
        const ws = new WebSocket(`wss://ws.binaryws.com/websockets/v3?app_id=${DERIV_APP_ID}`);

        const timeout = setTimeout(() => {
            ws.close();
            reject(new Error('Deriv API timeout'));
        }, 10000);

        ws.on('open', () => {
            // Ticks API does not require authorization
            if (fetchHistory) {
                ws.send(JSON.stringify({ 
                    ticks_history: mappedSymbol,
                    adjust_start_time: 1,
                    count: parseInt(count) || 1000, // Get requested candles for deep history
                    end: 'latest',
                    style: 'candles',
                    granularity: parseInt(granularity) || 60
                }));
            } else {
                ws.send(JSON.stringify({ ticks: mappedSymbol }));
            }
        });

        ws.on('message', (data) => {
            const response = JSON.parse(data);

            if (response.error) {
                ws.close();
                clearTimeout(timeout);
                reject(new Error(response.error.message));
                return;
            }

            if (response.msg_type === 'tick' && !fetchHistory) {
                const tick = response.tick;
                ws.close();
                clearTimeout(timeout);
                resolve({
                    symbol: tick.symbol,
                    price: tick.quote,
                    bid: tick.bid,
                    ask: tick.ask,
                    epoch: tick.epoch
                });
            } else if (response.msg_type === 'ohlc' || response.msg_type === 'candles') {
                ws.close();
                clearTimeout(timeout);
                resolve({
                    symbol: mappedSymbol,
                    candles: response.candles || []
                });
            }
        });

        ws.on('error', (error) => {
            ws.close();
            clearTimeout(timeout);
            reject(error);
        });
    });
}

export default async (req, res) => {
    const { symbol, token, history, granularity, count } = req.query;
    if (!symbol) {
        return res.status(400).json({ error: 'Missing symbol' });
    }

    try {
        const fetchHistory = history === 'true';
        const data = await fetchDerivQuote(symbol, token, fetchHistory, granularity, count);
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.status(200).json(data);
    } catch (error) {
        console.error('[DerivData] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
};
