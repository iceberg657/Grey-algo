import { Request, Response } from 'express';

export default async function handler(req: Request, res: Response) {
    const { code, clientId: manualClientId, clientSecret: manualClientSecret, redirectUri: manualRedirectUri } = req.body;
    
    const clientId = manualClientId || process.env.CTRADER_CLIENT_ID;
    const clientSecret = manualClientSecret || process.env.CTRADER_CLIENT_SECRET;
    const REDIRECT_URI = manualRedirectUri || "https://openapi.ctrader.com";
    
    if (!clientId || !clientSecret) {
        return res.status(400).json({ error: 'cTrader Client ID and Secret not provided. Please configure them in Settings.' });
    }
    if (!code) {
        return res.status(400).json({ error: 'Code is required' });
    }

    try {
        const OAUTH_TOKEN_URL = "https://openapi.ctrader.com/apps/token";

        const params = new URLSearchParams();
        params.append("grant_type", "authorization_code");
        params.append("code", code);
        params.append("redirect_uri", REDIRECT_URI);
        params.append("client_id", clientId);
        params.append("client_secret", clientSecret);

        const response = await fetch(OAUTH_TOKEN_URL, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json' 
            },
            body: params.toString()
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
