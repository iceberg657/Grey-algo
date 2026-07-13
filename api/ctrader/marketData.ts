import { Request, Response } from 'express';
import { connect } from 'ctrader-ts';

export const ctraderTickHistoryHandler = async (req: Request, res: Response) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Missing cTrader access token' });
    }

    const clientId = process.env.CTRADER_CLIENT_ID;
    const clientSecret = process.env.CTRADER_CLIENT_SECRET;

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

        const params: any = { type: type === 'ASK' ? 'ASK' : 'BID' };
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
    const token = req.query.token as string;
    const accountIdStr = req.query.accountId as string;
    const environment = req.query.environment as string;
    const symbolsStr = req.query.symbols as string;

    if (!token || !accountIdStr || !symbolsStr) {
        return res.status(400).json({ error: 'Missing required query parameters: token, accountId, symbols' });
    }

    const clientId = process.env.CTRADER_CLIENT_ID;
    const clientSecret = process.env.CTRADER_CLIENT_SECRET;

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
