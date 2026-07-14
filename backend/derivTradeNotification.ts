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

    console.log(`[DerivTradeNotif] Mapping: "${symbol}" -> "${normalized}" -> "${mappedSymbol}"`);

    return new Promise((resolve, reject) => {
        let isResolved = false;
        let ws: WebSocket;
        let timeout: NodeJS.Timeout;

        const cleanup = () => {
            if (timeout) clearTimeout(timeout);
            if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
                ws.close();
            }
        };

        const connect = (useToken: boolean) => {
            ws = new WebSocket(`wss://ws.binaryws.com/websockets/v3?app_id=${DERIV_APP_ID}`);

            ws.on('open', () => {
                if (isResolved) return;
                
                // If token provided and we are using it, authorize first
                if (useToken && _clientToken) {
                    ws.send(JSON.stringify({ authorize: _clientToken }));
                } else {
                    requestData();
                }
            });

            const requestData = () => {
                if (isResolved) return;
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
            };

            ws.on('message', (data: any) => {
                if (isResolved) return;
                try {
                    const response = JSON.parse(data.toString());

                    if (response.error) {
                        // If token authorization fails, gracefully retry without a token since quotes are public
                        if (response.msg_type === 'authorize' && useToken) {
                            console.warn(`[DerivTradeNotif] Authorization failed: ${response.error.message || JSON.stringify(response.error)}. Retrying WITHOUT token/authorization...`);
                            ws.close();
                            connect(false);
                            return;
                        }
                        isResolved = true;
                        cleanup();
                        reject(new Error(`Deriv API Error: ${response.error.message || JSON.stringify(response.error)}`));
                        return;
                    }

                    if (response.msg_type === 'authorize') {
                        // Authorization successful, now request data
                        requestData();
                        return;
                    }

                    if (response.msg_type === 'tick' && !fetchHistory) {
                        const tick = response.tick;
                        isResolved = true;
                        cleanup();
                        resolve({
                            symbol: tick.symbol,
                            price: tick.quote,
                            bid: tick.quote, 
                            ask: tick.quote, 
                            epoch: tick.epoch
                        });
                    } else if (response.msg_type === 'ohlc' || response.msg_type === 'candles' || response.msg_type === 'history') {
                        isResolved = true;
                        cleanup();
                        resolve({
                            symbol: mappedSymbol,
                            candles: response.candles || response.history?.prices?.map((p: any, i: number) => ({
                                epoch: response.history.times[i],
                                close: p,
                                high: p,
                                low: p,
                                open: p
                            })) || []
                        });
                    }
                } catch (err: any) {
                    isResolved = true;
                    cleanup();
                    reject(new Error('Failed to parse Deriv API response: ' + err.message));
                }
            });

            ws.on('error', (error: any) => {
                if (isResolved) return;
                if (useToken) {
                    console.warn(`[DerivTradeNotif] WS Error during token auth: ${error.message}. Retrying WITHOUT token/authorization...`);
                    ws.close();
                    connect(false);
                    return;
                }
                isResolved = true;
                cleanup();
                reject(new Error('Deriv Connection Error: ' + (error.message || 'Unable to establish WebSocket connection.')));
            });
            
            ws.on('close', (code, reason) => {
                if (isResolved) return;
                if (useToken) {
                    console.warn(`[DerivTradeNotif] WS Closed during token auth: ${code}. Retrying WITHOUT token/authorization...`);
                    connect(false);
                    return;
                }
                isResolved = true;
                reject(new Error(`Deriv Connection Closed (Code: ${code}). ${reason || 'The connection was interrupted.'}`));
            });
        };

        timeout = setTimeout(() => {
            if (isResolved) return;
            isResolved = true;
            cleanup();
            console.error('[Deriv] Connection timed out after 8s');
            reject(new Error('Deriv API connection timed out. Vercel serverless limit reached. Please try again.'));
        }, 8000);

        connect(!!_clientToken);
    });
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
        console.error('[DerivTradeNotif] Error:', error.message || error);
        // Returning 200 with error field so the frontend receives "information" instead of a raw 500 crash
        res.status(200).json({ 
            error: error.message || String(error),
            status: 'failed',
            info: 'Deriv API connection failed. Check your App ID and Token in Settings.'
        });
    }
};
