import { useEffect, useRef } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { useKernelStore } from '../store/kernelStore';
import { dispatchCommand } from '../commands';

const PROMPT = '\x1b[33mroot@ghostkernel:~$\x1b[0m ';

/**
 * Terminal Component
 * Provides an interactive shell interface to the Kernel Engine via xterm.js.
 */
export default function Terminal() {
    const containerRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<XTerm | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const { isConnected, sendCommand } = useKernelStore();
    
    // Command input tracking
    const inputBuffer = useRef<string>("");
    const history = useRef<string[]>([]);
    const historyPos = useRef<number>(-1);

    useEffect(() => {
        if (!containerRef.current) return;

        // Initialize xterm
        const term = new XTerm({
            theme: {
                background: '#1d2021',
                foreground: '#fabd2f',
                cursor: '#fabd2f',
                selectionBackground: '#fabd2f'
            },
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 14,
            cursorBlink: true,
            scrollback: 1000,
            rows: 30
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        
        term.open(containerRef.current);
        fitAddon.fit();

        // Print welcome
        term.writeln('\x1b[33mGhostKernel Terminal Interface v1.0.0\x1b[0m');
        if (!isConnected) {
            term.writeln('\x1b[31m[ERROR] Connection to bridge lost. Attempting reconnect...\x1b[0m');
        }
        term.write(PROMPT);

        // Input handling
        term.onData(async (data) => {
            if (!isConnected) return;

            const charCode = data.charCodeAt(0);

            if (charCode === 13) { // Enter
                const cmd = inputBuffer.current.trim();
                term.write('\r\n');
                
                if (cmd.length > 0) {
                    await handleLocalCommand(cmd);
                    history.current.unshift(cmd);
                    historyPos.current = -1;
                } else {
                    term.write(PROMPT);
                }
                
                inputBuffer.current = "";
            } else if (charCode === 127) { // Backspace
                if (inputBuffer.current.length > 0) {
                    inputBuffer.current = inputBuffer.current.slice(0, -1);
                    term.write('\b \b');
                }
            } else if (data === '\x1b[A') { // Arrow Up
                if (history.current.length > 0 && historyPos.current < history.current.length - 1) {
                    historyPos.current++;
                    const histCmd = history.current[historyPos.current];
                    // Clear current line
                    for (let i = 0; i < inputBuffer.current.length; i++) term.write('\b \b');
                    inputBuffer.current = histCmd;
                    term.write(histCmd);
                }
            } else if (data === '\x1b[B') { // Arrow Down
                if (historyPos.current > -1) {
                    historyPos.current--;
                    // Clear current line
                    for (let i = 0; i < inputBuffer.current.length; i++) term.write('\b \b');
                    const histCmd = historyPos.current === -1 ? "" : history.current[historyPos.current];
                    inputBuffer.current = histCmd;
                    term.write(histCmd);
                }
            } else if (charCode >= 32 && charCode <= 126) {
                inputBuffer.current += data;
                term.write(data);
            }
        });

        const handleLocalCommand = async (rawInput: string) => {
            const parts = rawInput.split(/\s+/);
            const cmd = parts[0].toLowerCase();

            if (cmd === 'clear') {
                term.clear();
                term.write(PROMPT);
                return;
            }


            // Route via central dispatcher
            const result = await dispatchCommand(rawInput, sendCommand);
            if (result) {
                result.forEach(line => term.writeln(line));
                term.write(PROMPT);
            }
        };

        xtermRef.current = term;
        fitAddonRef.current = fitAddon;

        // Responsive handling
        const handleResize = () => {
            fitAddon.fit();
        };
        window.addEventListener('resize', handleResize);
        
        return () => {
            window.removeEventListener('resize', handleResize);
            term.dispose();
        };
    }, [isConnected, sendCommand]);

    return (
        <div className="flex-1 bg-[#1d2021] relative overflow-hidden flex flex-col pt-8"> {/* pt-8 for status bar offset */}
            <div 
                ref={containerRef} 
                className="flex-1 p-4" 
                style={{ height: 'calc(100vh - 32px)' }} 
            />
            
            <div className="pointer-events-none fixed inset-0 z-[9999] bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,0,0,0.05)_2px,rgba(0,0,0,0.05)_4px)]" />
        </div>
    );
}
