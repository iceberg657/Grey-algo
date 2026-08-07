import { Request, Response } from 'express';
import { CTraderWSClient } from './wsClient.js';

const standardToCommonAliases: Record<string, string[]> = {
    'US100': ['US100', 'NAS100', 'USTEC', 'US TECH 100', 'NQ100', 'NDX', 'TECH100', 'TECH 100', 'US TECH', 'NASDAQ'],
    'US30': ['US30', 'DJ30', 'WS30', 'DOW', 'WALL ST 30', 'DOW JONES', 'WALLSTREET30'],
    'US500': ['US500', 'SPX500', 'SP500', 'S&P 500', 'S&P500', 'SPX'],
    'GER40': ['GER40', 'DAX40', 'DAX', 'DE40', 'GERMANY 40', 'GERMANY40'],
    'UK100': ['UK100', 'FTSE100', 'FTSE', 'UK 100', 'UK100'],
    'XAUUSD': ['XAUUSD', 'GOLD', 'XAU', 'GOLDUSD'],
    'XAGUSD': ['XAGUSD', 'SILVER', 'XAG', 'SILVERUSD'],
    'BTCUSD': ['BTCUSD', 'BITCOIN', 'BTC'],
    'ETHUSD': ['ETHUSD', 'ETHEREUM', 'ETH']
};

export const resolveSymbolFuzzy = (symbol: string, symbolsArray: any[]) => {
    let sym = symbolsArray.find((s: any) => s.symbolName === symbol);
    if (sym) return sym;

    const upperSymbol = symbol.toUpperCase().trim();
    
    // Check aliases
    const aliases = standardToCommonAliases[upperSymbol] || [];
    const searchTerms = [upperSymbol, ...aliases];
    
    for (const term of searchTerms) {
        sym = symbolsArray.find((s: any) => s.symbolName.toUpperCase() === term);
        if (sym) return sym;
    }
    
    // Fuzzy matching
    for (const term of searchTerms) {
        sym = symbolsArray.find((s: any) => {
            const name = s.symbolName.toUpperCase();
            return name.includes(term);
        });
        if (sym) return sym;
    }
    
    return null;
};

const envCache = new Map<number, 'live' | 'demo'>();

async function detectAccountEnvironment(clientId: string, clientSecret: string, token: string, accountId: number): Promise<'live' | 'demo' | null> {
    const wsClient = new CTraderWSClient({ host: 'live.ctraderapi.com', port: 5036 });
    try {
        await wsClient.connect();
        await wsClient.authenticateApp(clientId, clientSecret);
        const accounts = await wsClient.getAccountsByToken(token);
        await wsClient.close();
        
        const matchingAccount = accounts.find((acc: any) => acc.ctidTraderAccountId === accountId);
        if (matchingAccount) {
            console.log(`[cTrader WS] Auto-detected environment for account ${accountId}: ${matchingAccount.isLive ? 'live' : 'demo'}`);
            return matchingAccount.isLive ? 'live' : 'demo';
        }
    } catch (e: any) {
        console.warn(`[cTrader WS] Error detecting environment from live server for account ${accountId}, trying demo server...`, e.message || e);
        try { await wsClient.close(); } catch (_) {}
    }

    // Try demo connection to be thorough
    const demoWsClient = new CTraderWSClient({ host: 'demo.ctraderapi.com', port: 5036 });
    try {
        await demoWsClient.connect();
        await demoWsClient.authenticateApp(clientId, clientSecret);
        const accounts = await demoWsClient.getAccountsByToken(token);
        await demoWsClient.close();
        
        const matchingAccount = accounts.find((acc: any) => acc.ctidTraderAccountId === accountId);
        if (matchingAccount) {
            console.log(`[cTrader WS] Auto-detected environment (Demo server) for account ${accountId}: ${matchingAccount.isLive ? 'live' : 'demo'}`);
            return matchingAccount.isLive ? 'live' : 'demo';
        }
    } catch (e: any) {
        console.warn(`[cTrader WS] Error detecting environment from demo server for account ${accountId}:`, e.message || e);
        try { await demoWsClient.close(); } catch (_) {}
    }

    return null;
}

async function getOrDetectEnvironment(clientId: string, clientSecret: string, token: string, accountId: number, queryEnv: string): Promise<'live' | 'demo'> {
    if (envCache.has(accountId)) {
        return envCache.get(accountId)!;
    }
    
    const detected = await detectAccountEnvironment(clientId, clientSecret, token, accountId);
    if (detected) {
        envCache.set(accountId, detected);
        return detected;
    }
    
    const finalEnv = queryEnv === 'live' ? 'live' : 'demo';
    console.log(`[cTrader WS] Could not auto-detect environment for account ${accountId}, using manual configuration/query parameter: ${finalEnv}`);
    envCache.set(accountId, finalEnv);
    return finalEnv;
}

