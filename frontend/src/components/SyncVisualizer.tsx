import React, { useState, useEffect, useRef } from 'react';
import { useKernelStore } from '../store/kernelStore';

// Shared types
interface SyncEvent {
    tick: number;
    pid: number;
    action: string;
    resource: string;
    success: boolean;
}

type Scenario = 'producer_consumer' | 'dining_philosophers' | 'reader_writer' | 'deadlock_demo';

export function SyncVisualizer() {
    const { sendCommand } = useKernelStore();

    const [scenario, setScenario] = useState<Scenario>('producer_consumer');
    const [isRunning, setIsRunning] = useState(false);

    // Params
    const [pcItems, setPcItems] = useState(10);
    const [pcBuffer, setPcBuffer] = useState(5);
    const [dpPhilosophers, setDpPhilosophers] = useState(5);
    const [rwReaders, setRwReaders] = useState(3);
    const [rwWriters, setRwWriters] = useState(2);

    // Results
    const [allEvents, setAllEvents] = useState<SyncEvent[]>([]);
    const [visibleEvents, setVisibleEvents] = useState<SyncEvent[]>([]);
    const [deadlock, setDeadlock] = useState(false);
    const [summary, setSummary] = useState('');

    // Visual states
    const [bufferCount, setBufferCount] = useState(0);
    const [philosopherStates, setPhilosopherStates] = useState<string[]>(Array(5).fill('thinking'));
    const [forkOwners, setForkOwners] = useState<number[]>(Array(5).fill(-1));
    const [readerCount, setReaderCount] = useState(0);
    const [writerCount, setWriterCount] = useState(0);

    const logEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll log
    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [visibleEvents]);

    const runScenario = async () => {
        if (isRunning) return;
        setIsRunning(true);
        setAllEvents([]);
        setVisibleEvents([]);
        setDeadlock(false);
        setSummary('');
        setBufferCount(0);
        setPhilosopherStates(Array(dpPhilosophers).fill('thinking'));
        setForkOwners(Array(dpPhilosophers).fill(-1));
        setReaderCount(0);
        setWriterCount(0);

        let cmdArgs: any = { cmd: 'sync_demo' };

        switch (scenario) {
            case 'producer_consumer':
                cmdArgs = { ...cmdArgs, scenario: 'producer_consumer', items: pcItems, buffer: pcBuffer };
                break;
            case 'dining_philosophers':
                cmdArgs = { ...cmdArgs, scenario: 'dining_philosophers', num_philosophers: dpPhilosophers, allow_deadlock: false };
                break;
            case 'deadlock_demo':
                cmdArgs = { ...cmdArgs, scenario: 'dining_philosophers', num_philosophers: dpPhilosophers, allow_deadlock: true };
                break;
            case 'reader_writer':
                cmdArgs = { ...cmdArgs, scenario: 'reader_writer', readers: rwReaders, writers: rwWriters };
                break;
        }

        try {
            const res = await sendCommand(cmdArgs);
            if (res.status === 'ok') {
                const events: SyncEvent[] = res.events || [];
                setAllEvents(events);
                streamEvents(events, res);
            } else {
                setSummary(`Error: ${res.msg || res.status}`);
                setIsRunning(false);
            }
        } catch (err: any) {
            setSummary(`Comm Error: ${err}`);
            setIsRunning(false);
        }
    };

    const streamEvents = (events: SyncEvent[], res: any) => {
        let i = 0;
        const interval = setInterval(() => {
            if (i < events.length) {
                const ev = events[i];
                setVisibleEvents(prev => [...prev, ev]);
                updateVisuals(ev);
                i++;
            } else {
                clearInterval(interval);
                setIsRunning(false);
                setDeadlock(res.deadlock || false);
                setSummary(res.summary || 'Simulation completed.');
            }
        }, 40); // Fast streaming
    };

    const updateVisuals = (ev: SyncEvent) => {
        const actionLC = ev.action.toLowerCase();
        const resLC = ev.resource.toLowerCase();

        if (scenario === 'producer_consumer') {
            if ((actionLC.includes('signal') || actionLC.includes('v()')) && resLC.includes('full')) {
                setBufferCount(c => Math.min(c + 1, pcBuffer));
            }
            if ((actionLC.includes('wait') || actionLC.includes('p()')) && resLC.includes('full') && ev.success) {
                setBufferCount(c => Math.max(c - 1, 0));
            }
        }
        else if (scenario === 'dining_philosophers' || scenario === 'deadlock_demo') {
            // PID typically starts at 1, so indices are pid-1
            const phiIdx = (ev.pid - 1) % dpPhilosophers;

            if (!ev.success || actionLC.includes('blocked')) {
                setPhilosopherStates(prev => {
                    const next = [...prev];
                    next[phiIdx] = 'waiting';
                    return next;
                });
            } else if (actionLC.includes('lock') || actionLC.includes('wait') || actionLC.includes('p()')) {
                // Determine which fork based on resource string which might contain numbers
                const match = ev.resource.match(/\d+/);
                if (match) {
                    const forkIdx = parseInt(match[0], 10);
                    setForkOwners(prev => {
                        const next = [...prev];
                        next[forkIdx] = ev.pid;
                        return next;
                    });
                }
                setPhilosopherStates(prev => {
                    const next = [...prev];
                    next[phiIdx] = 'eating'; // simplistic, usually needs 2 forks
                    return next;
                });
            } else if (actionLC.includes('unlock') || actionLC.includes('signal') || actionLC.includes('v()')) {
                const match = ev.resource.match(/\d+/);
                if (match) {
                    const forkIdx = parseInt(match[0], 10);
                    setForkOwners(prev => {
                        const next = [...prev];
                        if (next[forkIdx] === ev.pid) next[forkIdx] = -1;
                        return next;
                    });
                }
                setPhilosopherStates(prev => {
                    const next = [...prev];
                    next[phiIdx] = 'thinking';
                    return next;
                });
            }
        }
        else if (scenario === 'reader_writer') {
            if (resLC.includes('wrt')) {
                if ((actionLC.includes('lock') || actionLC.includes('wait') || actionLC.includes('p()')) && ev.success) {
                    setWriterCount(1);
                } else if (actionLC.includes('unlock') || actionLC.includes('signal') || actionLC.includes('v()')) {
                    setWriterCount(0);
                }
            } else if (resLC.includes('mutex') || resLC.includes('readcount')) {
                // Simplified reader count tracking
                if (actionLC.includes('signal') || actionLC.includes('v()')) {
                    // It is generally hard to parse exact readcount from standard sync logs without specific messages
                    // We'll just randomly increment/decrement for visual effect if we can't parse exactly
                }
            }
        }
    };

    const renderEventColor = (ev: SyncEvent) => {
        if (ev.action.toUpperCase() === 'DEADLOCK') return 'text-[var(--red)] font-bold';
        if (ev.success === false || ev.action.includes('BLOCKED') || ev.action.includes('WAIT')) return 'text-[var(--amber)]';
        if (ev.success === true || ev.action.includes('LOCK') || ev.action.includes('SIGNAL') || ev.action.includes('V()')) return 'text-[var(--green)]';
        return 'text-[#888]';
    };

    return (
        <div className="flex flex-col h-full bg-[#1d2021] text-[var(--amber)] font-mono text-sm">
            {/* DEADLOCK Alert */}
            {deadlock && (
                <div className="bg-[var(--red)] text-black font-bold p-2 text-center animate-pulse tracking-widest shrink-0">
                    ⚠ DEADLOCK DETECTED: CIRCULAR WAIT CYCLE
                </div>
            )}

            {/* Tab Bar */}
            <div className="flex border-b border-[#333] shrink-0 bg-[#0f0f0f]">
                {(['producer_consumer', 'dining_philosophers', 'reader_writer', 'deadlock_demo'] as Scenario[]).map(s => (
                    <button
                        key={s}
                        onClick={() => !isRunning && setScenario(s)}
                        disabled={isRunning}
                        className={`px-6 py-2 uppercase text-sm tracking-widest transition-colors ${scenario === s
                            ? 'bg-[var(--amber)] text-black font-bold'
                            : 'text-[var(--amber)] hover:bg-[#222]'
                            } ${isRunning && scenario !== s ? 'opacity-30 cursor-not-allowed' : ''}`}
                    >
                        {s.split('_').join(' ')}
                    </button>
                ))}
            </div>

            {/* Controls Bar */}
            <div className="flex items-center gap-4 p-3 border-b border-[#333] shrink-0">
                <button
                    onClick={runScenario}
                    disabled={isRunning}
                    className="px-4 py-1 bg-[var(--amber)] text-black font-bold disabled:opacity-50 hover:bg-[#e09e00]"
                >
                    {isRunning ? 'RUNNING...' : 'RUN SCENARIO'}
                </button>

                <div className="flex gap-4 items-center">
                    {scenario === 'producer_consumer' && (
                        <>
                            <label className="flex items-center gap-2">
                                <span className="text-[#888]">Items:</span>
                                <input type="number" value={pcItems} onChange={e => setPcItems(Number(e.target.value))} className="w-16 bg-[#111] border border-[#333] px-1 text-center" min="1" max="50" />
                            </label>
                            <label className="flex items-center gap-2">
                                <span className="text-[#888]">Buffer Size:</span>
                                <input type="number" value={pcBuffer} onChange={e => setPcBuffer(Number(e.target.value))} className="w-16 bg-[#111] border border-[#333] px-1 text-center" min="1" max="20" />
                            </label>
                        </>
                    )}
                    {(scenario === 'dining_philosophers' || scenario === 'deadlock_demo') && (
                        <>
                            <label className="flex items-center gap-2">
                                <span className="text-[#888]">Philosophers:</span>
                                <input type="number" value={dpPhilosophers} onChange={e => setDpPhilosophers(Number(e.target.value))} className="w-16 bg-[#111] border border-[#333] px-1 text-center" min="2" max="10" />
                            </label>
                            <span className="text-[#555] italic">
                                {scenario === 'deadlock_demo' ? '(Deadlock Allowed)' : '(Ordered Resource Allocation)'}
                            </span>
                        </>
                    )}
                    {scenario === 'reader_writer' && (
                        <>
                            <label className="flex items-center gap-2">
                                <span className="text-[#888]">Readers:</span>
                                <input type="number" value={rwReaders} onChange={e => setRwReaders(Number(e.target.value))} className="w-16 bg-[#111] border border-[#333] px-1 text-center" min="1" max="10" />
                            </label>
                            <label className="flex items-center gap-2">
                                <span className="text-[#888]">Writers:</span>
                                <input type="number" value={rwWriters} onChange={e => setRwWriters(Number(e.target.value))} className="w-16 bg-[#111] border border-[#333] px-1 text-center" min="1" max="10" />
                            </label>
                        </>
                    )}
                </div>
            </div>

            {/* Main Area (Timeline + Side Visuals) */}
            <div className="flex flex-1 overflow-hidden">

                {/* Timeline */}
                <div className="flex-1 border-r border-[#333] p-4 overflow-y-auto bg-[#080808] custom-scrollbar">
                    {visibleEvents.length === 0 && !isRunning && (
                        <div className="text-[#555] italic">Click RUN to start streaming events...</div>
                    )}
                    {visibleEvents.map((ev, i) => (
                        <div key={i} className="mb-1">
                            <span className="text-[#555] mr-4">[T={ev.tick.toString().padStart(3, '0')}]</span>
                            <span className="text-[var(--amber)] mr-2">P{ev.pid}</span>
                            <span className="text-[#888]">→</span>
                            <span className={`ml-2 ${renderEventColor(ev)}`}>
                                {ev.action} {ev.resource} {ev.success === false && '(FAILED)'}
                            </span>
                        </div>
                    ))}
                    <div ref={logEndRef} />
                </div>

                {/* Visual Indicators */}
                <div className="w-64 p-4 flex flex-col items-center justify-center bg-[#0d0d0d] relative">

                    {scenario === 'producer_consumer' && (
                        <div className="flex flex-col items-center w-full">
                            <h3 className="mb-4 text-[#888] uppercase tracking-widest text-xs">Shared Buffer</h3>
                            <div className="w-16 h-48 border-2 border-[#555] flex flex-col justify-end p-1 relative bg-[#111]">
                                <div
                                    className="bg-[var(--green)] w-full transition-all duration-200"
                                    style={{ height: `${(bufferCount / pcBuffer) * 100}%` }}
                                ></div>
                                <div className="absolute inset-0 flex items-center justify-center mix-blend-difference text-white font-bold text-xl">
                                    {bufferCount}
                                </div>
                            </div>
                            <div className="mt-2 text-[#555]">Capacity: {pcBuffer}</div>
                        </div>
                    )}

                    {(scenario === 'dining_philosophers' || scenario === 'deadlock_demo') && (
                        <div className="flex flex-col items-center w-full relative">
                            <h3 className="mb-8 text-[#888] uppercase tracking-widest text-xs">Table View</h3>
                            <div className="relative w-48 h-48 rounded-full border-2 border-[#333] flex items-center justify-center">
                                {/* Plate */}
                                <div className="w-12 h-12 rounded-full border border-[#555] bg-[#111]"></div>

                                {/* Philosophers */}
                                {Array.from({ length: dpPhilosophers }).map((_, i) => {
                                    const angle = (i * 360) / dpPhilosophers;
                                    const rad = (angle - 90) * (Math.PI / 180);
                                    const x = 50 + 40 * Math.cos(rad); // 40% radius
                                    const y = 50 + 40 * Math.sin(rad);

                                    const state = philosopherStates[i] || 'thinking';
                                    const color = state === 'eating' ? 'var(--green)' : state === 'waiting' ? 'var(--red)' : 'var(--amber)';

                                    return (
                                        <div
                                            key={`p${i}`}
                                            className="absolute w-8 h-8 -ml-4 -mt-4 rounded border-2 bg-black flex items-center justify-center"
                                            style={{ left: `${x}%`, top: `${y}%`, borderColor: color }}
                                            title={`P${i + 1}: ${state}`}
                                        >
                                            P{i + 1}
                                        </div>
                                    );
                                })}

                                {/* Forks (Edges between nodes) */}
                                {Array.from({ length: dpPhilosophers }).map((_, i) => {
                                    const angle = ((i + 0.5) * 360) / dpPhilosophers;
                                    const rad = (angle - 90) * (Math.PI / 180);
                                    const x = 50 + 25 * Math.cos(rad);
                                    const y = 50 + 25 * Math.sin(rad);
                                    const owner = forkOwners[i];

                                    return (
                                        <div
                                            key={`f${i}`}
                                            className="absolute w-4 h-4 -ml-2 -mt-2 rounded-full border flex items-center justify-center text-[8px]"
                                            style={{
                                                left: `${x}%`, top: `${y}%`,
                                                backgroundColor: owner !== -1 ? 'var(--amber)' : '#111',
                                                borderColor: owner !== -1 ? '#000' : '#444',
                                                color: owner !== -1 ? '#000' : '#444'
                                            }}
                                        >
                                            F
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="mt-8 flex flex-col items-center gap-1 text-[10px] text-[#888]">
                                <div><span className="inline-block w-2 h-2 bg-[var(--amber)] mr-1"></span> Thinking / Held</div>
                                <div><span className="inline-block w-2 h-2 border border-[var(--green)] mr-1"></span> Eating</div>
                                <div><span className="inline-block w-2 h-2 border border-[var(--red)] mr-1"></span> Waiting</div>
                            </div>
                        </div>
                    )}

                    {scenario === 'reader_writer' && (
                        <div className="flex flex-col items-center w-full">
                            <h3 className="mb-4 text-[#888] uppercase tracking-widest text-xs">Resource Block</h3>
                            <div className="w-32 h-32 border-2 border-[var(--amber)] flex flex-col items-center justify-center bg-[#1a1400]">
                                <div className="text-3xl font-bold mb-2">DB</div>
                                <div className="flex gap-2 text-xs">
                                    <span className="px-2 py-1 bg-[var(--green)] text-black rounded">R: ?</span>
                                    <span className={`px-2 py-1 rounded text-black ${writerCount > 0 ? 'bg-[var(--red)]' : 'bg-[#555]'}`}>W: {writerCount}</span>
                                </div>
                            </div>
                            <div className="mt-4 text-center text-[#888] text-xs">
                                Note: Writers have exclusive access. <br />Readers share access.
                            </div>
                        </div>
                    )}

                </div>
            </div>

            {/* Summary Panel */}
            <div className="p-2 border-t border-[#333] bg-[#080808] min-h-[40px] flex items-center text-[#999]">
                {summary ? (
                    <div className="w-full truncate">
                        <span className="font-bold text-[var(--amber)] mr-2">SUMMARY:</span>
                        {summary}
                    </div>
                ) : (
                    <div className="italic opacity-50">Awaiting execution...</div>
                )}
            </div>

        </div>
    );
}

export default SyncVisualizer;
