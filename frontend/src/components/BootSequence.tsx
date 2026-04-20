import { useState, useEffect } from 'react';

interface BootLine {
    text: string;
    delay: number;
}

const BOOT_LOG: BootLine[] = [
    { text: "GhostKernel BIOS v1.0 — Initializing...", delay: 300 },
    { text: "Checking RAM .................. 256MB     [OK]", delay: 400 },
    { text: "Detecting CPU cores ........... 4 cores   [OK]", delay: 300 },
    { text: "Loading kernel image .......... loaded    [OK]", delay: 500 },
    { text: "Mounting virtual filesystem ... /proc /sys [OK]", delay: 300 },
    { text: "Starting scheduler ............ MLFQ      [OK]", delay: 400 },
    { text: "Starting memory manager ....... Paging LRU [OK]", delay: 300 },
    { text: "Starting sync daemon .......... ready     [OK]", delay: 400 },
    { text: "", delay: 600 },
    { text: "████████████████████████████████ 100%", delay: 300 },
    { text: "", delay: 500 },
    { text: "ghostkernel login: root", delay: 400 },
    { text: "Password: ████████", delay: 800 },
    { text: "", delay: 300 },
    { text: "Welcome to GhostKernel 1.0.0 (CS-330 CEP Spring 2026)", delay: 400 },
    { text: "Kernel: C++17 | Bridge: Node.js | UI: React/TypeScript", delay: 300 },
    { text: "Type 'help' for available commands.", delay: 500 },
    { text: "", delay: 300 },
];

/**
 * BootSequence Component
 * Plays a retro BIOS authentication sequence before entering the shell.
 */
export default function BootSequence({ onComplete }: { onComplete: () => void }) {
    const [visibleLines, setVisibleLines] = useState<number>(0);

    useEffect(() => {
        if (visibleLines < BOOT_LOG.length) {
            const timer = setTimeout(() => {
                setVisibleLines((prev) => prev + 1);
            }, BOOT_LOG[visibleLines].delay);
            return () => clearTimeout(timer);
        } else {
            const timer = setTimeout(onComplete, 1000);
            return () => clearTimeout(timer);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visibleLines]);

    return (
        <div className="flex flex-col h-screen bg-[#1d2021] p-8 font-mono text-[#fabd2f] overflow-hidden">
            <div className="flex-1 space-y-1">
                {BOOT_LOG.slice(0, visibleLines).map((line, i) => (
                    <div 
                        key={i} 
                        className="animate-[fade-in_150ms_ease-in-out]"
                        style={{ opacity: 1 }}
                    >
                        {line.text.includes('[OK]') ? (
                            <span>
                                {line.text.split('[OK]')[0]}
                                <span className="text-[#00ff41]">[OK]</span>
                            </span>
                        ) : (
                            line.text
                        )}
                    </div>
                ))}
                {visibleLines < BOOT_LOG.length && (
                    <span className="inline-block w-2.5 h-5 bg-[#fabd2f] animate-pulse align-middle ml-1" />
                )}
            </div>
            
            {/* CRT Scanline Effect Overlay */}
            <div className="pointer-events-none fixed inset-0 z-[9999] bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,0,0,0.05)_2px,rgba(0,0,0,0.05)_4px)]" />
        </div>
    );
}