export const ctraderTickHistoryHandler = async (req: Request, res: Response) => {
    let token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        token = process.env.CTRADER_ACCESS_TOKEN;
    }

    if (!token) {
        return res.status(401).json({ error: 'Missing cTrader access token' });
    }

    const clientId = req.query.clientId as string || process.env.CTRADER_CLIENT_ID;
    const clientSecret = req.query.clientSecret as string || process.env.CTRADER_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        return res.status(400).json({ error: 'cTrader Client ID and Secret not provided. Please configure them in Settings.' });
    }

    const { accountId, environment, symbol, type, fromTimestamp, toTimestamp } = req.query as any;

    if (!accountId || !symbol || !type) {
        return res.status(400).json({ error: 'Missing required parameters: accountId, symbol, type (BID/ASK)' });
    }

    const intAccountId = parseInt(accountId, 10);
    const resolvedEnv = await getOrDetectEnvironment(clientId, clientSecret, token, intAccountId, environment);
    const host = resolvedEnv === 'live' ? 'live.ctraderapi.com' : 'demo.ctraderapi.com';

    const wsClient = new CTraderWSClient({ host, port: 5036 });

    try {
        await wsClient.connect();
        await wsClient.authenticateApp(clientId, clientSecret);
        await wsClient.authenticateAccount(intAccountId, token);

        const symbolsArray = await wsClient.getSymbols(intAccountId);
        const sym = resolveSymbolFuzzy(symbol, symbolsArray);
        const symbolId = sym ? sym.symbolId : 1;

        const tickType = type === 'ASK' ? 2 : 1;
        const fromTs = fromTimestamp ? parseInt(fromTimestamp, 10) : undefined;
        const toTs = toTimestamp ? parseInt(toTimestamp, 10) : undefined;

        const data = await wsClient.getTickData(intAccountId, symbolId, tickType, fromTs, toTs);

        await wsClient.close();
        res.json(data);
    } catch (e: any) {
        await wsClient.close();
        console.error('Error fetching cTrader tick history via WebSocket:', e.stack || e);
        res.status(200).json({ 
            error: e.message || 'Failed to fetch tick history',
            status: 'failed',
            info: 'cTrader WebSocket connection failed. Please ensure your Client ID, Secret, and Access Token are correct in Settings.'
        });
    }
};

export const ctraderStreamHandler = async (req: Request, res: Response) => {
    let token: string | undefined = req.query.token as string;
    
    if (!token) {
        token = process.env.CTRADER_ACCESS_TOKEN;
    }

    const accountIdStr = req.query.accountId as string || process.env.CTRADER_ACCOUNT_ID;
    const environment = req.query.environment as string;
    const symbolsStr = req.query.symbols as string;

    if (!token || !accountIdStr || !symbolsStr) {
        return res.status(400).json({ error: 'Missing required query parameters: token, accountId, symbols' });
    }

    const clientId = req.query.clientId as string || process.env.CTRADER_CLIENT_ID;
    const clientSecret = req.query.clientSecret as string || process.env.CTRADER_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        return res.status(400).json({ error: 'cTrader Client ID and Secret not provided. Please configure them in Settings.' });
    }

    const symbols = symbolsStr.split(',').map(s => s.trim()).filter(Boolean);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const intAccountId = parseInt(accountIdStr, 10);
    const resolvedEnv = await getOrDetectEnvironment(clientId, clientSecret, token, intAccountId, environment);
    const host = resolvedEnv === 'live' ? 'live.ctraderapi.com' : 'demo.ctraderapi.com';

    const wsClient = new CTraderWSClient({ host, port: 5036 });

    req.on('close', async () => {
        try { await wsClient.close(); } catch(e) {}
    });

    try {
        await wsClient.connect();
        await wsClient.authenticateApp(clientId, clientSecret);
        await wsClient.authenticateAccount(intAccountId, token);

        const symbolsArray = await wsClient.getSymbols(intAccountId);
        const validSymbolIds: number[] = [];
        const symbolIdToDetails = new Map<number, { name: string; original: string; digits: number }>();

        for (const symbol of symbols) {
            const sym = resolveSymbolFuzzy(symbol, symbolsArray);
            if (sym) {
                validSymbolIds.push(sym.symbolId);
                symbolIdToDetails.set(sym.symbolId, {
                    name: sym.symbolName,
                    original: symbol,
                    digits: sym.digits || 5
                });
            } else {
                console.warn(`[cTrader Stream] Symbol not resolved: ${symbol}`);
            }
        }

        if (validSymbolIds.length === 0) {
            res.write(`data: ${JSON.stringify({ type: 'error', error: 'None of the requested symbols were found in cTrader' })}\n\n`);
            res.end();
            await wsClient.close();
            return;
        }

        // Attach listener for incoming spot & depth events
        wsClient.onMessage((msg: any) => {
            const payloadType = msg.payloadType;
            const payload = msg.payload || msg;

            if (payloadType === 2131) { // ProtoOASpotEvent
                const details = symbolIdToDetails.get(payload.symbolId);
                if (details) {
                    const divisor = Math.pow(10, details.digits);
                    const bidPrice = payload.bid ? payload.bid / divisor : (payload.bidDecimal || null);
                    const askPrice = payload.ask ? payload.ask / divisor : (payload.askDecimal || null);

                    const spotData = {
                        symbol: details.original || details.name,
                        bid: payload.bid,
                        ask: payload.ask,
                        bidDecimal: bidPrice,
                        askDecimal: askPrice,
                        timestamp: payload.timestamp
                    };
                    res.write(`data: ${JSON.stringify({ type: 'spot', data: spotData })}\n\n`);
                }
            } else if (payloadType === 2155) { // ProtoOADepthEvent (2155)
                const details = symbolIdToDetails.get(payload.symbolId);
                if (details) {
                    const divisor = Math.pow(10, details.digits);
                    const rawQuotes = payload.newQuotes || payload.quotes || payload.depth || [];
                    
                    const bids: [number, number][] = [];
                    const asks: [number, number][] = [];

                    for (const q of rawQuotes) {
                        const price = (q.price || 0) / divisor;
                        const vol = q.volume || 0;
                        if (q.type === 1 || q.side === 'BID' || q.side === 1) {
                            bids.push([price, vol]);
                        } else if (q.type === 2 || q.side === 'ASK' || q.side === 2) {
                            asks.push([price, vol]);
                        }
                    }

                    const depthData = {
                        symbol: details.original || details.name,
                        bids,
                        asks
                    };
                    res.write(`data: ${JSON.stringify({ type: 'depth', data: depthData })}\n\n`);
                }
            }
        });

        // Send subscription requests
        await wsClient.subscribeSpots(intAccountId, validSymbolIds);
        try {
            await wsClient.subscribeDepth(intAccountId, validSymbolIds);
        } catch (depthErr: any) {
            console.warn(`[cTrader Stream] Depth subscription notice:`, depthErr.message);
        }

        res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

    } catch (e: any) {
        console.error('Error in cTrader stream:', e.stack || e);
        res.write(`data: ${JSON.stringify({ type: 'error', error: e.message })}\n\n`);
        res.end();
        try { await wsClient.close(); } catch (err) {}
    }
};

