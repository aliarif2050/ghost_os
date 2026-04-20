import { useWindowStore } from '../store/windowStore';
import type { AppType } from '../store/windowStore';

interface AppIcon {
    type: AppType;
    label: string;
    icon: string;
    color: string;
}

const APPS: AppIcon[] = [
    { type: 'terminal', label: 'Terminal', icon: '>_', color: '#00f0ff' },
    { type: 'process_mgr', label: 'Processes', icon: '☰', color: '#00f0ff' },
    { type: 'scheduler', label: 'Scheduler', icon: '⧖', color: '#00f0ff' },
    { type: 'memory', label: 'Memory', icon: '▦', color: '#00f0ff' },
    { type: 'sync', label: 'Sync', icon: '⇅', color: '#00f0ff' },
];

/**
 * Dock Component
 * The desktop application launcher.
 */
export default function Dock() {
    const { openWindow, windows } = useWindowStore();

    return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[10000] flex items-center gap-2 p-1.5 bg-[#050a1f]/80 backdrop-blur-md border border-[#00f0ff]/30 rounded-lg shadow-[0_0_20px_rgba(0,0,0,0.5)]">
            {APPS.map((app) => {
                const isOpen = windows.some(w => w.type === app.type);
                
                return (
                    <div key={app.type} className="relative group">
                        <button
                            onClick={() => openWindow(app.type, app.label)}
                            className={`w-12 h-12 flex flex-col items-center justify-center rounded border transition-all duration-300 ${isOpen ? 'bg-[#00f0ff]/10 border-[#00f0ff]' : 'border-[#00f0ff]/20 hover:border-[#00f0ff]/60 hover:bg-[#00f0ff]/5'}`}
                        >
                            <span className="text-xl leading-none mb-0.5">{app.icon}</span>
                            <span className="text-[7px] uppercase font-bold tracking-tighter opacity-70">{app.label}</span>
                        </button>

                        {/* App Title Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-2 py-1 bg-[#00f0ff] text-[#050a1f] text-[9px] font-bold uppercase rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                            {app.label}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-x-4 border-x-transparent border-t-4 border-t-[#00f0ff]" />
                        </div>

                        {/* Active Indicator */}
                        {isOpen && (
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#00f0ff] rounded-full shadow-[0_0_5px_#00f0ff]" />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
