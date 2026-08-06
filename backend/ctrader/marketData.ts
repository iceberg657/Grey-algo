import { Request, Response } from 'express';
import { connect, CTraderConnection, CTraderAuth } from 'ctrader-ts';

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
    const connection = new CTraderConnection({ host: 'live.ctraderapi.com', port: 5035 });
    try {
        await connection.connect();
        const auth = new CTraderAuth(connection);
        await auth.authenticateApp(clientId, clientSecret);
        const accounts = await auth.getAccountsByToken(token);
        await connection.disconnect();
        
        const matchingAccount = accounts.find((acc: any) => acc.ctidTraderAccountId === accountId);
        if (matchingAccount) {
            console.log(`[cTrader] Auto-detected environment for account ${accountId}: ${matchingAccount.isLive ? 'live' : 'demo'}`);
            return matchingAccount.isLive ? 'live' : 'demo';
        }
    } catch (e: any) {
        console.warn(`[cTrader] Error detecting environment from live server for account ${accountId}, trying demo server...`, e.message || e);
        try { await connection.disconnect(); } catch (_) {}
    }

    // Try demo connection to be thorough
    const demoConnection = new CTraderConnection({ host: 'demo.ctraderapi.com', port: 5035 });
    try {
        await demoConnection.connect();
        const auth = new CTraderAuth(demoConnection);
        await auth.authenticateApp(clientId, clientSecret);
        const accounts = await auth.getAccountsByToken(token);
        await demoConnection.disconnect();
        
        const matchingAccount = accounts.find((acc: any) => acc.ctidTraderAccountId === accountId);
        if (matchingAccount) {
            console.log(`[cTrader] Auto-detected environment (Demo server) for account ${accountId}: ${matchingAccount.isLive ? 'live' : 'demo'}`);
            return matchingAccount.isLive ? 'live' : 'demo';
        }
    } catch (e: any) {
        console.warn(`[cTrader] Error detecting environment from demo server for account ${accountId}:`, e.message || e);
        try { await demoConnection.disconnect(); } catch (_) {}
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
    console.log(`[cTrader] Could not auto-detect environment for account ${accountId}, using manual configuration/query parameter: ${finalEnv}`);
    envCache.set(accountId, finalEnv);
    return finalEnv;
}

export const ctraderTickHistoryHandler = async (req: Request, res: Response) => {
    let token = req.headers.authorization?.split(' ')[1];
    
    // If no user token, check for system token
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

    try {
        const intAccountId = parseInt(accountId, 10);
        const resolvedEnv = await getOrDetectEnvironment(clientId, clientSecret, token, intAccountId, environment);

        const ct = await connect({
            clientId,
            clientSecret,
            accessToken: token,
            accountId: intAccountId,
            environment: resolvedEnv
        });

        const params: any = { type: type === 'ASK' ? 2 : 1 };
        if (fromTimestamp) params.fromTimestamp = parseInt(fromTimestamp, 10);
        if (toTimestamp) params.toTimestamp = parseInt(toTimestamp, 10);

        // Fetch symbols list and find matching symbol (with fuzzy matching fallback)
        let resolvedSymbol = symbol;
        try {
            const symbolsData = await ct.getSymbols();
            const symbolsArray = Array.isArray(symbolsData) 
                ? symbolsData 
                : (symbolsData && (symbolsData as any).symbols ? (symbolsData as any).symbols : []);
            
            const sym = resolveSymbolFuzzy(symbol, symbolsArray);
            if (sym) {
                resolvedSymbol = sym.symbolName;
                console.log(`[cTrader] Resolved tick history symbol "${symbol}" to "${resolvedSymbol}"`);
            }
        } catch (symError) {
            console.warn('[cTrader] Symbol lookup/resolution failed, using raw symbol:', symError);
        }

        const data = await ct.getTickData(resolvedSymbol, params);

        await ct.disconnect();
        res.json(data);
    } catch (e: any) {
        console.error('Error fetching cTrader tick history:', e);
        res.status(200).json({ 
            error: e.message || 'Failed to fetch tick history',
            status: 'failed',
            info: 'cTrader connection failed. Please ensure your Client ID, Secret, and Access Token are correct in Settings.'
        });
    }
};

