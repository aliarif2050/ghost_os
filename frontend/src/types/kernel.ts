/**
 * Kernel Types for GhostKernel OS
 */

export const ProcessState = {
    NEW: 'NEW',
    READY: 'READY',
    RUNNING: 'RUNNING',
    WAITING: 'WAITING',
    TERMINATED: 'TERMINATED'
} as const;

export type ProcessStateType = typeof ProcessState[keyof typeof ProcessState];

export interface PCB {
    pid: number;
    name: string;
    state: ProcessStateType;
    priority: number;
    burst_time: number;
    remaining_time: number;
    arrival_time: number;
    waiting_time: number;
    turnaround_time: number;
    response_time: number;
    program_counter: number;
}

export interface TCB {
    tid: number;
    parent_pid: number;
    stack_ptr: number;
    state: ProcessStateType;
}

export interface MemoryStats {
    used: number;
    free: number;
    total: number;
    page_faults: number;
    hit_rate: number;
}

export interface SchedulerMetrics {
    avg_waiting_time: number;
    avg_turnaround_time: number;
    avg_response_time: number;
    cpu_utilization: number;
    throughput: number;
}
