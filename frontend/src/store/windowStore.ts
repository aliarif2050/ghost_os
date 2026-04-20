import { create } from 'zustand';

export type AppType = 'terminal' | 'process_mgr' | 'scheduler' | 'memory' | 'sync';

export interface WindowInstance {
    id: string;
    type: AppType;
    title: string;
    x: number;
    y: number;
    width: number;
    height: number;
    isFocused: boolean;
    isMaximized: boolean;
    zIndex: number;
}

interface WindowState {
    windows: WindowInstance[];
    nextZIndex: number;
    
    // Actions
    openWindow: (type: AppType, title: string) => void;
    closeWindow: (id: string) => void;
    focusWindow: (id: string) => void;
    moveWindow: (id: string, x: number, y: number) => void;
    resizeWindow: (id: string, width: number, height: number) => void;
    maximizeWindow: (id: string) => void;
}

/**
 * windowStore
 * Managing the state of floating windows in the GhostKernel Desktop Environment.
 */
export const useWindowStore = create<WindowState>((set, get) => ({
    windows: [],
    nextZIndex: 10,

    openWindow: (type, title) => {
        const id = `${type}-${Math.random().toString(36).substring(2, 9)}`;
        const zIndex = get().nextZIndex;
        
        const newWindow: WindowInstance = {
            id,
            type,
            title,
            x: 50 + (get().windows.length * 20),
            y: 50 + (get().windows.length * 20),
            width: type === 'terminal' ? 700 : 800,
            height: type === 'terminal' ? 450 : 500,
            isFocused: true,
            isMaximized: false,
            zIndex
        };

        set((state) => ({
            windows: [...state.windows.map(w => ({ ...w, isFocused: false })), newWindow],
            nextZIndex: state.nextZIndex + 1
        }));
    },

    closeWindow: (id) => {
        set((state) => ({
            windows: state.windows.filter(w => w.id !== id)
        }));
    },

    focusWindow: (id) => {
        const { windows } = get();
        const target = windows.find(w => w.id === id);
        if (!target || target.isFocused) return;

        set((state) => ({
            windows: state.windows.map(w => ({
                ...w,
                isFocused: w.id === id,
                zIndex: w.id === id ? state.nextZIndex : w.zIndex
            })),
            nextZIndex: state.nextZIndex + 1
        }));
    },

    moveWindow: (id, x, y) => {
        set((state) => ({
            windows: state.windows.map(w => 
                w.id === id ? { ...w, x, y } : w
            )
        }));
    },

    resizeWindow: (id, width, height) => {
        set((state) => ({
            windows: state.windows.map(w => 
                w.id === id ? { ...w, width, height } : w
            )
        }));
    },

    maximizeWindow: (id) => {
        set((state) => ({
            windows: state.windows.map(w => 
                w.id === id ? { ...w, isMaximized: !w.isMaximized } : w
            )
        }));
    }
}));
