import { Request, Response } from 'express';
import { CTraderConnection, CTraderAuth } from 'ctrader-ts';

export default async function ctraderAccountsHandler(req: Request, res: Response) {
    let token = req.headers.authorization?.split(' ')[1] || (req.query.token as string);
    
    // Sanitize token string
    if (token === 'undefined' || token === 'null' || !token?.trim()) {
        token = process.env.CTRADER_ACCESS_TOKEN;
    }

    if (!token || token === 'undefined' || token === 'null' || !token.trim()) {
        return res.status(401).json({ 
            error: 'Missing cTrader access token. Please authorize your cTrader account in Settings.',
            status: 'failed'
        });
    }

    const clientId = (req.query.clientId as string) || process.env.CTRADER_CLIENT_ID;
    const clientSecret = (req.query.clientSecret as string) || process.env.CTRADER_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        return res.status(400).json({ 
            error: 'cTrader Client ID and Secret not provided. Please configure them in Settings.',
            status: 'failed'
        });
    }

    const allAccounts: any[] = [];
    const accountIds = new Set<number>();
    const errors: string[] = [];

    // Query live environment
    try {
        const liveConn = new CTraderConnection({ host: 'live.ctraderapi.com', port: 5035 });
        await liveConn.connect();
        const liveAuth = new CTraderAuth(liveConn);
        await liveAuth.authenticateApp(clientId, clientSecret);
        const liveAccs = await liveAuth.getAccountsByToken(token);
        await liveConn.disconnect();

        if (Array.isArray(liveAccs)) {
            for (const acc of liveAccs) {
                const rawId = acc.ctidTraderAccountId ?? acc.traderAccountId ?? acc.accountId ?? (typeof acc === 'number' || typeof acc === 'string' ? acc : null);
                const accId = rawId !== null && rawId !== undefined ? Number(rawId.toString ? rawId.toString() : rawId) : null;
                if (accId && !isNaN(accId) && !accountIds.has(accId)) {
                    accountIds.add(accId);
                    allAccounts.push({
                        ...acc,
                        ctidTraderAccountId: accId,
                        isLive: acc.isLive !== false
                    });
                }
            }
        }
    } catch (e: any) {
        console.warn('[cTrader accounts] Live server error:', e.message || e);
        errors.push(`Live: ${e.message || 'Connection failed'}`);
    }

    // Query demo environment
    try {
        const demoConn = new CTraderConnection({ host: 'demo.ctraderapi.com', port: 5035 });
        await demoConn.connect();
        const demoAuth = new CTraderAuth(demoConn);
        await demoAuth.authenticateApp(clientId, clientSecret);
        const demoAccs = await demoAuth.getAccountsByToken(token);
        await demoConn.disconnect();

        if (Array.isArray(demoAccs)) {
            for (const acc of demoAccs) {
                const rawId = acc.ctidTraderAccountId ?? acc.traderAccountId ?? acc.accountId ?? (typeof acc === 'number' || typeof acc === 'string' ? acc : null);
                const accId = rawId !== null && rawId !== undefined ? Number(rawId.toString ? rawId.toString() : rawId) : null;
                if (accId && !isNaN(accId) && !accountIds.has(accId)) {
                    accountIds.add(accId);
                    allAccounts.push({
                        ...acc,
                        ctidTraderAccountId: accId,
                        isLive: acc.isLive === true
                    });
                }
            }
        }
    } catch (e: any) {
        console.warn('[cTrader accounts] Demo server error:', e.message || e);
        errors.push(`Demo: ${e.message || 'Connection failed'}`);
    }

    if (allAccounts.length > 0) {
        return res.json({ accounts: allAccounts, status: 'success' });
    }

    // If no accounts found
    const combinedError = errors.length > 0 ? errors.join(' | ') : 'No trading accounts found for this access token.';
    return res.status(400).json({ 
        error: combinedError,
        status: 'failed',
        info: 'Failed to fetch cTrader accounts. Please verify your Client ID, Client Secret, and Access Token in Settings.'
    });
}

