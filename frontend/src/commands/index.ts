import { handlePs } from './ps';
import type { KernelResponse } from '../store/kernelStore';

/**
 * Command Router
 * Dispatches terminal input to the appropriate kernel command or local handler.
 */
export const dispatchCommand = async (
    input: string, 
    sendCommand: (cmd: object) => Promise<KernelResponse>
): Promise<string[] | null> => {
    const parts = input.trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    // Helper to format success responses or errors
    const handleResponse = (res: KernelResponse): string[] => {
        return formatResponse(res);
    };

    try {
        switch (cmd) {
            case 'ps':
                return handleResponse(await sendCommand({ cmd: 'ps' }));

            case 'spawn':
                if (args.length < 2) return ['Usage: spawn <name> <burst> [priority]'];
                return handleResponse(await sendCommand({ 
                    cmd: 'spawn', 
                    name: args[0], 
                    burst: parseInt(args[1]), 
                    priority: parseInt(args[2] || '5') 
                }));

            case 'kill':
                if (args.length < 1) return ['Usage: kill <pid>'];
                return handleResponse(await sendCommand({ cmd: 'kill', pid: parseInt(args[0]) }));

            case 'sched':
                if (args[0] === 'set') {
                    return handleResponse(await sendCommand({ cmd: 'sched_set', algo: args[1], quantum: parseInt(args[2] || '4') }));
                } else if (args[0] === 'run') {
                    return handleResponse(await sendCommand({ cmd: 'sched_run' }));
                } else if (args[0] === 'compare') {
                    return handleResponse(await sendCommand({ cmd: 'sched_compare', workload: args[1] || 'mixed' }));
                } else {
                    return ['Usage: sched <set|run|compare> [algo|workload]'];
                }

            case 'mem':
                if (args[0] === 'map') {
                    return handleResponse(await sendCommand({ cmd: 'mem_map' }));
                } else if (args[0] === 'alloc') {
                    return handleResponse(await sendCommand({ cmd: 'mem_alloc', pid: parseInt(args[1]), pages: parseInt(args[2]) }));
                } else if (args[0] === 'policy') {
                    return handleResponse(await sendCommand({ cmd: 'mem_policy', policy: args[1] }));
                } else if (args[0] === 'compare') {
                    return handleResponse(await sendCommand({ cmd: 'mem_compare', ref_string: [7,0,1,2,0,3,0,4,2,3,0,3,2], frames: 3 }));
                } else {
                    return ['Usage: mem <map|alloc|policy|compare>'];
                }

            case 'sync':
                if (args[0] === 'demo') {
                    return handleResponse(await sendCommand({ cmd: 'sync_demo', scenario: args[1] || 'producer_consumer' }));
                } else {
                    return ['Usage: sync demo <scenario>'];
                }

            case 'ghostfetch':
            case 'experiment_run':
            case 'ping':
            case 'workload':
                return handleResponse(await sendCommand({ cmd }));

            case 'help':
                return [
                    '\x1b[33mGhostKernel Global Command Reference\x1b[0m',
                    '------------------------------------------------',
                    '  \x1b[32mghostfetch\x1b[0m     - Display system info & ASCII art',
                    '  \x1b[32mps\x1b[0m             - List all active processes',
                    '  \x1b[32mspawn\x1b[0m <n> <b>  - Create process (name, burst, [priority])',
                    '  \x1b[32mkill\x1b[0m <pid>     - Terminate a specific process',
                    '  \x1b[32msched set\x1b[0m <a>  - Set algorithm (fcfs, rr, priority, mlfq)',
                    '  \x1b[32msched run\x1b[0m      - Execute current processes & show Gantt',
                    '  \x1b[32msched compare\x1b[0m  - Compare performance across all algos',
                    '  \x1b[32mmem map\x1b[0m        - View physical memory frame allocation',
                    '  \x1b[32mmem alloc\x1b[0m <p> <s> - Allocate pages to a process',
                    '  \x1b[32mmem policy\x1b[0m <p>  - Set replacement policy (fifo, lru, optimal)',
                    '  \x1b[32mmem compare\x1b[0m    - Benchmark page replacement algorithms',
                    '  \x1b[32msync demo\x1b[0m <s - Run concurrency scenarios (e.g. dining-deadlock)',
                    '  \x1b[32mexperiment\x1b[0m     - Run automated full-system benchmark',
                    '  \x1b[32mclear\x1b[0m          - Wipe the terminal buffer',
                    '  \x1b[32mhelp\x1b[0m           - Show this reference guide',
                    '------------------------------------------------'
                ];

            default:
                return [`Command not found: ${cmd}. Type 'help' for assistance.`];
        }
    } catch (error: any) {
        return [`\x1b[31m[ERROR] ${error.toString()}\x1b[0m`];
    }
};

/**
 * Handle formatting for shared response patterns
 */
export const formatResponse = (response: any): string[] => {
    if (response.status === 'error') {
        return [`\x1b[31m[ERROR] ${response.msg}\x1b[0m`];
    }

    if (response.cmd === 'ps' || response.processes) {
        return handlePs(response);
    }

    if (response.gantt_ascii) {
        return response.gantt_ascii.split('\n');
    }

    if (response.map) {
        return response.map.split('\n');
    }

    if (response.ascii) {
        return response.ascii.split('\n');
    }

    if (response.events) {
        const lines = response.events.map((ev: any) => {
            const time = `[T=${ev.tick.toString().padStart(3, '0')}]`;
            const pid = `P${ev.pid}`;
            const action = ev.action.toUpperCase();
            const res = ev.resource || '';
            
            let color = '\x1b[33m'; // Amber
            if (action === 'DEADLOCK') color = '\x1b[31;1m'; // Bold Red
            else if (ev.success === true) color = '\x1b[32m'; // Green
            else if (ev.success === false) color = '\x1b[31m'; // Red (Failed)
            
            // Adjust based on specific action strings if success field is missing/ambiguous
            if (action.includes('LOCK') || action.includes('SIGNAL')) color = '\x1b[32m';
            if (action.includes('BLOCKED')) color = '\x1b[33m';

            return `\x1b[90m${time}\x1b[0m \x1b[33m${pid}\x1b[0m → ${color}${action} ${res}\x1b[0m`;
        });
        
        if (response.summary) {
            lines.push('\x1b[90m-------------------------------------------\x1b[0m');
            lines.push(`\x1b[33mSUMMARY:\x1b[0m ${response.summary}`);
        }
        
        if (response.deadlock === true) {
            lines.push('\x1b[31;1m⚠ DEADLOCK DETECTED: Circular wait condition met.\x1b[0m');
        }
        
        return lines;
    }

    if (response.msg) {
        return [response.msg];
    }

    // Generic JSON dump fallback
    return [JSON.stringify(response, null, 2)];
};
