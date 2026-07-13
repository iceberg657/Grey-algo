import { Request, Response } from 'express';

export default async function handler(req: Request, res: Response) {
    const clientId = req.query.clientId as string || process.env.CTRADER_CLIENT_ID;
    const REDIRECT_URI = req.query.redirectUri as string || "https://openapi.ctrader.com";
    
    if (!clientId) {
        return res.status(400).json({ error: 'cTrader Client ID not provided. Please configure it in Settings.' });
    }
    const url = new URL("https://id.ctrader.com/my/settings/openapi/grantingaccess/");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", REDIRECT_URI);
    url.searchParams.set("scope", "trading");
    url.searchParams.set("product", "web");
    res.json({ authUrl: url.toString() });
}
