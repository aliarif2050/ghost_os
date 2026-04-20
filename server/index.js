const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const cors = require('cors');
const bridge = require('./bridge');

const app = express();
const server = http.createServer(app);
// Attach WebSocket Server to the HTTP server
const wss = new WebSocketServer({ server });

const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Start the C++ Kernel Engine via the bridge
bridge.start();

/**
 * Broadcasts a message to all connected WebSocket clients.
 */
function broadcast(data) {
    const payload = JSON.stringify(data);
    wss.clients.forEach(client => {
        if (client.readyState === 1) { // WebSocket.OPEN
            client.send(payload);
        }
    });
}

// Listen for messages from the kernel and forward to all frontend clients
bridge.onMessage((json) => {
    broadcast({ 
        type: 'kernel_output', 
        payload: json,
        timestamp: Date.now() 
    });
});

// Listen for resource stats (CPU/RAM) and forward to frontend
bridge.onStat((stats) => {
    broadcast({ 
        type: 'system_stats', 
        payload: stats 
    });
});

// API Routes
app.get('/health', (req, res) => {
    res.json({ 
        status: 'online', 
        kernel: bridge.status, 
        uptime: process.uptime() 
    });
});

// WebSocket Event Handlers
wss.on('connection', (ws) => {
    console.log(`[Server] Client connected. Total: ${wss.clients.size}`);
    
    // Welcome message
    ws.send(JSON.stringify({ 
        type: 'system_info', 
        payload: { 
            msg: 'Bridge Protocol Established', 
            engine_status: bridge.status 
        } 
    }));

    // Handle messages FROM frontend
    ws.on('message', (message) => {
        try {
            const command = JSON.parse(message.toString());
            // Filter out verbose telemetry for cleaner terminal
            if (command.cmd !== 'ps' && command.cmd !== 'mem_map') {
                console.log('[Server] Command received:', command);
            }
            
            // Pipe command directly to C++ engine
            const success = bridge.sendCommand(command);
            if (!success) {
                ws.send(JSON.stringify({ 
                    type: 'error', 
                    payload: { msg: 'Failed to deliver command to kernel engine' } 
                }));
            }
        } catch (e) {
            console.error('[Server] Invalid message format from client');
        }
    });

    ws.on('close', () => {
        console.log(`[Server] Client disconnected. Remaining: ${wss.clients.size}`);
    });
});

// Error handling for unconventional shutdowns
process.on('SIGINT', () => {
    console.log('[Server] Shutting down gracefully...');
    bridge.stopStats();
    server.close(() => {
        process.exit(0);
    });
});

server.listen(PORT, () => {
    console.log('================================================');
    console.log(`🚀 GHOSTKERNEL BRIDGE RUNNING ON PORT ${PORT}`);
    console.log(`🔗 WS Entry: ws://localhost:${PORT}`);
    console.log('================================================');
});
