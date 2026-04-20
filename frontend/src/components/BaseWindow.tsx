import React, { useState, useEffect, useRef } from 'react';
import { useWindowStore } from '../store/windowStore';
import type { WindowInstance } from '../store/windowStore';

interface BaseWindowProps {
    window: WindowInstance;
    children: React.ReactNode;
}

/**
 * BaseWindow Component
 * A draggable, resizable, and focusable window frame for the GhostKernel Desktop.
 */
export default function BaseWindow({ window, children }: BaseWindowProps) {
    const { focusWindow, closeWindow, moveWindow, resizeWindow, maximizeWindow } = useWindowStore();
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const resizeStart = useRef({ w: 0, h: 0, x: 0, y: 0 });

    const handleHeaderMouseDown = (e: React.MouseEvent) => {
        if (window.isMaximized) return;
        focusWindow(window.id);
        setIsDragging(true);
        dragOffset.current = {
            x: e.clientX - window.x,
            y: e.clientY - window.y
        };
    };

    const handleResizeMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        focusWindow(window.id);
        setIsResizing(true);
        resizeStart.current = {
            w: window.width,
            h: window.height,
            x: e.clientX,
            y: e.clientY
        };
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                moveWindow(window.id, e.clientX - dragOffset.current.x, e.clientY - dragOffset.current.y);
            }
            if (isResizing) {
                const dw = e.clientX - resizeStart.current.x;
                const dh = e.clientY - resizeStart.current.y;
                resizeWindow(
                    window.id, 
                    Math.max(300, resizeStart.current.w + dw), 
                    Math.max(200, resizeStart.current.h + dh)
                );
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            setIsResizing(false);
        };

        if (isDragging || isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isResizing, window.id, moveWindow, resizeWindow]);

    const style: React.CSSProperties = window.isMaximized ? {
        top: '32px', // Status bar height
        left: 0,
        width: '100vw',
        height: 'calc(100vh - 32px)',
        zIndex: window.zIndex
    } : {
        top: `${window.y}px`,
        left: `${window.x}px`,
        width: `${window.width}px`,
        height: `${window.height}px`,
        zIndex: window.zIndex
    };

    return (
        <div 
            className={`fixed flex flex-col border border-[#00f0ff] bg-[#050a1f]/80 backdrop-blur-md shadow-[0_0_15px_rgba(255,176,0,0.2)] overflow-hidden transition-[border-color] duration-200 ${window.isFocused ? 'border-opacity-100' : 'border-opacity-30'}`}
            style={style}
            onMouseDown={() => focusWindow(window.id)}
        >
            {/* Title Bar */}
            <div 
                onMouseDown={handleHeaderMouseDown}
                className={`h-7 min-h-[28px] px-2 flex items-center justify-between cursor-default select-none transition-colors duration-200 ${window.isFocused ? 'bg-[#00f0ff] text-[#050a1f]' : 'bg-[#00f0ff]/10 text-[#00f0ff]/50'}`}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    <div className={`w-3 h-3 border ${window.isFocused ? 'border-[#050a1f]' : 'border-[#00f0ff]/30'} flex items-center justify-center`}>
                        <div className={`w-1 h-1 ${window.isFocused ? 'bg-[#050a1f]' : 'bg-[#00f0ff]/30'}`} />
                    </div>
                    <span className="font-bold text-[10px] uppercase truncate tracking-wider">{window.title}</span>
                </div>

                <div className="flex gap-1">
                    <button 
                        onClick={() => maximizeWindow(window.id)}
                        className={`w-5 h-5 flex items-center justify-center border ${window.isFocused ? 'border-[#050a1f]/30 hover:bg-[#050a1f]/10' : 'border-[#00f0ff]/20 hover:bg-[#00f0ff]/10'} transition-all`}
                    >
                        {window.isMaximized ? '❐' : '□'}
                    </button>
                    <button 
                        onClick={() => closeWindow(window.id)}
                        className={`w-5 h-5 flex items-center justify-center border ${window.isFocused ? 'border-[#050a1f]/30 hover:bg-[#ff3c3c] hover:text-white' : 'border-[#00f0ff]/20 hover:bg-[#ff3c3c]/30'} transition-all`}
                    >
                        ✕
                    </button>
                </div>
            </div>

            {/* Window Content */}
            <div className="flex-1 relative overflow-auto bg-black/40">
                {children}
            </div>

            {/* Resize Handle */}
            {!window.isMaximized && (
                <div 
                    onMouseDown={handleResizeMouseDown}
                    className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize flex items-end justify-end p-0.5 group"
                >
                    <div className="w-1.5 h-1.5 border-r border-b border-[#00f0ff] group-hover:w-2 group-hover:h-2 transition-all opacity-50" />
                </div>
            )}
        </div>
    );
}
