import { useEffect, useRef } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { useKernelStore } from '../store/kernelStore';
import { useWindowStore } from '../store/windowStore';
import { dispatchCommand } from '../commands';

const PROMPT = '\x1b[33mroot@ghostkernel:~$\x1b[0m ';

interface TerminalAppProps {
    id: string;
}

/**
 * TerminalApp Component
 * A windowed version of the GhostKernel Terminal.
 */
export default function TerminalApp({ id }: TerminalAppProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<XTerm | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    
    const { isConnected, sendCommand } = useKernelStore();
    const windowState = useWindowStore(state => state.windows.find(w => w.id === id));
    
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
            fontSize: 13,
            cursorBlink: true,
            scrollback: 1000,
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        
        term.open(containerRef.current);
        fitAddon.fit();

        // Print welcome
        term.writeln('\x1b[33mGhostKernel Terminal Window\x1b[0m');
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
            } else if (charCode === 127 || charCode === 8) { // Backspace
                if (inputBuffer.current.length > 0) {
                    inputBuffer.current = inputBuffer.current.slice(0, -1);
                    term.write('\b \b');
                }
            } else if (data === '\x1b[A') { // Arrow Up
                if (history.current.length > 0 && historyPos.current < history.current.length - 1) {
                    historyPos.current++;
                    const histCmd = history.current[historyPos.current];
                    for (let i = 0; i < inputBuffer.current.length; i++) term.write('\b \b');
                    inputBuffer.current = histCmd;
                    term.write(histCmd);
                }
            } else if (data === '\x1b[B') { // Arrow Down
                if (historyPos.current > -1) {
                    historyPos.current--;
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

        return () => {
            term.dispose();
        };
    }, [isConnected, sendCommand]);

    // Update Terminal Size when window size changes
    useEffect(() => {
        if (fitAddonRef.current && xtermRef.current) {
            fitAddonRef.current.fit();
        }
    }, [windowState?.width, windowState?.height, windowState?.isMaximized]);

    return (
        <div className="w-full h-full bg-[#1d2021] p-2">
            <div ref={containerRef} className="w-full h-full" />
        </div>
    );
}
