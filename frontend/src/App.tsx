import { useEffect } from 'react';
import { useKernelStore } from './store/kernelStore';
import BootSequence from './components/BootSequence';
import StatusBar from './components/StatusBar';
import WindowManager from './components/WindowManager';
import Dock from './components/Dock';
import wallpaperUrl from './assets/DY6CWa.jpg';

/**
 * App Component
 * The main Desktop Environment Shell for GhostKernel OS.
 */
function App() {
  const connect = useKernelStore(state => state.connect);
  const booted = useKernelStore(state => state.booted);
  const setBooted = useKernelStore(state => state.setBooted);

  useEffect(() => {
    // Initiate connection to the Node.js bridge on startup
    connect();

    // Cleanup connection on unmount to prevent leaks in StrictMode
    return () => {
      const { disconnect } = useKernelStore.getState();
      disconnect();
    };
  }, [connect]);

  // If not booted, show the retro BIOS sequence
  if (!booted) {
    return <BootSequence onComplete={() => setBooted(true)} />;
  }

  // Once booted, show the Desktop Interface
  return (
    <div className="relative w-screen h-screen bg-[#1d2021] overflow-hidden select-none">

      {/* 1. TOP: Persistent Status Bar */}
      <StatusBar />

      {/* 2. CENTER: Desktop Workspace / Window Manager */}
      <main
        className="absolute inset-0 pt-8 pb-16 overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: `url(${wallpaperUrl})` }}
      >
        <WindowManager />
      </main>

      {/* 3. BOTTOM: Application Dock */}
      <Dock />

      {/* 4. OVERLAYS: Global CRT Effects */}
      {/* Scanline texture */}
      <div className="pointer-events-none fixed inset-0 z-[100001] bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,0,0,0.05)_2px,rgba(0,0,0,0.05)_4px)]" />

      {/* Screen noise / grain */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.03] z-[100002] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay" />

      {/* Screen vignette */}
      <div className="pointer-events-none fixed inset-0 z-[100003] shadow-[inset_0_0_150px_rgba(0,0,0,0.5)]" />
    </div>
  );
}

export default App;
