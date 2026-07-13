import { Request, Response } from 'express';
import { CTraderConnection, CTraderAuth } from 'ctrader-ts';

export default async function ctraderAccountsHandler(req: Request, res: Response) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Missing cTrader access token' });
    }

    const clientId = process.env.CTRADER_CLIENT_ID;
    const clientSecret = process.env.CTRADER_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        return res.status(500).json({ error: 'cTrader credentials not configured in server' });
    }

    // Try both demo and live environments. Some tokens work for both, others for one.
    // However, usually we just connect to live to query ctidTraderAccount because the API token is tied to the ID.
    const connection = new CTraderConnection({ host: 'live.ctraderapi.com', port: 5036 });

    try {
        await connection.connect();
        const auth = new CTraderAuth(connection);
        
        await auth.authenticateApp(clientId, clientSecret);
        const accounts = await auth.getAccountsByToken(token);
        
        await connection.disconnect();
        
        res.json({ accounts });
    } catch (e: any) {
        connection.disconnect();
        console.error('Error fetching cTrader accounts:', e);
        res.status(500).json({ error: e.message || 'Failed to fetch accounts' });
    }
}
