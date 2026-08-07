import { Request, Response } from 'express';
import { CTraderWSClient } from './wsClient.js';

export default async function ctraderAccountsHandler(req: Request, res: Response) {
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

    const envQuery = (req.query.environment as string || '').toLowerCase();
    const primaryHost = envQuery === 'demo' ? 'demo.ctraderapi.com' : 'live.ctraderapi.com';
    const secondaryHost = primaryHost === 'live.ctraderapi.com' ? 'demo.ctraderapi.com' : 'live.ctraderapi.com';

    let wsClient = new CTraderWSClient({ host: primaryHost, port: 5036, timeoutMs: 6000 });

    try {
        await wsClient.connect();
        await wsClient.authenticateApp(clientId, clientSecret);
        const accounts = await wsClient.getAccountsByToken(token);
        await wsClient.close();
        return res.json({ accounts });
    } catch (e: any) {
        console.warn(`[cTrader Accounts] Failed on ${primaryHost}, trying ${secondaryHost}:`, e.message || e);
        try { await wsClient.close(); } catch (_) {}
    }

    wsClient = new CTraderWSClient({ host: secondaryHost, port: 5036, timeoutMs: 6000 });
    try {
        await wsClient.connect();
        await wsClient.authenticateApp(clientId, clientSecret);
        const accounts = await wsClient.getAccountsByToken(token);
        await wsClient.close();
        return res.json({ accounts });
    } catch (e: any) {
        try { await wsClient.close(); } catch (_) {}
        console.error('Error fetching cTrader accounts via WebSocket:', e.stack || e);
        return res.status(200).json({ 
            error: e.message || 'Failed to fetch accounts',
            status: 'failed',
            info: 'cTrader WebSocket connection failed. Please ensure your Client ID, Secret, and Access Token are correct in Settings.'
        });
    }
}

