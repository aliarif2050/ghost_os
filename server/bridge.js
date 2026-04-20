const { spawn } = require('child_process');
const path = require('path');
const pidusage = require('pidusage');

/**
 * Bridge class manages the lifecycle of the C++ Kernel Engine.
 * It handles process spawning, IPC (stdin/stdout), and resource monitoring.
 */
class Bridge {
    constructor() {
        this.kernel = null;
        this.status = 'offline';
        this.onMessageCallback = null;
        this.onStatCallback = null;
        this.statsInterval = null;
    }

    /**
     * Spawns the ghostkernel_engine process.
     */
    start() {
        const enginePath = path.join(__dirname, '../kernel/build/ghostkernel_engine.exe');
        
        console.log(`[Bridge] Attaching to GhostKernel Engine at: ${enginePath}`);
        
        try {
            this.kernel = spawn(enginePath, [], {
                cwd: path.join(__dirname, '../kernel/build')
            });

            this.status = 'online';

            // Handle incoming data from the kernel (stdout)
            this.kernel.stdout.on('data', (data) => {
                const chunks = data.toString().split('\n');
                for (const chunk of chunks) {
                    if (chunk.trim()) {
                        try {
                            const json = JSON.parse(chunk);
                            if (this.onMessageCallback) this.onMessageCallback(json);
                        } catch (e) {
                            // Non-JSON output (like debug prints) is logged but not forwarded
                            console.log(`[Kernel Log] ${chunk.trim()}`);
                        }
                    }
                }
            });

            // Handle errors from the kernel (stderr)
            this.kernel.stderr.on('data', (data) => {
                console.error(`[Kernel Stderr] ${data.toString().trim()}`);
            });

            // Handle process exit
            this.kernel.on('close', (code) => {
                console.warn(`[Bridge] Kernel process exited with code ${code}`);
                this.status = 'offline';
                this.stopStats();
                this.kernel = null;
            });

            // Start resource monitoring
            this.startStats();

        } catch (error) {
            console.error('[Bridge] Failed to spawn kernel engine:', error);
            this.status = 'error';
        }
    }

    /**
     * Send a JSON command to the kernel via stdin.
     */
    sendCommand(cmd) {
        if (!this.kernel || this.status !== 'online') {
            console.error('[Bridge] Cannot send command: Kernel is offline');
            return false;
        }
        
        // Ensure command has a newline for the kernel's getline()
        const payload = JSON.stringify(cmd) + '\n';
        this.kernel.stdin.write(payload);
        return true;
    }

    /**
     * Periodically collect CPU and Memory usage statistics.
     */
    startStats() {
        if (this.statsInterval) clearInterval(this.statsInterval);
        
        this.statsInterval = setInterval(async () => {
            if (this.kernel && this.kernel.pid) {
                try {
                    const stats = await pidusage(this.kernel.pid);
                    if (this.onStatCallback) this.onStatCallback({
                        cpu: stats.cpu,
                        memory: stats.memory,
                        elapsed: stats.elapsed,
                        timestamp: Date.now()
                    });
                } catch (e) {
                    // Process likely ended during stats collection
                }
            }
        }, 1000); // 1 second interval for smooth dashboard updates
    }

    stopStats() {
        if (this.statsInterval) clearInterval(this.statsInterval);
    }

    /**
     * Event registration helpers
     */
    onMessage(cb) { this.onMessageCallback = cb; }
    onStat(cb) { this.onStatCallback = cb; }
}

// Export as a singleton for use across the Express app
module.exports = new Bridge();
