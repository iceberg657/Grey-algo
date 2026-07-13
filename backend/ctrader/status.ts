import { Request, Response } from 'express';

export default async function ctraderStatusHandler(_req: Request, res: Response) {
    const clientId = process.env.CTRADER_CLIENT_ID || process.env.VITE_CTRADER_CLIENT_ID;
    const clientSecret = process.env.CTRADER_CLIENT_SECRET || process.env.VITE_CTRADER_CLIENT_SECRET;
    const accessToken = process.env.CTRADER_ACCESS_TOKEN || process.env.VITE_CTRADER_ACCESS_TOKEN;
    const accountId = process.env.CTRADER_ACCOUNT_ID || process.env.VITE_CTRADER_ACCOUNT_ID;

    res.json({
        configured: !!(clientId && clientSecret),
        systemConnected: !!accessToken,
        systemAccountId: accountId || null,
        debug: {
            hasClientId: !!clientId,
            hasClientSecret: !!clientSecret,
            hasAccessToken: !!accessToken,
            hasAccountId: !!accountId,
            envKeys: Object.keys(process.env).filter(k => k.includes('CTRADER'))
        }
    });
}
