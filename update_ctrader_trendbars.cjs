const fs = require('fs');
let content = fs.readFileSync('api/ctrader/marketData.ts', 'utf8');

const replacement = `
        const data = await ct.getTrendbars({
            symbolId,
            period: periodEnum,
            count: parseInt(count || '100', 10)
        });

        // Map trendbars to Deriv-like candles format
        // In cTrader, low is the base price, and deltas are added.
        // Usually, prices are scaled by 100,000 for standard forex, but we can also just rely on the relative values if we divide by 100,000
        // Wait, cTrader-ts might not scale it. Let's provide both scaled and unscaled to be safe, or just divide by 100000.
        // Actually, we need the exact symbol's digits to divide correctly, but typically 100000 works for most.
        // Let's get the symbol digits.
        const divisor = Math.pow(10, sym.digits || 5);
        
        const candles = data.trendbars.map((b: any) => {
            const lowNum = Number(b.low || 0);
            return {
                epoch: (b.utcTimestampInMinutes || 0) * 60,
                low: lowNum / divisor,
                open: (lowNum + Number(b.deltaOpen || 0)) / divisor,
                close: (lowNum + Number(b.deltaClose || 0)) / divisor,
                high: (lowNum + Number(b.deltaHigh || 0)) / divisor,
                volume: Number(b.volume || 0)
            };
        });

        await ct.disconnect();
        res.json({ candles });
`;

content = content.replace(/const data = await ct\.getTrendbars\(\{[^]*?await ct\.disconnect\(\);\n        res\.json\(data\);/m, replacement);

fs.writeFileSync('api/ctrader/marketData.ts', content);
