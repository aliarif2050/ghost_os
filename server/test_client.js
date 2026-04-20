const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:5000');

ws.on('open', () => {
    console.log('[Test] Client: Connection established');
    ws.send(JSON.stringify({ cmd: 'ping', _req_id: 'ping-1' }));
    
    setTimeout(() => {
        ws.send(JSON.stringify({ cmd: 'ghostfetch', _req_id: 'fetch-1' }));
    }, 1000);
});

ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    console.log('[Test] Received Message Type:', msg.type);
    if (msg.type === 'kernel_output') {
        console.log('[Test] Kernel Data:', msg.payload);
        if (msg.payload._req_id === 'fetch-1') {
            console.log('[Test] PASSED: Received ghostfetch output');
            ws.close();
            process.exit(0);
        }
    }
});

ws.on('error', (err) => {
    console.error('[Test] WebSocket error:', err.message);
    process.exit(1);
});

setTimeout(() => {
    console.error('[Test] TIMEOUT: Did not receive ghostfetch response');
    process.exit(1);
}, 10000);
