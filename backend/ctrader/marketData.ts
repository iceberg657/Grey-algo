import { Request, Response } from 'express';
import { connect } from 'ctrader-ts';

export const ctraderTickHistoryHandler = async (req: Request, res: Response) => {
    let token = req.headers.authorization?.split(' ')[1];
    
    // If no user token, check for system token (support both standard and VITE_ prefix)
    if (!token) {
        token = process.env.CTRADER_ACCESS_TOKEN || process.env.VITE_CTRADER_ACCESS_TOKEN;
    }

    if (!token) {
        return res.status(401).json({ error: 'Missing cTrader access token' });
    }

    const clientId = process.env.CTRADER_CLIENT_ID || process.env.VITE_CTRADER_CLIENT_ID;
    const clientSecret = process.env.CTRADER_CLIENT_SECRET || process.env.VITE_CTRADER_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        return res.status(500).json({ error: 'cTrader credentials not configured in server' });
    }

    const { accountId, environment, symbol, type, fromTimestamp, toTimestamp } = req.query as any;

    if (!accountId || !symbol || !type) {
        return res.status(400).json({ error: 'Missing required parameters: accountId, symbol, type (BID/ASK)' });
    }

    try {
        const ct = await connect({
            clientId,
            clientSecret,
            accessToken: token,
            accountId: parseInt(accountId, 10),
            environment: environment === 'live' ? 'live' : 'demo'
        });

        const params: any = { type: type === 'ASK' ? 2 : 1 };
        if (fromTimestamp) params.fromTimestamp = parseInt(fromTimestamp, 10);
        if (toTimestamp) params.toTimestamp = parseInt(toTimestamp, 10);

        const data = await ct.getTickData(symbol, params);

        await ct.disconnect();
        res.json(data);
    } catch (e: any) {
        console.error('Error fetching cTrader tick history:', e);
        res.status(500).json({ error: e.message || 'Failed to fetch tick history' });
    }
};

export const ctraderStreamHandler = async (req: Request, res: Response) => {
    let token: string | undefined = req.query.token as string;
    
    // If no user token, check for system token (support both standard and VITE_ prefix)
    if (!token) {
        token = process.env.CTRADER_ACCESS_TOKEN || process.env.VITE_CTRADER_ACCESS_TOKEN;
    }

    const accountIdStr = req.query.accountId as string || process.env.CTRADER_ACCOUNT_ID || process.env.VITE_CTRADER_ACCOUNT_ID;
    const environment = req.query.environment as string;
    const symbolsStr = req.query.symbols as string;

    if (!token || !accountIdStr || !symbolsStr) {
        return res.status(400).json({ error: 'Missing required query parameters: token, accountId, symbols' });
    }

    const clientId = process.env.CTRADER_CLIENT_ID || process.env.VITE_CTRADER_CLIENT_ID;
    const clientSecret = process.env.CTRADER_CLIENT_SECRET || process.env.VITE_CTRADER_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        return res.status(500).json({ error: 'cTrader credentials not configured in server' });
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
        ct = await connect({
            clientId,
            clientSecret,
            accessToken: token,
            accountId: parseInt(accountIdStr, 10),
            environment: environment === 'live' ? 'live' : 'demo'
        });

        await ct.watchSpots(symbols, (spot: any) => {
            res.write(`data: ${JSON.stringify({ type: 'spot', data: spot })}\n\n`);
        });

        await ct.watchDepth(symbols, (depth: any) => {
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
    
    // If no user token, check for system token (support both standard and VITE_ prefix)
    if (!token) {
        token = process.env.CTRADER_ACCESS_TOKEN || process.env.VITE_CTRADER_ACCESS_TOKEN;
    }

    if (!token) {
        return res.status(401).json({ error: 'Missing cTrader access token' });
    }

    const clientId = process.env.CTRADER_CLIENT_ID || process.env.VITE_CTRADER_CLIENT_ID;
    const clientSecret = process.env.CTRADER_CLIENT_SECRET || process.env.VITE_CTRADER_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        return res.status(500).json({ error: 'cTrader credentials not configured in server' });
    }

    const { accountId, environment, symbol, period, count } = req.query as any;

    if (!accountId || !symbol || !period) {
        return res.status(400).json({ error: 'Missing required parameters: accountId, symbol, period' });
    }

    try {
        const ct = await connect({
            clientId,
            clientSecret,
            accessToken: token,
            accountId: parseInt(accountId, 10),
            environment: environment === 'live' ? 'live' : 'demo'
        });

        // Convert period string (e.g. M1, M5, H1) to enum value manually since we can't easily import the enum
        const periodMap: Record<string, number> = {
            'M1': 1, 'M2': 2, 'M3': 3, 'M4': 4, 'M5': 5, 'M10': 6, 'M15': 7, 'M30': 8,
            'H1': 9, 'H4': 10, 'H12': 11, 'D1': 12, 'W1': 13, 'MN1': 14
        };
        
        const periodEnum = periodMap[period] || 9; // Default to H1

        // For trendbars, we need the symbol ID, but getTrendbars might take symbol name or ID depending on the library.
        // Wait, CTraderMarket.getTrendbars takes `symbolId: number`. 
        // We first need to get the symbol ID.
        let symbolId = 0;
        const symbolsData = await ct.getSymbols();
        const symbolsArray = Array.isArray(symbolsData) 
            ? symbolsData 
            : (symbolsData && (symbolsData as any).symbols ? (symbolsData as any).symbols : []);
        const sym = symbolsArray.find((s: any) => s.symbolName === symbol);
        if (!sym) {
            await ct.disconnect();
            return res.status(404).json({ error: `Symbol ${symbol} not found in cTrader` });
        }
        symbolId = sym.symbolId;

        
        const data = await ct.getTrendbars(symbolId, {
            period: periodEnum,
            count: parseInt(count || '100', 10)
        });

        // Map trendbars to Deriv-like candles format
        // In cTrader, low is the base price, and deltas are added.
        // Usually, prices are scaled by 100,000 for standard forex, but we can also just rely on the relative values if we divide by 100,000
        // Wait, cTrader-ts might not scale it. Let's provide both scaled and unscaled to be safe, or just divide by 100000.
        // Actually, we need the exact symbol's digits to divide correctly, but typically 100000 works for most.
        // Let's get the symbol digits.
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
        res.status(500).json({ error: e.message || 'Failed to fetch trendbars' });
    }
};
