/**
 * Interface representing the process control block as sent by the C++ engine.
 */
export interface PCB {
    pid: number;
    name: string;
    state: string;
    priority: number;
    burst_time: number;
    remaining_time: number;
    arrival_time: number;
    waiting_time: number;
    turnaround_time: number;
}

/**
 * Handle formatting of process-related output
 */
export const handlePs = (response: any): string[] => {
    if (!response.processes || response.processes.length === 0) {
        return ['No active processes.'];
    }

    const lines: string[] = [];
    lines.push('PID  NAME       STATE     PRI  BURST  WAIT  TAT');
    lines.push('-----------------------------------------------');

    response.processes.forEach((p: any) => {
        const pid = p.pid.toString().padStart(3, '0');
        const name = p.name.padEnd(10, ' ');
        const state = p.state.padEnd(9, ' ');
        const pri = p.priority.toString().padEnd(4, ' ');
        const burst = p.burst_time.toString().padEnd(6, ' ');
        const wait = p.waiting_time.toString().padEnd(5, ' ');
        const tat = p.turnaround_time > 0 ? p.turnaround_time.toString() : '-';
        
        lines.push(`${pid}  ${name} ${state} ${pri} ${burst} ${wait} ${tat}`);
    });

    lines.push('-----------------------------------------------');
    lines.push(`Total Processes: ${response.processes.length}`);
    return lines;
};
