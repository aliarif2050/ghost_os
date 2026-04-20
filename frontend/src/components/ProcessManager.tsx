import React, { useState } from 'react';
import { useKernelStore } from '../store/kernelStore';

export const ProcessManager: React.FC = () => {
    const { processes, sendCommand, isConnected } = useKernelStore();
    const [isSpawnOpen, setIsSpawnOpen] = useState(false);
    const [isCustomOpen, setIsCustomOpen] = useState(false);
    const [name, setName] = useState('');
    const [burst, setBurst] = useState('5');
    const [priority, setPriority] = useState('5');

    const [customParams, setCustomParams] = useState({
        count: 10,
        min_burst: 1,
        max_burst: 25,
        min_pri: 1,
        max_pri: 10,
        min_arr: 0,
        max_arr: 15
    });

    const handleSpawn = async (e: React.FormEvent | React.MouseEvent) => {
        e.preventDefault();
        if (!name) return;
        await sendCommand({
            cmd: 'spawn',
            name,
            burst: parseInt(burst, 10),
            priority: parseInt(priority, 10),
            arrival: 0
        });
        setIsSpawnOpen(false);
        setName('');
        setBurst('5');
        setPriority('5');
        await sendCommand({ cmd: 'ps' });
    };

    const handleKill = async (pid: number) => {
        await sendCommand({ cmd: 'kill', pid });
        await sendCommand({ cmd: 'ps' });
    };

    const handleWorkload = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const type = e.target.value;
        if (type === 'custom') {
            setIsCustomOpen(true);
            setIsSpawnOpen(false);
        } else if (type) {
            await sendCommand({ cmd: 'workload', type });
            await sendCommand({ cmd: 'ps' });
            setIsCustomOpen(false);
            setIsSpawnOpen(false);
        }
    };

    const handleCustomSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await sendCommand({ 
            cmd: 'workload', 
            type: 'custom',
            ...customParams 
        });
        await sendCommand({ cmd: 'ps' });
        setIsCustomOpen(false);
    };

    const handleRefresh = async () => {
        await sendCommand({ cmd: 'ps' });
    };

    const getStateColor = (state: string) => {
        switch (state) {
            case 'RUNNING': return '#00ff41'; // green
            case 'READY': return '#fabd2f'; // amber
            case 'TERMINATED': return '#ff3c3c'; // red
            default: return '#555555'; // dim for WAITING / NEW
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-[#1d2021] text-[#fabd2f] font-mono text-sm overflow-hidden">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-4 p-2 border-b border-[#fabd2f] shrink-0 bg-[#111]">
                <button
                    onClick={() => setIsSpawnOpen(!isSpawnOpen)}
                    disabled={!isConnected}
                    className="px-3 py-1 border border-[#fabd2f] hover:bg-[#fabd2f] hover:text-[#1d2021] disabled:opacity-50 transition-colors"
                >
                    [SPAWN]
                </button>

                <select
                    onChange={handleWorkload}
                    disabled={!isConnected}
                    className="px-3 py-1 border border-[#fabd2f] bg-transparent hover:bg-[#111] disabled:opacity-50 outline-none cursor-pointer appearance-none"
                    style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
                >
                    <option className="bg-[#1d2021]" value="">[WORKLOAD ▼]</option>
                    <option className="bg-[#1d2021]" value="cpu_bound">cpu_bound</option>
                    <option className="bg-[#1d2021]" value="io_bound">io_bound</option>
                    <option className="bg-[#1d2021]" value="mixed">mixed</option>
                    <option className="bg-[#1d2021]" value="custom">[custom...]</option>
                </select>

                <button
                    onClick={handleRefresh}
                    disabled={!isConnected}
                    className="px-3 py-1 border border-[#fabd2f] hover:bg-[#fabd2f] hover:text-[#1d2021] disabled:opacity-50 transition-colors"
                >
                    [REFRESH]
                </button>
            </div>

            {/* Spawn Form */}
            {isSpawnOpen && (
                <form onSubmit={handleSpawn} className="flex flex-wrap items-end gap-3 p-3 border-b border-[#333] shrink-0 bg-[#0f0f0f]">
                    <div className="flex flex-col">
                        <label className="text-xs text-[#888] mb-1">Name:</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="bg-[#1d2021] border border-[#555] px-2 py-1 outline-none focus:border-[#fabd2f] text-[#fabd2f] w-32"
                            placeholder="proc_name"
                            required
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className="text-xs text-[#888] mb-1">Burst:</label>
                        <input
                            type="number"
                            value={burst}
                            onChange={(e) => setBurst(e.target.value)}
                            min="1"
                            className="bg-[#1d2021] border border-[#555] px-2 py-1 outline-none focus:border-[#fabd2f] text-[#fabd2f] w-20"
                            required
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className="text-xs text-[#888] mb-1">Priority:</label>
                        <input
                            type="number"
                            value={priority}
                            onChange={(e) => setPriority(e.target.value)}
                            min="1"
                            max="10"
                            className="bg-[#1d2021] border border-[#555] px-2 py-1 outline-none focus:border-[#fabd2f] text-[#fabd2f] w-20"
                            required
                        />
                    </div>
                    <button type="button" onClick={handleSpawn} className="px-3 py-1 bg-[#fabd2f] text-[#1d2021] font-bold hover:bg-[#ffca40]">
                        Submit
                    </button>
                </form>
            )}

            {/* Custom Workload Form */}
            {isCustomOpen && (
                <form onSubmit={handleCustomSubmit} className="grid grid-cols-4 gap-x-4 gap-y-2 p-3 border-b border-[#333] shrink-0 bg-[#0f0f0f]">
                    <div className="flex flex-col">
                        <label className="text-[10px] text-[#888] uppercase">Count:</label>
                        <input type="number" value={customParams.count} 
                            onChange={e=>setCustomParams({...customParams, count: parseInt(e.target.value)})}
                            className="bg-[#1d2021] border border-[#555] px-2 py-1 outline-none focus:border-[#fabd2f] text-[#fabd2f]" min="1" max="50" />
                    </div>
                    <div className="flex flex-col">
                        <label className="text-[10px] text-[#888] uppercase">Burst Range:</label>
                        <div className="flex items-center gap-1">
                            <input type="number" value={customParams.min_burst} 
                                onChange={e=>setCustomParams({...customParams, min_burst: parseInt(e.target.value)})}
                                className="bg-[#1d2021] border border-[#555] px-1 py-1 outline-none w-1/2" min="1" />
                            <span>-</span>
                            <input type="number" value={customParams.max_burst} 
                                onChange={e=>setCustomParams({...customParams, max_burst: parseInt(e.target.value)})}
                                className="bg-[#1d2021] border border-[#555] px-1 py-1 outline-none w-1/2" min="1" />
                        </div>
                    </div>
                    <div className="flex flex-col">
                        <label className="text-[10px] text-[#888] uppercase">Priority Range:</label>
                        <div className="flex items-center gap-1">
                            <input type="number" value={customParams.min_pri} 
                                onChange={e=>setCustomParams({...customParams, min_pri: parseInt(e.target.value)})}
                                className="bg-[#1d2021] border border-[#555] px-1 py-1 outline-none w-1/2" min="1" />
                            <span>-</span>
                            <input type="number" value={customParams.max_pri} 
                                onChange={e=>setCustomParams({...customParams, max_pri: parseInt(e.target.value)})}
                                className="bg-[#1d2021] border border-[#555] px-1 py-1 outline-none w-1/2" min="10" />
                        </div>
                    </div>
                    <div className="flex flex-col">
                        <label className="text-[10px] text-[#888] uppercase">Arrival Range:</label>
                        <div className="flex items-center gap-1">
                            <input type="number" value={customParams.min_arr} 
                                onChange={e=>setCustomParams({...customParams, min_arr: parseInt(e.target.value)})}
                                className="bg-[#1d2021] border border-[#555] px-1 py-1 outline-none w-1/2" min="0" />
                            <span>-</span>
                            <input type="number" value={customParams.max_arr} 
                                onChange={e=>setCustomParams({...customParams, max_arr: parseInt(e.target.value)})}
                                className="bg-[#1d2021] border border-[#555] px-1 py-1 outline-none w-1/2" min="0" />
                        </div>
                    </div>
                    <div className="col-span-4 flex justify-end gap-2 mt-1">
                        <button type="button" onClick={()=>setIsCustomOpen(false)} className="px-3 py-0.5 border border-[#555] text-[#888] hover:text-white">Cancel</button>
                        <button type="submit" className="px-6 py-0.5 bg-[#fabd2f] text-black font-bold hover:bg-[#ffca40]">GENERATE WORKLOAD</button>
                    </div>
                </form>
            )}
            <div className="flex-1 overflow-auto">
                {processes.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-[#555]">
                        <p>No processes. Click SPAWN or load a WORKLOAD.</p>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-[#1d2021] border-b border-[#fabd2f] uppercase">
                            <tr>
                                <th className="p-2 w-12 font-normal">PID</th>
                                <th className="p-2 font-normal">Name</th>
                                <th className="p-2 w-28 font-normal">State</th>
                                <th className="p-2 w-20 font-normal">Pri</th>
                                <th className="p-2 w-20 font-normal">Burst</th>
                                <th className="p-2 w-20 font-normal">Rem</th>
                                <th className="p-2 w-20 font-normal">Wait</th>
                                <th className="p-2 w-20 font-normal">TAT</th>
                                <th className="p-2 w-20 font-normal text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {processes.map((proc) => (
                                <tr key={proc.pid} className="border-b border-[#222] hover:bg-[#111] transition-colors">
                                    <td className="p-2 text-[#555]">{proc.pid.toString().padStart(3, '0')}</td>
                                    <td className="p-2">{proc.name}</td>
                                    <td className="p-2 flex items-center gap-2">
                                        <span
                                            className="w-2 h-2 rounded-full inline-block"
                                            style={{ backgroundColor: getStateColor(proc.state) }}
                                        ></span>
                                        {proc.state}
                                    </td>
                                    <td className="p-2">{proc.priority}</td>
                                    <td className="p-2">{proc.burst_time}</td>
                                    <td className="p-2">{proc.remaining_time}</td>
                                    <td className="p-2">{proc.waiting_time}</td>
                                    <td className="p-2">{proc.turnaround_time}</td>
                                    <td className="p-2 text-center">
                                        <button
                                            onClick={() => handleKill(proc.pid)}
                                            className="text-[#ff3c3c] hover:underline"
                                            disabled={!isConnected || proc.state === 'TERMINATED'}
                                        >
                                            [KILL]
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};
