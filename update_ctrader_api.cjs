const fs = require('fs');
let content = fs.readFileSync('api/ctrader/marketData.ts', 'utf8');

if (!content.includes('ctraderTrendbarsHandler')) {
    content += `

export const ctraderTrendbarsHandler = async (req: Request, res: Response) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Missing cTrader access token' });
    }

    const clientId = process.env.CTRADER_CLIENT_ID;
    const clientSecret = process.env.CTRADER_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        return res.status(500).json({ error: 'cTrader credentials not configured in server' });
    }

    const { accountId, environment, symbol, period, count } = req.query as any;

    if (!accountId || !symbol || !period) {
        return res.status(400).json({ error: 'Missing required parameters: accountId, symbol, period' });
    }

    try {
        const ct = await connect({
            clientId,
            clientSecret,
            accessToken: token,
            accountId: parseInt(accountId, 10),
            environment: environment === 'live' ? 'live' : 'demo'
        });

        // Convert period string (e.g. M1, M5, H1) to enum value manually since we can't easily import the enum
        const periodMap: Record<string, number> = {
            'M1': 1, 'M2': 2, 'M3': 3, 'M4': 4, 'M5': 5, 'M10': 6, 'M15': 7, 'M30': 8,
            'H1': 9, 'H4': 10, 'H12': 11, 'D1': 12, 'W1': 13, 'MN1': 14
        };
        
        const periodEnum = periodMap[period] || 9; // Default to H1

        // For trendbars, we need the symbol ID, but getTrendbars might take symbol name or ID depending on the library.
        // Wait, CTraderMarket.getTrendbars takes \`symbolId: number\`. 
        // We first need to get the symbol ID.
        let symbolId = 0;
        const symbolsData = await ct.getSymbols();
        const sym = symbolsData.symbols.find(s => s.symbolName === symbol);
        if (!sym) {
            await ct.disconnect();
            return res.status(404).json({ error: \`Symbol \${symbol} not found in cTrader\` });
        }
        symbolId = sym.symbolId;

        const data = await ct.getTrendbars({
            symbolId,
            period: periodEnum,
            count: parseInt(count || '100', 10)
        });

        await ct.disconnect();
        res.json(data);
    } catch (e: any) {
        console.error('Error fetching cTrader trendbars:', e);
        res.status(500).json({ error: e.message || 'Failed to fetch trendbars' });
    }
};
`;
    fs.writeFileSync('api/ctrader/marketData.ts', content);
}