export const ctraderStreamHandler = async (req: Request, res: Response) => {
    let token: string | undefined = req.query.token as string;
    
    // If no user token, check for system token
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

    let ct: any = null;

    req.on('close', async () => {
        if (ct) {
            try {
                await ct.disconnect();
            } catch(e) {}
        }
    });

    try {
        const intAccountId = parseInt(accountIdStr, 10);
        const resolvedEnv = await getOrDetectEnvironment(clientId, clientSecret, token, intAccountId, environment);

        ct = await connect({
            clientId,
            clientSecret,
            accessToken: token,
            accountId: intAccountId,
            environment: resolvedEnv
        });

        const symbolsData = await ct.getSymbols();
        const symbolsArray = Array.isArray(symbolsData) 
            ? symbolsData 
            : (symbolsData && (symbolsData as any).symbols ? (symbolsData as any).symbols : []);

        const validSymbols: string[] = [];
        const originalNameMap: Record<string, string> = {};

        for (const symbol of symbols) {
            const sym = resolveSymbolFuzzy(symbol, symbolsArray);
            if (sym) {
                validSymbols.push(sym.symbolName);
                originalNameMap[sym.symbolName] = symbol;
            } else {
                console.warn(`[cTrader Stream] Symbol not found for ${symbol}`);
            }
        }

        if (validSymbols.length === 0) {
            res.write(`data: ${JSON.stringify({ type: 'error', error: 'System Anomaly: cTrader Error: None of the specified symbols were found in cTrader' })}\n\n`);
            res.end();
            await ct.disconnect();
            return;
        }

        await ct.watchSpots(validSymbols, (spot: any) => {
            spot.symbol = originalNameMap[spot.symbol] || spot.symbol;
            res.write(`data: ${JSON.stringify({ type: 'spot', data: spot })}\n\n`);
        });

        await ct.watchDepth(validSymbols, (depth: any) => {
            depth.symbol = originalNameMap[depth.symbol] || depth.symbol;
            res.write(`data: ${JSON.stringify({ type: 'depth', data: depth })}\n\n`);
        });

        res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

    } catch (e: any) {
        console.error('Error in cTrader stream:', e);
        res.write(`data: ${JSON.stringify({ type: 'error', error: e.message })}\n\n`);
        res.end();
        if (ct) {
            try { await ct.disconnect(); } catch (err) {}
        }
    }
};

export const ctraderTrendbarsHandler = async (req: Request, res: Response) => {
    let token = req.headers.authorization?.split(' ')[1];
    
    // If no user token, check for system token
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

    try {
        const intAccountId = parseInt(accountId, 10);
        const resolvedEnv = await getOrDetectEnvironment(clientId, clientSecret, token, intAccountId, environment);

        const ct = await connect({
            clientId,
            clientSecret,
            accessToken: token,
            accountId: intAccountId,
            environment: resolvedEnv
        });

        // Convert period string (e.g. M1, M5, H1) to enum value manually since we can't easily import the enum
        const periodMap: Record<string, number> = {
            'M1': 1, 'M2': 2, 'M3': 3, 'M4': 4, 'M5': 5, 'M10': 6, 'M15': 7, 'M30': 8,
            'H1': 9, 'H4': 10, 'H12': 11, 'D1': 12, 'W1': 13, 'MN1': 14
        };
        
        const periodEnum = periodMap[period] || 9; // Default to H1

        let symbolId = 0;
        const symbolsData = await ct.getSymbols();
        const symbolsArray = Array.isArray(symbolsData) 
            ? symbolsData 
            : (symbolsData && (symbolsData as any).symbols ? (symbolsData as any).symbols : []);
        
        const sym = resolveSymbolFuzzy(symbol, symbolsArray);
        
        if (!sym) {
            await ct.disconnect();
            return res.status(404).json({ error: `Symbol ${symbol} not found in cTrader` });
        }
        symbolId = sym.symbolId;
        console.log(`[cTrader] Resolved trendbars symbol "${symbol}" to "${sym.symbolName}" (ID: ${symbolId})`);

        const data = await ct.getTrendbars(symbolId, {
            period: periodEnum,
            count: parseInt(count || '100', 10)
        });

        const divisor = Math.pow(10, sym.digits || 5);
        
        const candles = data.trendbars.map((b: any) => {
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

        await ct.disconnect();
        res.json({ candles });

    } catch (e: any) {
        console.error('Error fetching cTrader trendbars:', e);
        res.status(200).json({ 
            error: e.message || 'Failed to fetch trendbars',
            status: 'failed',
            info: 'cTrader connection failed. Please ensure your Client ID, Secret, and Access Token are correct in Settings.'
        });
    }
};
