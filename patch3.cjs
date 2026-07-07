const fs = require('fs');
const file = '/app/applet/components/TrendScannerPanel.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldPromptBlock = `
- Swing Resistance: \${activeAnalysis.resistance.toFixed(4)}
- Math-Model Trend Bias: \${activeAnalysis.trend} (Confluence: \${activeAnalysis.confluenceScore}/100)

RECENT OHLC HISTORICAL CANDLES:
`;

const newPromptBlock = `
- Swing Resistance: \${activeAnalysis.resistance.toFixed(4)}
- Math-Model Trend Bias: \${activeAnalysis.trend} (Confluence: \${activeAnalysis.confluenceScore}/100)
- Institutional Liquidity Pools: \${activeAnalysis.liquidityPool === 'EQUAL_HIGHS' ? 'EQUAL HIGHS DETECTED' : activeAnalysis.liquidityPool === 'EQUAL_LOWS' ? 'EQUAL LOWS DETECTED' : 'None Detected'}
- Institutional Imbalances (FVG): \${activeAnalysis.fvg === 'BULLISH' ? 'BULLISH FVG DETECTED' : activeAnalysis.fvg === 'BEARISH' ? 'BEARISH FVG DETECTED' : 'None Detected'}

RECENT OHLC HISTORICAL CANDLES:
`;

content = content.replace(oldPromptBlock, newPromptBlock);

const oldPromptTask = `
TASK:
Provide a highly professional, short, and punchy strategic trading plan giving a clean setup for the \${timeFrameLabel} timeframe. Strictly keep it to 3 clean sections:
1. **Trend Sentiment Analysis**: Formulate a short argument for why this asset is structurally Bullish or Bearish from an institutional perspective (Smart Money Concepts / order flow / liquidity sweeps).
2. **Key Battle Zones**: Specify a tactical Entry Zone (POIs/Order Blocks) based on EMAs, and exact mathematical Stop Loss and Take Profit zones.
3. **Execution Directive**: Give an immediate operational guideline (e.g., 'WAIT for a pool sweep', 'MARKET ORDER LONG', or 'LIMIT BUY near Support').
`;

const newPromptTask = `
TASK:
Provide a highly professional, short, and punchy strategic trading plan giving a clean setup for the \${timeFrameLabel} timeframe. Strictly keep it to 3 clean sections:
1. **Institutional Trap Analysis**: Formulate a short argument for why this asset is structurally Bullish or Bearish from an institutional perspective (Smart Money Concepts). Focus heavily on analyzing the detected Liquidity Pools and FVGs to identify potential counter-trend Stop Hunts before entry.
2. **Key Battle Zones**: Specify a tactical Entry Zone (POIs/Order Blocks). If Equal Highs/Lows are present, position entries AFTER the expected liquidity sweep. Provide exact mathematical Stop Loss and Take Profit zones.
3. **Execution Directive**: Give an immediate operational guideline emphasizing Lower Timeframe (LTF) Confirmation (e.g., 'Wait for CHoCH on LTF after liquidity sweep', 'LIMIT BUY at FVG mitigation').
`;

content = content.replace(oldPromptTask, newPromptTask);

fs.writeFileSync(file, content);
