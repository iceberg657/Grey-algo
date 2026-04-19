import WebSocket from 'ws';

const ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089');
ws.on('open', () => {
    ws.send(JSON.stringify({ ticks: 'BOOM1000' }));
});
ws.on('message', (data) => {
    const res = JSON.parse(data);
    console.log(res);
    ws.close();
})
