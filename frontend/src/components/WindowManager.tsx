import { useWindowStore } from '../store/windowStore';
import BaseWindow from './BaseWindow';
import TerminalApp from './TerminalApp';
import { ProcessManager } from './ProcessManager';
import { SchedulerView } from './SchedulerView';
import { MemoryViewer } from './MemoryViewer';
import { SyncVisualizer } from './SyncVisualizer';

/**
 * WindowManager Component
 * Renders the active windows and handles application routing.
 */
export default function WindowManager() {
    const { windows } = useWindowStore();

    if (windows.length === 0) {
        return (
            <div className="w-full h-full flex items-center justify-center pointer-events-none">
                <div className="text-[#fabd2f]/10 flex flex-col items-center">
                    <div className="w-32 h-32 border border-current rounded-full flex items-center justify-center mb-4">
                        <span className="text-4xl">G</span>
                    </div>
                    <span className="text-sm font-bold tracking-[0.5em] uppercase">GhostKernel Desktop</span>
                </div>
            </div>
        );
    }

    return (
        <div className="absolute inset-0 pointer-events-none">
            {windows.map((window) => (
                <div key={window.id} className="pointer-events-auto">
                    <BaseWindow window={window}>
                        {renderAppContent(window.id, window.type)}
                    </BaseWindow>
                </div>
            ))}
        </div>
    );
}

/**
 * Helper to render the appropriate component based on app type
 */
function renderAppContent(id: string, type: string) {
    switch (type) {
        case 'terminal':
            return <TerminalApp id={id} />;
        case 'process_mgr':
            return <ProcessManager />;
        case 'scheduler':
            return <SchedulerView />;
        case 'memory':
            return <MemoryViewer />;
        case 'sync':
            return <SyncVisualizer />;
        default:
            return <div className="p-4">Unknown App Type: {type}</div>;
    }
}
