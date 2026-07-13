import { Request, Response } from 'express';

export default async function handler(req: Request, res: Response) {
    const { code, clientId: manualClientId, clientSecret: manualClientSecret } = req.body;
    
    const clientId = manualClientId || process.env.CTRADER_CLIENT_ID || process.env.VITE_CTRADER_CLIENT_ID;
    const clientSecret = manualClientSecret || process.env.CTRADER_CLIENT_SECRET || process.env.VITE_CTRADER_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
        return res.status(400).json({ error: 'cTrader Client ID and Secret not provided. Please configure them in Settings.' });
    }
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
        // Returning 200 with error field so the frontend receives "information" instead of a raw 500 crash
        res.status(200).json({ 
            error: e.message || 'Failed to exchange token',
            status: 'failed',
            info: 'cTrader token exchange failed. Please ensure your Client ID and Secret are correct in Settings.'
        });
    }
}
