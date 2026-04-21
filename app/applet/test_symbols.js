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
        
        // Output Wall Street / Dow / Nasdaq
        const usRelated = symbols.filter(s => 
            s.display_name.toUpperCase().includes('US') || 
            s.display_name.toUpperCase().includes('WALL STREET') || 
            s.display_name.toUpperCase().includes('DOW') || 
            s.display_name.toUpperCase().includes('NASDAQ') || 
            s.symbol.toUpperCase().includes('OTC') ||
            s.market.includes('indices')
        );
        
        console.log('\n--- SYMBOLS FOUND ---');
        usRelated.forEach(i => console.log(`${i.display_name}: ${i.symbol}`));
        console.log('---------------------');
        process.exit(0);
    }
});
