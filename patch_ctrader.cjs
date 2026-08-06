const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'node_modules', 'ctrader-ts', 'dist', 'src', 'core', 'connection.js');
let code = fs.readFileSync(filePath, 'utf8');

if (!code.includes('const WebSocket = require("ws");')) {
    code = code.replace(
        'const socket = tls.connect({ host: this.host, port: this.port });',
        `
        const WebSocket = require("ws");
        const ws = new WebSocket(\`wss://\${this.host}:443\`);
        ws.binaryType = 'nodebuffer';
        const socket = new (require('stream').Duplex)({
            write(chunk, encoding, callback) {
                ws.send(chunk, callback);
            },
            read(size) {}
        });
        ws.on('message', (data) => socket.push(data));
        ws.on('open', () => socket.emit('secureConnect'));
        ws.on('close', () => socket.emit('close'));
        ws.on('error', (err) => socket.emit('error', err));
        socket.destroy = () => ws.terminate();
        `
    );
    fs.writeFileSync(filePath, code);
    console.log('Patched ctrader-ts');
} else {
    code = code.replace(
        /wss:\/\/\$\{this\.host\}:5032/g,
        'wss://${this.host}:443'
    );
    fs.writeFileSync(filePath, code);
    console.log('Already patched, ensuring port 443');
}
