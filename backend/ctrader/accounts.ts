import { Request, Response } from 'express';
import { CTraderConnection, CTraderAuth } from 'ctrader-ts';

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

    // Try live server first
    try {
        const liveConn = new CTraderConnection({ host: 'live.ctraderapi.com', port: 5035 });
        await liveConn.connect();
        const auth = new CTraderAuth(liveConn);
        await auth.authenticateApp(clientId, clientSecret);
        const accounts = await auth.getAccountsByToken(token);
        await liveConn.disconnect();
        
        if (accounts && accounts.length > 0) {
            return res.json({ accounts });
        }
    } catch (e: any) {
        console.error("ACCOUNTS ENDPOINT ERROR:", e);
        if (e.message?.includes('CH_ACCESS_TOKEN_INVALID') || e.message?.includes('Invalid access token')) {
            return res.status(200).json({ 
                error: 'Invalid cTrader access token. Please re-authorize cTrader in Settings to obtain a fresh token.',
                isInvalidToken: true,
                status: 'failed'
            });
        }
        console.warn('[cTrader Accounts] Live server connect failed, attempting demo server fallback...', e.message || e);
    }

    // Try demo server fallback
    try {
        const demoConn = new CTraderConnection({ host: 'demo.ctraderapi.com', port: 5035 });
        await demoConn.connect();
        const auth = new CTraderAuth(demoConn);
        await auth.authenticateApp(clientId, clientSecret);
        const accounts = await auth.getAccountsByToken(token);
        await demoConn.disconnect();
        
        return res.json({ accounts: accounts || [] });
    } catch (e: any) {
        console.error("ACCOUNTS ENDPOINT ERROR:", e);
        const isInvalidToken = e.message?.includes('CH_ACCESS_TOKEN_INVALID') || e.message?.includes('Invalid access token');
        const userMsg = isInvalidToken
            ? 'Invalid cTrader access token. Please re-authorize cTrader in Settings to obtain a fresh token.'
            : (e.message || 'Failed to fetch accounts');
            
        console.warn(`[cTrader Accounts] Demo server error:`, e.message || e);
        
        return res.status(200).json({ 
            error: userMsg,
            isInvalidToken,
            status: 'failed',
            info: 'cTrader connection failed. Please ensure your Client ID, Secret, and Access Token are correct in Settings.'
        });
    }
}
