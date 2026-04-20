import { create } from 'zustand';
import type { PCB, MemoryStats } from '../types/kernel';

/**
 * Types for the Kernel Engine and System Metrics
 */
export interface SystemStats {
    cpu: number;
    memory: number;
    elapsed: number;
    timestamp: number;
}

export interface KernelResponse {
    status: string;
    msg?: string;
    _req_id?: string;
    [key: string]: any;
}

interface KernelState {
    isConnected: boolean;
    socket: WebSocket | null;
    stats: SystemStats | null;
    processes: PCB[];
    algo: string;
    quantum: number;
    memStats: MemoryStats;
    booted: boolean;
    uptime: number;

    // Actions
    connect: () => void;
    disconnect: () => void;
    sendCommand: (cmd: object) => Promise<KernelResponse>;
    setAlgo: (algo: string, quantum?: number) => void;
    refreshStatus: () => Promise<void>;
    setBooted: (val: boolean) => void;
}

// Request matching map: reqId -> {resolve, reject}
const pendingRequests = new Map<string, { resolve: (val: any) => void, reject: (reason: any) => void }>();

/**
 * Zustand store to manage the global state of the GhostKernel connection.
 * Handles WebSocket lifecycle and tracks live system metrics and kernel state.
 */
export const useKernelStore = create<KernelState>((set, get) => ({
    isConnected: false,
    socket: null,
    stats: null,
    processes: [],
    algo: 'fcfs',
    quantum: 4,
    memStats: { used: 0, free: 32, total: 32, page_faults: 0, hit_rate: 0 },
    booted: false,
    uptime: 0,

    connect: () => {
        const { socket } = get();
        if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
            return;
        }

        console.log('[Store] Connecting to GhostKernel Bridge...');
        const ws = new WebSocket('ws://localhost:5000');
        
        // Immediately store the socket to prevent duplicate connect() calls during React strict mode
        set({ socket: ws });

        ws.onopen = () => {
            console.log('[Store] WebSocket Connected');
            set({ isConnected: true });
            
            // Initial sync
            get().refreshStatus();
            
            // Start heartbeats/refresh
            const refreshInterval = setInterval(() => {
                if (get().isConnected) get().refreshStatus();
            }, 5000); // Increased interval to 5 seconds to reduce load

            const uptimeInterval = setInterval(() => {
                if (get().isConnected) set(state => ({ uptime: state.uptime + 1 }));
            }, 1000);

            // Store intervals to clear on disconnect if needed
            (ws as any)._intervals = [refreshInterval, uptimeInterval];
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                
                // 1. Handle Broadcasts from Bridge
                if (message.type === 'system_stats') {
                    set({ stats: message.payload });
                    return;
                }

                // 2. Handle Responses from Kernel
                if (message.type === 'kernel_output') {
                    const res = message.payload as KernelResponse;
                    
                    // Update global state based on common command results
                    if (res.processes) set({ processes: res.processes });
                    if (res.algo) set({ algo: res.algo });
                    if (res.quantum) set({ quantum: res.quantum });
                    if (res.stats) set({ memStats: res.stats });

                    // Resolve pending promise if matching _req_id found
                    if (res._req_id && pendingRequests.has(res._req_id)) {
                        const { resolve } = pendingRequests.get(res._req_id)!;
                        pendingRequests.delete(res._req_id);
                        resolve(res);
                    }
                }

                if (message.type === 'system_info') {
                    console.log('[Store] System:', message.payload.msg);
                }
            } catch (err) {
                console.error('[Store] Message parse error:', err);
            }
        };

        ws.onclose = () => {
            console.warn('[Store] WebSocket Disconnected. Retrying in 3s...');
            set({ isConnected: false, socket: null });
            
            // Cleanup intervals
            if ((ws as any)._intervals) {
                (ws as any)._intervals.forEach(clearInterval);
            }

            // Reject all pending requests
            pendingRequests.forEach(({ reject }) => reject('Connection closed'));
            pendingRequests.clear();

            setTimeout(() => get().connect(), 3000);
        };

        ws.onerror = (err) => {
            console.error('[Store] WebSocket Error:', err);
        };
    },

    disconnect: () => {
        const { socket } = get();
        if (socket) {
            socket.close();
            set({ socket: null, isConnected: false });
        }
    },

    sendCommand: (cmd: any) => {
        const { socket, isConnected } = get();
        if (!socket || !isConnected) {
            return Promise.reject('Not connected to bridge');
        }

        const reqId = Math.random().toString(36).substring(2, 9);
        const payload = { ...cmd, _req_id: reqId };

        return new Promise((resolve, reject) => {
            pendingRequests.set(reqId, { resolve, reject });
            socket.send(JSON.stringify(payload));
            
            // Timeout protection
            setTimeout(() => {
                if (pendingRequests.has(reqId)) {
                    pendingRequests.delete(reqId);
                    reject('Command timed out');
                }
            }, 5000);
        });
    },

    setAlgo: (algo, quantum) => {
        get().sendCommand({ cmd: 'sched_set', algo, quantum });
    },

    refreshStatus: async () => {
        try {
            await get().sendCommand({ cmd: 'ps' });
            await get().sendCommand({ cmd: 'mem_map' });
        } catch (e) {
            console.warn('[Store] Background refresh skipped:', e);
        }
    },

    setBooted: (val) => set({ booted: val })
}));
