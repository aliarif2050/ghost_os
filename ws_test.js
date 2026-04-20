const WebSocket = require('ws');
const fs = require('fs');

const ws = new WebSocket('ws://localhost:5000');
ws.on('open', () => {
    ws.send(JSON.stringify({ cmd: 'experiment_run', _req_id: "xyz" }));
});
ws.on('message', (data) => {
    try {
        const msg = JSON.parse(data);
        if (msg.type === 'kernel_output' && msg.payload && msg.payload._req_id === 'xyz') {
            fs.mkdirSync('./report/results', { recursive: true });
            fs.writeFileSync('./report/results/experiment_results.json', JSON.stringify(msg.payload.results, null, 2));
            console.log("Done");
            process.exit(0);
        }
    } catch(e) {}
});
setTimeout(() => process.exit(1), 10000);
