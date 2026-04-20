import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useKernelStore } from '../store/kernelStore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';

interface PageFrame {
    id: number;
    pid: number;
    page: number;
    v: boolean;
    d: boolean;
    r: boolean;
    load_time: number;
    last_used: number;
}

interface MemCompareResult {
    fifo: number;
    lru: number;
    optimal: number;
    ref_string: number[];
    frames: number;
}

/**
 * MemoryViewer Component - V3 (High Fidelity & Functional)
 * Provides a stunning visualization of the system's physical memory and page management.
 */
export const MemoryViewer: React.FC = () => {
    const { sendCommand, memStats, processes } = useKernelStore();
    
    // Extracted frames from last map fetch
    const [frames, setFrames] = useState<PageFrame[]>([]);
    
    // Command forms state
    const [allocPid, setAllocPid] = useState('');
    const [allocPages, setAllocPages] = useState('');
    const [freePid, setFreePid] = useState('');
    const [accessPid, setAccessPid] = useState('');
    const [accessPage, setAccessPage] = useState('');
    const [isDirty, setIsDirty] = useState(false);
    const [transPid, setTransPid] = useState('');
    const [transVaddr, setTransVaddr] = useState('');
    const [transResult, setTransResult] = useState<string | null>(null);
    const [policy, setPolicy] = useState('lru');
    
    // UI State
    const [compareResult, setCompareResult] = useState<MemCompareResult | null>(null);
    const [isComparing, setIsComparing] = useState(false);
    const [activeTab, setActiveTab] = useState<'map' | 'compare'>('map');
    const [isAutoRunning, setIsAutoRunning] = useState(false);

    // Fetch frame details explicitly
    const refreshFrames = useCallback(async () => {
        try {
            const res = await sendCommand({ cmd: 'mem_map' });
            if (res.status === 'ok' && res.frames) {
                setFrames(res.frames);
            }
        } catch (e) {
            console.error('Failed to refresh frames', e);
        }
    }, [sendCommand]);

    useEffect(() => {
        refreshFrames();
        const interval = setInterval(refreshFrames, 2100);
        return () => clearInterval(interval);
    }, [refreshFrames]);

    // Auto-Run Simulator: Randomly accesses pages to show replacement logic in action
    useEffect(() => {
        if (!isAutoRunning) return;
        
        const timer = setInterval(async () => {
            const activeProcesses = processes.filter(p => p.state !== 'TERMINATED');
            if (activeProcesses.length === 0) return;
            
            const randomProc = activeProcesses[Math.floor(Math.random() * activeProcesses.length)];
            const randomPage = Math.floor(Math.random() * (randomProc.burst_time / 2 + 3)); // Heuristic for virtual space
            
            await sendCommand({ 
                cmd: 'mem_access', 
                pid: randomProc.pid, 
                page: randomPage, 
                dirty: Math.random() > 0.7 
            });
            refreshFrames();
        }, 1500);

        return () => clearInterval(timer);
    }, [isAutoRunning, processes, sendCommand, refreshFrames]);

    const handlePolicyChange = async (p: string) => {
        await sendCommand({ cmd: 'mem_policy', policy: p });
        setPolicy(p);
        refreshFrames();
    };

    const handleAllocate = async (e: React.FormEvent) => {
        e.preventDefault();
        await sendCommand({ cmd: 'mem_alloc', pid: parseInt(allocPid, 10), pages: parseInt(allocPages, 10) });
        setAllocPid('');
        setAllocPages('');
        refreshFrames();
    };

    const handleFree = async (e: React.FormEvent) => {
        e.preventDefault();
        await sendCommand({ cmd: 'mem_free', pid: parseInt(freePid, 10) });
        setFreePid('');
        refreshFrames();
    };

    const handleAccess = async (e: React.FormEvent) => {
        e.preventDefault();
        await sendCommand({ 
            cmd: 'mem_access', 
            pid: parseInt(accessPid, 10), 
            page: parseInt(accessPage, 10),
            dirty: isDirty
        });
        refreshFrames();
    };

    const handleTranslate = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await sendCommand({ cmd: 'mem_translate', pid: parseInt(transPid, 10), vaddr: parseInt(transVaddr, 10) });
        if (res.status === 'ok') {
            setTransResult(`P-ADDR: 0x${res.physical_addr.toString(16).toUpperCase()}`);
        } else {
            setTransResult(`FAULT: UNMAPPED`);
        }
    };

    const handleCompare = async () => {
        setIsComparing(true);
        try {
            const res = await sendCommand({
                cmd: 'mem_compare',
                ref_string: [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2],
                frames: 3
            });
            if (res.status === 'ok' && res.comparison) {
                setCompareResult(res.comparison);
                setActiveTab('compare');
            }
        } catch (e) {
            console.error("Compare Error", e);
        } finally {
            setIsComparing(false);
        }
    };

    const getColorForPid = (pid: number) => {
        if (pid === -1) return '#1a1a1a';
        const colors = ['#00f0ff', '#fabd2f', '#00ff41', '#ff3c3c', '#ff00d2', '#b000ff'];
        return colors[pid % colors.length];
    };

    const chartData = useMemo(() => {
        if (!compareResult) return [];
        return [
            { name: 'FIFO', faults: compareResult.fifo, color: '#fabd2f' },
            { name: 'LRU', faults: compareResult.lru, color: '#00f0ff' },
            { name: 'OPTIMAL', faults: compareResult.optimal, color: '#00ff41' }
        ];
    }, [compareResult]);

    return (
        <div className="flex flex-col h-full bg-[#050a1f] text-[#00f0ff] font-mono overflow-hidden">
            
            {/* Top Navigation Bar Component */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-[#00f0ff]/20 bg-black/40 backdrop-blur-md shrink-0">
                <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-[#00f0ff]/50 uppercase tracking-tighter shrink-0">Ghost Architecture</span>
                        <span className="text-sm font-black neon-text-cyan uppercase">Memory Subsystem</span>
                    </div>
                    
                    <div className="h-8 w-px bg-[#00f0ff]/20" />

                    <div className="flex items-center gap-1 bg-black/40 p-1 border border-white/5">
                        {['map', 'compare'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`px-4 py-1 text-[10px] font-black uppercase transition-all duration-300 ${activeTab === tab ? 'bg-[#00f0ff] text-[#050a1f]' : 'text-[#00f0ff]/40 hover:text-[#00f0ff]'}`}
                            >
                                {tab === 'map' ? 'Paging Map' : 'Statistics'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                     <button 
                        onClick={() => setIsAutoRunning(!isAutoRunning)}
                        className={`px-3 py-1.5 border text-[10px] font-black uppercase transition-all ${isAutoRunning ? 'bg-[#ff3c3c] border-[#ff3c3c] text-white shadow-[0_0_10px_rgba(255,60,60,0.4)]' : 'border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41]/10'}`}
                    >
                        {isAutoRunning ? 'Stop Simulator' : 'Auto Simulate'}
                    </button>
                    <div className="h-8 w-px bg-[#00f0ff]/20" />
                    <button 
                        onClick={handleCompare}
                        disabled={isComparing}
                        className="px-4 py-2 bg-transparent border border-[#00f0ff] text-[#00f0ff] text-[10px] font-black uppercase hover:bg-[#00f0ff] hover:text-[#050a1f] transition-all disabled:opacity-30"
                    >
                        {isComparing ? 'Crunching...' : 'Compare Logic'}
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">
                
                {/* Left: Interactive Map or Comparison View */}
                <div className="flex-1 p-6 overflow-auto scrollbar-hide">
                    {activeTab === 'map' ? (
                        <div className="max-w-4xl mx-auto pb-12">
                            <div className="flex items-center justify-between mb-8 border-b border-[#00f0ff]/10 pb-4">
                                <div>
                                    <h2 className="text-sm font-black uppercase tracking-widest text-[#00f0ff] flex items-center gap-2">
                                        Physical Page Registry
                                        <span className="text-[10px] font-normal text-[#00f0ff]/40 ml-2">Total Capacity: 128KB (32 Frames)</span>
                                    </h2>
                                </div>
                                <div className="flex gap-6 text-[9px] font-bold uppercase tracking-widest">
                                    <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#00ff41] animate-pulse" /> Read Activity</div>
                                    <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-[#ff3c3c]" /> Write Activity</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-4 md:grid-cols-8 gap-1.5">
                                {(frames.length > 0 ? frames : Array.from({length:32}).map((_,i) => ({id:i, pid:-1, page:-1, v:false, d:false, r:false, load_time:0, last_used:0}))).map((f) => {
                                    const isAlloc = f.pid !== -1;
                                    const pidColor = getColorForPid(f.pid);
                                    
                                    return (
                                        <div 
                                            key={f.id}
                                            className={`relative h-24 group transition-all duration-500 border ${isAlloc ? 'bg-black/60 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]' : 'bg-transparent border-[#00f0ff]/10 opacity-30 hover:opacity-100'}`}
                                            style={{ 
                                                borderColor: isAlloc ? `${pidColor}66` : undefined,
                                                boxShadow: isAlloc && f.r ? `0 0 10px ${pidColor}22` : undefined
                                            }}
                                        >
                                            {/* Dirty indicator top bar */}
                                            {f.d && <div className="absolute inset-x-0 top-0 h-1 bg-[#ff3c3c] shadow-[0_0_8px_#ff3c3c]" />}
                                            
                                            {/* Referenced indicator dot */}
                                            {f.r && <div className="absolute bottom-1 right-1 w-2 h-2 rounded-full border border-[#00ff41] bg-[#00ff41] shadow-[0_0_8px_#00ff41] animate-pulse" />}

                                            <div className="absolute top-1 left-2 text-[9px] font-black text-[#00f0ff]/20 italic">{f.id.toString().padStart(2, '0')}</div>
                                            
                                            <div className="h-full flex flex-col items-center justify-center p-2">
                                                {isAlloc ? (
                                                    <div className="flex flex-col items-center">
                                                        <div className="text-[9px] text-[#00f0ff]/40 mb-0.5">PROCESS</div>
                                                        <span className="text-base font-black leading-none mb-1" style={{ color: pidColor }}>{f.pid}</span>
                                                        <div className="h-0.5 w-4 bg-current opacity-20 mb-1" style={{ color: pidColor }} />
                                                        <span className="text-[10px] text-white/50">PG-{f.page}</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center opacity-20">
                                                        <div className="w-4 h-4 border border-current rounded-full mb-2 border-dashed animate-spin-slow" />
                                                        <span className="text-[8px] font-black tracking-tighter">NULL_F</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Advanced Hover Detail HUD */}
                                            {isAlloc && (
                                                <div className="absolute inset-0 bg-[#00f0ff] opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-start justify-end p-2 pointer-events-none z-10 border border-white">
                                                    <div className="text-[10px] font-black text-[#050a1f] leading-tight">FRAME_{f.id}</div>
                                                    <div className="h-px w-full bg-[#050a1f]/20 my-1" />
                                                    <div className="text-[8px] text-[#050a1f]/70 uppercase">Load : {f.load_time}s</div>
                                                    <div className="text-[8px] text-[#050a1f]/70 uppercase">Last : {f.last_used}s</div>
                                                    <div className="mt-1 flex gap-1">
                                                        {f.v && <span className="bg-[#050a1f] text-white px-1 text-[7px]">VALID</span>}
                                                        {f.d && <span className="bg-[#ff3c3c] text-white px-1 text-[7px]">DIRTY</span>}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                         <div className="max-w-5xl mx-auto h-full flex flex-col pb-12">
                            <div className="flex items-center justify-between mb-8 border-b border-[#00f0ff]/10 pb-4">
                                <h2 className="text-sm font-black uppercase tracking-widest text-[#00f0ff] flex items-center gap-2">
                                    <div className="w-3 h-1 bg-[#00ff41]" />
                                    Algorithm Efficiency Metrics
                                </h2>
                                <button onClick={() => setCompareResult(null)} className="text-[10px] font-black border border-[#00f0ff]/30 px-3 py-1 hover:bg-[#00f0ff]/10 tracking-widest">RESET ANALYSIS</button>
                            </div>

                            {!compareResult ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-[#00f0ff]/20">
                                    <div className="w-20 h-20 border-t-2 border-r-2 border-[#00f0ff] rounded-full animate-spin mb-6" />
                                    <p className="uppercase text-xs font-black tracking-[0.3em]">System Standby</p>
                                    <button onClick={handleCompare} className="mt-8 px-10 py-3 bg-[#00f0ff] text-[#050a1f] font-black text-xs hover:tracking-[0.2em] transition-all duration-500">INITIATE BENCHMARK</button>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col gap-8">
                                    {/* Primary Visual Chart */}
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        <div className="lg:col-span-2 glass-panel p-8 neon-border relative overflow-hidden h-[320px]">
                                             <div className="absolute top-0 right-0 p-4 text-[8px] text-[#00f0ff]/20 font-black">GRAPH_ID: PAGE_FAULT_INDEX</div>
                                             <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#00f0ff66', fontSize: 10, fontWeight: 'bold'}} />
                                                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#00f0ff66', fontSize: 10}} />
                                                    <Tooltip 
                                                        cursor={{fill: '#00f0ff08'}}
                                                        contentStyle={{backgroundColor: '#050a1f', border: '1px solid #00f0ff33', borderRadius: '0px', padding: '10px'}}
                                                        itemStyle={{fontSize: '12px', fontWeight: 'bold'}}
                                                    />
                                                    <Bar dataKey="faults" barSize={60}>
                                                        {chartData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.4} stroke={entry.color} strokeWidth={2} />
                                                        ))}
                                                        <LabelList dataKey="faults" position="top" fill="#00f0ff" style={{fontSize: 14, fontWeight: 'black'}} />
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>

                                        <div className="flex flex-col gap-4">
                                            <div className="glass-panel p-6 neon-border flex-1 flex flex-col justify-center">
                                                <span className="text-[10px] text-[#00f0ff]/40 uppercase mb-4 font-black">Optimal Solution</span>
                                                <div className="text-5xl font-black neon-text-cyan flex items-baseline gap-2">
                                                    {compareResult.optimal}
                                                    <span className="text-xs font-bold text-[#00ff41] opacity-50">MIN_ERR</span>
                                                </div>
                                                <p className="mt-4 text-[9px] uppercase leading-relaxed text-[#00f0ff]/60">
                                                    The optimal replacement logic achieved {(( (Math.max(compareResult.fifo, compareResult.lru) - compareResult.optimal) / Math.max(compareResult.fifo, compareResult.lru)) * 100).toFixed(0)}% better performance than basic FIFO.
                                                </p>
                                            </div>
                                            <div className="bg-[#00f0ff]/5 border border-[#00f0ff]/10 p-4 flex items-center justify-between">
                                                <span className="text-[10px] font-black uppercase opacity-40">Ref String</span>
                                                <div className="flex gap-1">
                                                    {compareResult.ref_string.slice(0, 8).map((v, i) => (
                                                        <span key={i} className="w-5 h-5 flex items-center justify-center border border-white/10 text-[9px] font-bold">{v}</span>
                                                    ))}
                                                    <span className="text-[9px] opacity-20">...</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Comparative Table Header */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {[
                                            { name: 'FIFO', val: compareResult.fifo, note: 'Simple queue logic, prone to Belady\'s Anomaly.', color: '#fabd2f' },
                                            { name: 'LRU', val: compareResult.lru, note: 'Uses temporal locality to predict future needs.', color: '#00f0ff' },
                                            { name: 'OPTIMAL', val: compareResult.optimal, note: 'Ideal theoretical performance; zero look-ahead lag.', color: '#00ff41' },
                                        ].map(item => (
                                            <div key={item.name} className="border border-white/5 p-5 bg-black/20 hover:bg-black/40 transition-all">
                                                <div className="flex justify-between items-start mb-4">
                                                    <span className="text-xs font-black tracking-widest" style={{ color: item.color }}>{item.name}</span>
                                                    <span className="text-2xl font-black text-white">{item.val}</span>
                                                </div>
                                                <p className="text-[10px] text-white/30 leading-normal mb-4">{item.note}</p>
                                                <div className="w-full bg-white/5 h-1">
                                                    <div className="h-full" style={{ backgroundColor: item.color, width: `${(item.val / Math.max(compareResult.fifo, compareResult.lru)) * 100}%`, opacity: 0.5 }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                         </div>
                    )}
                </div>

                {/* Right: Sidebar Integrated Controls */}
                <div className="w-80 border-l border-[#00f0ff]/20 bg-black/60 backdrop-blur-3xl p-8 flex flex-col gap-8 shrink-0">
                    
                    <div>
                         <h3 className="text-[10px] text-white/30 font-black uppercase tracking-[0.2em] mb-6 flex items-center justify-between">
                            Control Surface
                            <span className="w-4 h-[1px] bg-white/10" />
                        </h3>
                        
                        {/* Selector */}
                        <div className="flex flex-col gap-1.5">
                            {['fifo', 'lru', 'optimal'].map(p => (
                                <button
                                    key={p}
                                    onClick={() => handlePolicyChange(p)}
                                    className={`relative px-4 py-3 text-left text-xs font-black uppercase transition-all overflow-hidden group ${policy === p ? 'text-[#050a1f]' : 'text-[#00f0ff]/40 hover:text-[#00f0ff]'}`}
                                >
                                    {policy === p && <div className="absolute inset-0 bg-[#00f0ff] animate-in fade-in zoom-in duration-300" />}
                                    <span className="relative flex justify-between items-center">
                                        {p}
                                        {policy === p && <span className="text-[8px] tracking-widest font-black">ACTIVE</span>}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-8">
                        {/* Provisioning Form */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-[9px] font-black uppercase text-[#00f0ff]/40 tracking-widest">Provisioning</h4>
                                <div className="h-[1px] flex-1 mx-4 bg-white/5" />
                            </div>
                            <form onSubmit={handleAllocate} className="flex flex-col gap-2">
                                <div className="flex gap-1.5">
                                    <input type="number" placeholder="PID" required value={allocPid} onChange={e=>setAllocPid(e.target.value)} className="w-1/3 bg-black/60 border border-white/5 p-3 text-xs outline-none focus:border-[#00f0ff]/50 font-black" />
                                    <input type="number" placeholder="PAGES" required value={allocPages} onChange={e=>setAllocPages(e.target.value)} className="flex-1 bg-black/60 border border-white/5 p-3 text-xs outline-none focus:border-[#00f0ff]/50 font-black text-center" />
                                </div>
                                <button type="submit" className="w-full py-3 bg-transparent border border-[#00f0ff]/30 text-[#00f0ff] text-[10px] font-black uppercase hover:bg-[#00f0ff] hover:text-[#050a1f] transition-all">Claim Space</button>
                            </form>
                        </div>

                        {/* Access Simulator */}
                        <div className="space-y-4 pt-2">
                            <div className="flex items-center justify-between">
                                <h4 className="text-[9px] font-black uppercase text-[#00f0ff]/40 tracking-widest">Access Sim</h4>
                                <div className="h-[1px] flex-1 mx-4 bg-white/5" />
                            </div>
                            <form onSubmit={handleAccess} className="space-y-3">
                                <div className="flex gap-1.5">
                                    <input type="number" placeholder="PID" required value={accessPid} onChange={e=>setAccessPid(e.target.value)} className="w-1/3 bg-black/60 border border-white/5 p-3 text-xs outline-none focus:border-[#00ff41]/50 font-black" />
                                    <input type="number" placeholder="PAGE" required value={accessPage} onChange={e=>setAccessPage(e.target.value)} className="flex-1 bg-black/60 border border-white/5 p-3 text-xs outline-none focus:border-[#00ff41]/50 font-black text-center" />
                                </div>
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input type="checkbox" checked={isDirty} onChange={e=>setIsDirty(e.target.checked)} className="hidden" />
                                    <div className={`w-4 h-4 border ${isDirty ? 'bg-[#ff3c3c] border-[#ff3c3c]' : 'border-white/20'} transition-all`} />
                                    <span className="text-[9px] font-black uppercase text-white/30 group-hover:text-white/60">Mark as Dirty (Write)</span>
                                </label>
                                <button type="submit" className="w-full py-3 bg-[#00ff41]/10 border border-[#00ff41]/30 text-[#00ff41] text-[10px] font-black uppercase hover:bg-[#00ff41] hover:text-[#050a1f] transition-all">Pulse Access</button>
                            </form>
                        </div>

                         <div className="space-y-4 pt-2">
                            <form onSubmit={handleFree} className="flex gap-1.5">
                                <input type="number" placeholder="PID" required value={freePid} onChange={e=>setFreePid(e.target.value)} className="w-20 bg-black/60 border border-white/5 p-3 text-xs outline-none focus:border-[#ff3c3c]/50 font-black" />
                                <button type="submit" className="flex-1 py-3 bg-[#ff3c3c]/10 border border-[#ff3c3c]/30 text-[#ff3c3c] text-[10px] font-black uppercase hover:bg-[#ff3c3c] hover:text-white transition-all">Force Flush</button>
                            </form>
                        </div>
                    </div>

                    <div className="mt-auto flex flex-col gap-4">
                         <div className="p-4 bg-black/40 border border-white/5 space-y-4 relative overflow-hidden">
                            <div className="text-[9px] text-white/20 font-black uppercase tracking-widest mb-2 border-b border-white/5 pb-2">Status HUD</div>
                            <div className="flex justify-between items-center text-[10px]">
                                <span className="font-bold opacity-30">P-FAULTS</span>
                                <span className="font-black text-[#ff3c3c] neon-text-red text-base">{memStats.page_faults}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px]">
                                <span className="font-bold opacity-30">P-HITS</span>
                                <span className="font-black text-[#00ff41] text-base">{memStats.page_hits}</span>
                            </div>
                            <div className="absolute -bottom-4 -right-4 w-12 h-12 border border-white/5 rotate-45 pointer-events-none" />
                        </div>
                        
                        <div className="flex items-center justify-between text-[8px] font-black opacity-20 uppercase tracking-[0.2em] px-1">
                            <span>Rel: 1.0.4r</span>
                            <span>GhostKernel_Engine</span>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Global Scanline Effect */}
            <div className="scanner pointer-events-none fixed inset-0 opacity-[0.03]" />
        </div>
    );
};
