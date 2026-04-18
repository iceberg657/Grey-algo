
import WebSocket from 'ws';

const DERIV_APP_ID = 1089; // Default app id for testing or use a specific one if provided

export async function fetchDerivQuote(symbol, clientToken = null) {
    // Ticks do not require a token!
    
    // Map common symbols to Deriv format if needed
    const normalized = symbol.toUpperCase().replace('/', '').replace(' ', '').replace(/[^A-Z0-9]/g, '');
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

    return new Promise((resolve, reject) => {
        const ws = new WebSocket(`wss://ws.binaryws.com/websockets/v3?app_id=${DERIV_APP_ID}`);

        const timeout = setTimeout(() => {
            ws.close();
            reject(new Error('Deriv API timeout'));
        }, 10000);

        ws.on('open', () => {
            // Ticks API does not require authorization
            ws.send(JSON.stringify({ ticks: mappedSymbol }));
        });

        ws.on('message', (data) => {
            const response = JSON.parse(data);

            if (response.error) {
                ws.close();
                clearTimeout(timeout);
                reject(new Error(response.error.message));
                return;
            }

            if (response.msg_type === 'tick') {
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
    const { symbol, token } = req.query;
    if (!symbol) {
        return res.status(400).json({ error: 'Missing symbol' });
    }

    try {
        const data = await fetchDerivQuote(symbol, token);
        res.status(200).json(data);
    } catch (error) {
        console.error('[DerivData] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
};
