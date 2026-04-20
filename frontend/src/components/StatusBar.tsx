import { useState, useEffect } from 'react';
import { useKernelStore } from '../store/kernelStore';

/**
 * StatusBar Component
 * The persistent top bar of the GhostKernel Desktop.
 * Displays OS identification, interactive scheduler controls, and live resource telemetry.
 */
export default function StatusBar() {
  const { 
    isConnected, 
    stats, 
    processes, 
    algo, 
    memStats, 
    uptime, 
    setAlgo 
  } = useKernelStore();

  const [time, setTime] = useState(new Date().toLocaleTimeString());

  // Update local clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString([], { hour12: false }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Algorithm cycling logic
  const algos = ['fcfs', 'rr', 'priority', 'mlfq'];
  const handleAlgoClick = () => {
    const currentIndex = algos.indexOf(algo.toLowerCase());
    const nextIndex = (currentIndex + 1) % algos.length;
    setAlgo(algos[nextIndex]);
  };

  // Metric calculation
  const cpuPercent = stats?.cpu || 0;
  const memPercent = (memStats.used / 32) * 100;
  const procsCount = processes.length;

  /**
   * Renders a text-based meter e.g. [████░░░░]
   */
  const renderVisualMeter = (percent: number, blocks: number = 8) => {
    const filled = Math.round((percent / 100) * blocks);
    return `[${'█'.repeat(Math.min(filled, blocks))}${'░'.repeat(Math.max(0, blocks - filled))}]`;
  };

  return (
    <div className="h-8 min-h-[32px] w-full bg-[#050a1f]/90 backdrop-blur-md border-b border-[#00f0ff] flex items-center justify-between px-3 font-mono text-[#00f0ff] text-[11px] select-none z-[9999] fixed top-0 left-0">
      
      {/* LEFT: System Identity */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 group cursor-default">
          <div className="w-2.5 h-2.5 bg-[#00f0ff] rounded-sm group-hover:rotate-45 transition-transform duration-300" />
          <span className="font-bold tracking-tighter text-xs">GHOSTKERNEL OS</span>
        </div>
        
        <div className="flex items-center gap-2 border-l border-[#00f0ff]/30 pl-3">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#00ff41] shadow-[0_0_5px_#00ff41]' : 'bg-[#ff3c3c] shadow-[0_0_5px_#ff3c3c]'}`} />
          <span className={`uppercase font-bold ${isConnected ? 'text-[#00ff41]' : 'text-[#ff3c3c]'}`}>
            {isConnected ? 'Kernel Online' : 'Kernel Offline'}
          </span>
        </div>
      </div>

      {/* CENTER: Scheduler Toggle */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center">
        <button 
          onClick={handleAlgoClick}
          className="px-3 py-0.5 border border-[#00f0ff] bg-[#00f0ff]/10 hover:bg-[#00f0ff] hover:text-[#050a1f] transition-colors font-bold uppercase tracking-widest text-[10px]"
          title="Cycle Scheduling Algorithm"
        >
          {algo}
        </button>
      </div>

      {/* RIGHT: Live Telemetry */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[#00f0ff]/60">CPU</span>
            <span className="font-bold">{renderVisualMeter(cpuPercent)}</span>
            <span className="w-8 text-right font-bold">{Math.round(cpuPercent)}%</span>
          </div>

          <div className="flex items-center gap-2 border-l border-[#00f0ff]/20 pl-4">
            <span className="text-[#00f0ff]/60">MEM</span>
            <span className="font-bold">{Math.round(memPercent)}%</span>
          </div>

          <div className="flex items-center gap-2 border-l border-[#00f0ff]/20 pl-4">
            <span className="text-[#00f0ff]/60">PROCS</span>
            <span className="font-bold">{procsCount}</span>
          </div>
          
          <div className="flex flex-col items-end border-l border-[#00f0ff]/20 pl-4 min-w-[40px]">
            <span className="text-[9px] text-[#00f0ff]/50 leading-none">UPTIME</span>
            <span className="font-bold leading-none">{uptime}s</span>
          </div>
        </div>

        {/* System Clock */}
        <div className="bg-[#00f0ff] text-[#050a1f] px-2 py-0.5 font-bold text-[10px] ml-2">
          {time}
        </div>
      </div>
    </div>
  );
}