export const ctraderTrendbarsHandler = async (req: Request, res: Response) => {
    let token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        token = process.env.CTRADER_ACCESS_TOKEN;
    }

    if (!token) {
        return res.status(401).json({ error: 'Missing cTrader access token' });
    }

    const clientId = req.query.clientId as string || process.env.CTRADER_CLIENT_ID;
    const clientSecret = req.query.clientSecret as string || process.env.CTRADER_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        return res.status(400).json({ error: 'cTrader Client ID and Secret not provided. Please configure them in Settings.' });
    }

    const { accountId, environment, symbol, period, count } = req.query as any;

    if (!accountId || !symbol || !period) {
        return res.status(400).json({ error: 'Missing required parameters: accountId, symbol, period' });
    }

    const intAccountId = parseInt(accountId, 10);
    const resolvedEnv = await getOrDetectEnvironment(clientId, clientSecret, token, intAccountId, environment);
    const host = resolvedEnv === 'live' ? 'live.ctraderapi.com' : 'demo.ctraderapi.com';

    const wsClient = new CTraderWSClient({ host, port: 5036 });

    try {
        await wsClient.connect();
        await wsClient.authenticateApp(clientId, clientSecret);
        await wsClient.authenticateAccount(intAccountId, token);

        const periodMap: Record<string, number> = {
            'M1': 1, 'M2': 2, 'M3': 3, 'M4': 4, 'M5': 5, 'M10': 6, 'M15': 7, 'M30': 8,
            'H1': 9, 'H4': 10, 'H12': 11, 'D1': 12, 'W1': 13, 'MN1': 14
        };
        const periodEnum = periodMap[period] || 9;

        const symbolsArray = await wsClient.getSymbols(intAccountId);
        const sym = resolveSymbolFuzzy(symbol, symbolsArray);

        if (!sym) {
            await wsClient.close();
            return res.status(404).json({ error: `Symbol ${symbol} not found in cTrader` });
        }

        const symbolId = sym.symbolId;
        console.log(`[cTrader WS] Resolved trendbars symbol "${symbol}" to "${sym.symbolName}" (ID: ${symbolId})`);

        const data = await wsClient.getTrendbars(intAccountId, symbolId, periodEnum, parseInt(count || '100', 10));

        const divisor = Math.pow(10, sym.digits || 5);
        const trendbars = data.trendbar || [];
        
        const candles = trendbars.map((b: any) => {
            const lowNum = Number(b.low || 0);
            return {
                epoch: (b.utcTimestampInMinutes || 0) * 60,
                low: lowNum / divisor,
                open: (lowNum + Number(b.deltaOpen || 0)) / divisor,
                close: (lowNum + Number(b.deltaClose || 0)) / divisor,
                high: (lowNum + Number(b.deltaHigh || 0)) / divisor,
                volume: Number(b.volume || 0)
            };
        });

        await wsClient.close();
        res.json({ candles });

    } catch (e: any) {
        await wsClient.close();
        console.error('Error fetching cTrader trendbars via WebSocket:', e.stack || e);
        res.status(200).json({ 
            error: e.message || 'Failed to fetch trendbars',
            status: 'failed',
            info: 'cTrader WebSocket connection failed. Please ensure your Client ID, Secret, and Access Token are correct in Settings.'
        });
    }
};

