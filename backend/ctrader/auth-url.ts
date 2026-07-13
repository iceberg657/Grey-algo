import { Request, Response } from 'express';

export default async function handler(_req: Request, res: Response) {
    const clientId = process.env.CTRADER_CLIENT_ID || process.env.VITE_CTRADER_CLIENT_ID;
    if (!clientId) {
        return res.status(500).json({ error: 'CTRADER_CLIENT_ID environment variable not configured on server (Vercel). Please add it in your Vercel project settings.' });
    }
    // Hardcoded REDIRECT_URI to spotware's default, so users can just paste the resulting URL
    const REDIRECT_URI = "https://openapi.ctrader.com";
    const url = new URL("https://id.ctrader.com/my/settings/openapi/grantingaccess/");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", REDIRECT_URI);
    url.searchParams.set("scope", "trading");
    url.searchParams.set("product", "web");
    res.json({ authUrl: url.toString() });
}
