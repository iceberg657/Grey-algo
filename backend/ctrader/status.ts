import { Request, Response } from 'express';

export default async function ctraderStatusHandler(req: Request, res: Response) {
    const hasClientId = !!(process.env.CTRADER_CLIENT_ID || process.env.VITE_CTRADER_CLIENT_ID);
    const hasClientSecret = !!(process.env.CTRADER_CLIENT_SECRET || process.env.VITE_CTRADER_CLIENT_SECRET);
    const hasSystemToken = !!(process.env.CTRADER_ACCESS_TOKEN || process.env.VITE_CTRADER_ACCESS_TOKEN);
    const systemAccountId = process.env.CTRADER_ACCOUNT_ID || process.env.VITE_CTRADER_ACCOUNT_ID || null;

    res.json({
        configured: hasClientId && hasClientSecret,
        systemConnected: hasSystemToken,
        systemAccountId: systemAccountId
    });
}
