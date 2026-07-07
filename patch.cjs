const fs = require('fs');
const file = '/app/applet/components/TrendScannerPanel.tsx';
let content = fs.readFileSync(file, 'utf8');

const injection = `
        // Check for FVG in the last 10 candles
        let fvgStatus: 'BULLISH' | 'BEARISH' | 'NONE' = 'NONE';
        for (let i = candles.length - 1; i >= Math.max(0, candles.length - 10); i--) {
            const c1 = candles[i - 2];
            const c3 = candles[i];
            if (c1 && c3) {
                if (c1.high < c3.low) fvgStatus = 'BULLISH';
                else if (c1.low > c3.high) fvgStatus = 'BEARISH';
            }
            if (fvgStatus !== 'NONE') break;
        }

        // Check for Liquidity Pools (Equal Highs / Equal Lows)
        let liquidityPool: 'EQUAL_HIGHS' | 'EQUAL_LOWS' | 'NONE' = 'NONE';
        const maxHigh = Math.max(...recentHighs);
        const minLow = Math.min(...recentLows);
        
        const highsNearMax = recentHighs.filter(h => (maxHigh - h) / maxHigh < 0.0005);
        const lowsNearMin = recentLows.filter(l => (l - minLow) / minLow < 0.0005);
        
        if (highsNearMax.length >= 2) {
            liquidityPool = 'EQUAL_HIGHS';
        } else if (lowsNearMin.length >= 2) {
            liquidityPool = 'EQUAL_LOWS';
        }

        return {
`;

content = content.replace('        return {\n            symbol,', injection + '            symbol,');
// Ensure return includes fvg and liquidityPool
content = content.replace('            isStale,\n            candles\n        };\n    };', '            isStale,\n            candles,\n            fvg: fvgStatus,\n            liquidityPool\n        };\n    };');

fs.writeFileSync(file, content);
