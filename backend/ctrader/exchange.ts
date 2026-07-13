import { Request, Response } from 'express';

export default async function handler(req: Request, res: Response) {
    const clientId = process.env.CTRADER_CLIENT_ID || process.env.VITE_CTRADER_CLIENT_ID;
    const clientSecret = process.env.CTRADER_CLIENT_SECRET || process.env.VITE_CTRADER_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
        return res.status(500).json({ error: 'cTrader credentials (CTRADER_CLIENT_ID and CTRADER_CLIENT_SECRET) not configured in Vercel environment variables.' });
    }

    const { code } = req.body;
    if (!code) {
        return res.status(400).json({ error: 'Code is required' });
    }

    try {
        const OAUTH_TOKEN_URL = "https://openapi.ctrader.com/apps/token";
        const REDIRECT_URI = "https://openapi.ctrader.com";

        const url = new URL(OAUTH_TOKEN_URL);
        url.searchParams.set("grant_type", "authorization_code");
        url.searchParams.set("code", code);
        url.searchParams.set("redirect_uri", REDIRECT_URI);
        url.searchParams.set("client_id", clientId);
        url.searchParams.set("client_secret", clientSecret);

        const response = await fetch(url.toString(), {
            headers: { Accept: "application/json" },
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status} from token endpoint`);
        }

        const body: any = await response.json();
        if (body.errorCode) {
            throw new Error(`${body.errorCode}: ${body.description}`);
        }

        if (!body.accessToken) {
            throw new Error(`Invalid response: ${JSON.stringify(body)}`);
        }

        res.json({
            accessToken: body.accessToken,
            refreshToken: body.refreshToken,
            tokenType: body.tokenType,
            expiresIn: body.expiresIn
        });
    } catch (e: any) {
        console.error('Error exchanging cTrader token:', e);
        res.status(500).json({ error: e.message || 'Failed to exchange token' });
    }
}
