
import WebSocket from 'ws';

const DERIV_APP_ID = 1089; // Default app id for testing or use a specific one if provided

export async function fetchDerivQuote(symbol) {
    const token = process.env.DERIV_API_TOKEN;
    if (!token) {
        throw new Error('DERIV_API_TOKEN not configured');
    }

    // Map common symbols to Deriv format if needed
    const normalized = symbol.toUpperCase().replace('/', '').replace(' ', '');
    let mappedSymbol = normalized;
    
    if (normalized === 'GOLD' || normalized === 'XAUUSD') mappedSymbol = 'frxXAUUSD';
    else if (normalized === 'EURUSD') mappedSymbol = 'frxEURUSD';
    else if (normalized === 'GBPUSD') mappedSymbol = 'frxGBPUSD';
    else if (normalized === 'USDJPY') mappedSymbol = 'frxUSDJPY';
    else if (normalized === 'AUDUSD') mappedSymbol = 'frxAUDUSD';
    else if (normalized === 'USDCAD') mappedSymbol = 'frxUSDCAD';
    else if (normalized === 'USDCHF') mappedSymbol = 'frxUSDCHF';
    else if (normalized === 'NZDUSD') mappedSymbol = 'frxNZDUSD';
    else if (normalized.length === 6 && !normalized.startsWith('FRX')) mappedSymbol = 'frx' + normalized;
    else if (normalized.startsWith('FRX')) mappedSymbol = 'frx' + normalized.substring(3);

    return new Promise((resolve, reject) => {
        const ws = new WebSocket(`wss://ws.binaryws.com/websockets/v3?app_id=${DERIV_APP_ID}`);

        const timeout = setTimeout(() => {
            ws.close();
            reject(new Error('Deriv API timeout'));
        }, 10000);

        ws.on('open', () => {
            // First authorize
            ws.send(JSON.stringify({ authorize: token }));
        });

        ws.on('message', (data) => {
            const response = JSON.parse(data);

            if (response.error) {
                ws.close();
                clearTimeout(timeout);
                reject(new Error(response.error.message));
                return;
            }

            if (response.msg_type === 'authorize') {
                // After authorization, request the quote
                ws.send(JSON.stringify({ ticks: mappedSymbol }));
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
    const { symbol } = req.query;
    if (!symbol) {
        return res.status(400).json({ error: 'Missing symbol' });
    }

    try {
        const data = await fetchDerivQuote(symbol);
        res.status(200).json(data);
    } catch (error) {
        console.error('[DerivData] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
};
