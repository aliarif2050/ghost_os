import React, { useState, useEffect } from 'react';
import { useKernelStore } from '../store/kernelStore';
import type { SchedulerMetrics } from '../types/kernel';

interface GanttEntry {
    pid: number;
    start: number;
    end: number;
}

interface SchedRunResult {
    status: string;
    metrics: SchedulerMetrics & { gantt: GanttEntry[] };
    gantt_ascii?: string;
}

interface SchedCompareResult {
    algo: string;
    metrics: SchedulerMetrics;
}

export const SchedulerView: React.FC = () => {
    // Zustand store actions and state
    const { sendCommand, algo, setAlgo, quantum } = useKernelStore();
    
    // Local state
    const [localQuantum, setLocalQuantum] = useState(quantum);
    const [metrics, setMetrics] = useState<SchedulerMetrics | null>(null);
    const [gantt, setGantt] = useState<GanttEntry[]>([]);
    const [compareResults, setCompareResults] = useState<SchedCompareResult[] | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    
    // Auto-update quantum when changed by user or other windows
    useEffect(() => {
        setLocalQuantum(quantum);
    }, [quantum]);

    const handleRun = async () => {
        setIsRunning(true);
        setCompareResults(null);
        try {
            const result = await sendCommand({ cmd: 'sched_run' }) as SchedRunResult;
            if (result.status === 'ok' && result.metrics) {
                setMetrics(result.metrics);
                setGantt(result.metrics.gantt || []);
            }
        } catch (e) {
            console.error("Run Scheduling Error:", e);
        } finally {
            setIsRunning(false);
        }
    };

    const handleCompare = async () => {
        setIsRunning(true);
        setMetrics(null);
        setGantt([]);
        try {
            // Note: workload param can be 'mixed', 'cpu_bound', or 'io_bound'. Defaulting to mixed.
            const result: any = await sendCommand({ cmd: 'sched_compare', workload: 'mixed' });
            if (result.status === 'ok' && result.results) {
                setCompareResults(result.results);
            }
        } catch (e) {
            console.error("Compare Scheduling Error:", e);
        } finally {
            setIsRunning(false);
        }
    };

    const handleAlgoChange = (newAlgo: string) => {
        setAlgo(newAlgo, localQuantum);
    };

    const handleQuantumChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value, 10);
        setLocalQuantum(val);
        setAlgo(algo, val);
    };

    // Calculate chart properties
    const maxTime = gantt.length > 0 ? Math.max(...gantt.map(g => g.end)) : 0;
    const processPids = Array.from(new Set(gantt.map(g => g.pid))).sort((a, b) => a - b);
    
    // Simple color palette based on PID
    const getColorForPid = (pid: number) => {
        const colors = ['#fabd2f', '#00ff41', '#ff3c3c', '#00d2ff', '#ff00d2', '#b000ff'];
        return colors[pid % colors.length];
    };

    return (
        <div className="flex flex-col h-full bg-[#1d2021] text-[#fabd2f] font-mono overflow-auto p-4 select-none">
            {/* Top Section: Algorithm Controls */}
            <div className="flex flex-wrap items-center gap-4 mb-6 pb-4 border-b border-[#333]">
                <div className="flex gap-2">
                    {['fcfs', 'rr', 'priority', 'mlfq'].map(a => (
                        <button
                            key={a}
                            onClick={() => handleAlgoChange(a)}
                            className={`px-3 py-1 border ${algo === a ? 'bg-[#fabd2f] text-[#1d2021] font-bold border-[#fabd2f]' : 'bg-transparent text-[#fabd2f] border-[#fabd2f] hover:bg-[#fabd2f] hover:bg-opacity-20 uppercase'}`}
                        >
                            {a.toUpperCase()}
                        </button>
                    ))}
                </div>

                {(algo === 'rr' || algo === 'mlfq') && (
                    <div className="flex items-center gap-2 text-sm ml-4">
                        <label>Quantum: {localQuantum}</label>
                        <input 
                            type="range" 
                            min="1" max="20" 
                            value={localQuantum}
                            onChange={handleQuantumChange}
                            className="accent-[#fabd2f] w-32"
                        />
                    </div>
                )}

                <div className="ml-auto flex gap-3">
                    <button 
                        onClick={handleRun}
                        disabled={isRunning}
                        className="px-4 py-2 bg-[#fabd2f] text-[#1d2021] font-bold border border-[#fabd2f] hover:bg-opacity-90 uppercase disabled:opacity-50"
                    >
                        Run Scheduler
                    </button>
                    <button 
                        onClick={handleCompare}
                        disabled={isRunning}
                        className="px-4 py-2 bg-transparent text-[#00ff41] border border-[#00ff41] hover:bg-[#00ff41] hover:text-[#1d2021] font-bold uppercase disabled:opacity-50"
                    >
                        Compare All
                    </button>
                </div>
            </div>

            {/* Middle Section: Gantt Chart Visualization */}
            {!compareResults && (
                <div className="flex-1 min-h-[200px] mb-6 relative">
                    <h3 className="text-sm text-[#555] mb-2 uppercase">Gantt Chart ({algo.toUpperCase()})</h3>
                    {gantt.length === 0 ? (
                        <div className="flex items-center justify-center h-48 border border-[#333] text-[#555] bg-[#1d2021] bg-opacity-50">
                            No processes to schedule or run hasn't executed.
                        </div>
                    ) : (
                        <div className="relative border border-[#333] p-4 bg-[#1d2021] overflow-x-auto">
                            {/* Gridlines container */}
                            <div className="relative" style={{ height: `${processPids.length * 40 + 24}px`, minWidth: '600px' }}>
                                {/* X-axis ticks & gridlines */}
                                {Array.from({ length: Math.ceil(maxTime / 4) + 1 }).map((_, i) => {
                                    const tick = i * 4;
                                    const leftPct = maxTime > 0 ? (tick / maxTime) * 100 : 0;
                                    return (
                                        <div key={i} className="absolute top-0 bottom-0 border-l border-[#111]" style={{ left: `${leftPct}%` }}>
                                            <span className="absolute -top-4 left-1 transform -translate-x-1/2 text-[10px] text-[#555]">{tick}</span>
                                        </div>
                                    );
                                })}

                                {/* Y-axis processes & bars */}
                                <div className="absolute inset-0 top-6 pl-8">
                                    {processPids.map((pid) => (
                                        <div key={pid} className="relative h-8 mb-2 flex items-center">
                                            {/* Process Label */}
                                            <div className="absolute left-[-2rem] w-6 text-right text-xs text-[#fff]">P{pid}</div>
                                            
                                            {/* Process Segments */}
                                            <div className="absolute left-0 right-0 h-full">
                                                {gantt.filter(g => g.pid === pid).map((seg, sidx) => {
                                                    const leftPct = maxTime > 0 ? (seg.start / maxTime) * 100 : 0;
                                                    const widthPct = maxTime > 0 ? ((seg.end - seg.start) / maxTime) * 100 : 0;
                                                    const color = getColorForPid(pid);
                                                    const showLabel = widthPct > 5; // only show label if wide enough
                                                    return (
                                                        <div 
                                                            key={sidx}
                                                            className="absolute h-6 rounded-sm flex items-center justify-center text-[10px] text-[#1d2021] overflow-hidden whitespace-nowrap opacity-90 transition-opacity hover:opacity-100 cursor-default"
                                                            style={{ 
                                                                left: `${leftPct}%`, 
                                                                width: `${widthPct}%`,
                                                                backgroundColor: color
                                                            }}
                                                            title={`P${pid} [${seg.start} - ${seg.end}]`}
                                                        >
                                                            {showLabel && `P${pid}`}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Bottom Section: Metrics Panel */}
            {!compareResults && metrics && (
                <div>
                    <h3 className="text-sm text-[#555] mb-2 uppercase">Performance Metrics</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <MetricCard label="Avg Waiting Time" value={`${metrics.avg_waiting_time.toFixed(2)} ticks`} />
                        <MetricCard label="Avg Turnaround Time" value={`${metrics.avg_turnaround_time.toFixed(2)} ticks`} />
                        <MetricCard label="Avg Response Time" value={`${metrics.avg_response_time.toFixed(2)} ticks`} />
                        <MetricCard label="CPU Utilization" value={`${metrics.cpu_utilization.toFixed(1)}%`} />
                        <MetricCard label="Throughput" value={`${metrics.throughput.toFixed(2)} proc/tick`} />
                        <MetricCard label="Process Count" value={`${processPids.length}`} />
                    </div>
                </div>
            )}

            {/* Compare Results view */}
            {compareResults && (
                <div className="flex-1">
                    <h3 className="text-sm text-[#555] mb-2 uppercase">Scheduler Comparison (Mixed Workload)</h3>
                    <div className="overflow-x-auto border border-[#333]">
                        <table className="w-full text-left border-collapse min-w-max">
                            <thead className="bg-[#111] text-[#fabd2f] text-xs uppercase border-b border-[#fabd2f]">
                                <tr>
                                    <th className="p-3 border-r border-[#333]">Algorithm</th>
                                    <th className="p-3 border-r border-[#333]">Wait Time</th>
                                    <th className="p-3 border-r border-[#333]">Turnaround</th>
                                    <th className="p-3 border-r border-[#333]">Response Time</th>
                                    <th className="p-3 border-r border-[#333]">CPU Util %</th>
                                    <th className="p-3">Throughput</th>
                                </tr>
                            </thead>
                            <tbody>
                                {compareResults.map((res, i) => {
                                    // Highlight best (min wait, max cpu, max throughput) -- basic logic
                                    const minWait = Math.min(...compareResults.map(r => r.metrics.avg_waiting_time));
                                    const isBestWait = res.metrics.avg_waiting_time === minWait;
                                    
                                    const minTat = Math.min(...compareResults.map(r => r.metrics.avg_turnaround_time));
                                    const isBestTat = res.metrics.avg_turnaround_time === minTat;

                                    const minResp = Math.min(...compareResults.map(r => r.metrics.avg_response_time));
                                    const isBestResp = res.metrics.avg_response_time === minResp;

                                    const maxCpu = Math.max(...compareResults.map(r => r.metrics.cpu_utilization));
                                    const isBestCpu = res.metrics.cpu_utilization === maxCpu;

                                    const maxThroughput = Math.max(...compareResults.map(r => r.metrics.throughput));
                                    const isBestThroughput = res.metrics.throughput === maxThroughput;

                                    return (
                                        <tr key={i} className="border-b border-[#333] hover:bg-[#111] text-sm">
                                            <td className="p-3 border-r border-[#333] font-bold text-white">{res.algo}</td>
                                            <td className={`p-3 border-r border-[#333] ${isBestWait ? 'text-[#00ff41]' : ''}`}>{res.metrics.avg_waiting_time.toFixed(2)}</td>
                                            <td className={`p-3 border-r border-[#333] ${isBestTat ? 'text-[#00ff41]' : ''}`}>{res.metrics.avg_turnaround_time.toFixed(2)}</td>
                                            <td className={`p-3 border-r border-[#333] ${isBestResp ? 'text-[#00ff41]' : ''}`}>{res.metrics.avg_response_time.toFixed(2)}</td>
                                            <td className={`p-3 border-r border-[#333] ${isBestCpu ? 'text-[#00ff41]' : ''}`}>{res.metrics.cpu_utilization.toFixed(1)}%</td>
                                            <td className={`p-3 ${isBestThroughput ? 'text-[#00ff41]' : ''}`}>{res.metrics.throughput.toFixed(2)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

const MetricCard: React.FC<{ label: string, value: string | number }> = ({ label, value }) => {
    return (
        <div className="border border-[#333] p-3 flex flex-col justify-center items-center bg-[#1d2021] hover:bg-[#111] transition-colors rounded-sm">
            <span className="text-[#555] text-[10px] uppercase tracking-wider mb-1 text-center">{label}</span>
            <span className="text-[#fabd2f] text-xl font-bold">{value}</span>
        </div>
    );
};
