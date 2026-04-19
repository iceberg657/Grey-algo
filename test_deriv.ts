import WebSocket from 'ws';

const ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089');
ws.on('open', () => {
    ws.send(JSON.stringify({ active_symbols: 'brief', product_type: 'basic' }));
});
ws.on('message', (data) => {
    const res = JSON.parse(data);
    if(res.active_symbols) {
        const symbols = res.active_symbols.filter(s => s.symbol.includes('BOOM') || s.symbol.includes('CRASH'));
        console.log("Boom/Crash symbols:", symbols.map(s => s.symbol));
        ws.close();
    } else {
        console.log(res);
    }
})
