const WebSocket = require('ws');

// Simple test client to verify bridge and kernel connectivity
const ws = new WebSocket('ws://localhost:5000');

ws.on('open', () => {
    console.log('[Test] Connection established');
    
    // 1. Send Ping
    console.log('[Test] Sending ping...');
    ws.send(JSON.stringify({ cmd: 'ping', _req_id: 'ping-id' }));
    
    // 2. Send Ghostfetch after a delay
    setTimeout(() => {
        console.log('[Test] Sending ghostfetch...');
        ws.send(JSON.stringify({ cmd: 'ghostfetch', _req_id: 'fetch-id' }));
    }, 1000);
    
    // 3. Send Process Spawn
    setTimeout(() => {
        console.log('[Test] Sending spawn...');
        ws.send(JSON.stringify({ cmd: 'spawn', name: 'browser_task', burst: 12, _req_id: 'spawn-id' }));
    }, 2000);
});

ws.on('message', (data) => {
    const response = JSON.parse(data.toString());
    console.log('[Test] Received Message Type:', response.type);
    if (response.type === 'kernel_output') {
        console.log('[Test] Kernel Data:', response.payload);
    } else if (response.type === 'system_stats') {
       // console.log('[Test] Resource Stats:', response.payload);
    } else {
        console.log('[Test] System Data:', response.payload);
    }
});

ws.on('error', (err) => {
    console.error('[Test] WebSocket error:', err.message);
});

// Auto-exit after 5 seconds of testing
setTimeout(() => {
    console.log('[Test] Test completed. Shutting down.');
    ws.close();
    process.exit(0);
}, 10000);
