const fs = require('fs');
let content = fs.readFileSync('components/SniperLiveTrade.tsx', 'utf8');

const targetMethod = `    const fetchLivePrice = async (symbol: string, style: string = 'scalping') => {`;

const startIdx = content.indexOf(targetMethod);
if (startIdx !== -1) {
    console.log("Found fetchLivePrice");
} else {
    console.log("fetchLivePrice not found!");
}
