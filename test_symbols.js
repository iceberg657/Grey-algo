import WebSocket from 'ws';

const ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089');

ws.on('open', () => {
    ws.send(JSON.stringify({
        active_symbols: 'brief',
        product_type: 'basic'
    }));
});

ws.on('message', (data) => {
    const res = JSON.parse(data);
    if (res.error) {
        console.error('Error:', res.error);
        process.exit(1);
    }
    if (res.msg_type === 'active_symbols') {
        const symbols = res.active_symbols;
        
        const indices = symbols.filter(s => s.market === 'synthetic_index' || s.market === 'indices' || s.submarket === 'americas_otc' || s.market === 'basket_index');
        console.log('--- INDICES & OTC ---');
        indices.forEach(i => console.log(`${i.display_name}: ${i.symbol} (Market: ${i.market}, Sub: ${i.submarket})`));

        // Let's also find specifically anything with US, Dow, Wall Street, Nasdaq
        const usRelated = symbols.filter(s => s.display_name.includes('US') || s.display_name.includes('Wall Street') || s.display_name.includes('Step') || s.display_name.includes('Crash') || s.display_name.includes('Dow') || s.display_name.includes('Nasdaq') || s.symbol.includes('OTC'));
        console.log('\n--- SPECIFIC SEARCH ---');
        usRelated.forEach(i => console.log(`${i.display_name}: ${i.symbol}`));

        process.exit(0);
    }
});
