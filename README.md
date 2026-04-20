# GhostKernel OS

> "No GUI. Just Kernel." — CS-330 CEP Spring 2026

**GhostKernel OS** is a browser-accessible OS kernel simulator featuring a CRT amber terminal UI. A robust C++ engine performs process scheduling, memory management, and process synchronization simulation. A Node.js backend serves as a WebSocket bridge sending low-level kernel telemetry to the React Desktop environment, where dynamic metrics, system calls, and retro-themed visuals bring terminal and GUI tools to life.

## Prerequisites
- g++ 17+
- CMake 3.16+
- Node.js 18+
- npm 9+

## Build & Run
First, compile the kernel binary:
```bash
cmake -S kernel/ -B kernel/build && cmake --build kernel/build
```

Second, launch the Express/WebSocket bridge server:
```bash
cd server && npm install && node index.js
```

Third, fire up the React frontend:
```bash
cd frontend && npm install && npm run dev
```
Open `http://localhost:5173` in your browser.

## Terminal Commands

| Command | Description |
|---------|-------------|
| `ping` | Ping the bridge / kernel to verify uptime. |
| `ps` | Lists active process tables and states. |
| `spawn <name> <burst> <pri>` | Submits a new process to the scheduler. |
| `kill <pid>` | Terminates a process by ID. |
| `pstree` | Views process states visually as a tree. |
| `ghostfetch` | Generates system info art + telemetry stats. |
| `sched set <algo>` | Sets scheduler algorithm: `fcfs`, `rr`, `priority`, `mlfq` |
| `sched run` | Prints an ASCII Gantt chart timeline of scheduler logic. |
| `sched metrics` | Calculates Avg/TAT times and utilization mathematically. |
| `sched compare [wk]` | Compare algorithms against a workload profile (mixed, io_bound, etc) |
| `mem map` | Dumps current Physical Frame utilization map. |
| `mem alloc <pid> <pg>` | Allocate contig pages arrays to user. |
| `mem free <pid>` | Deallocates all memory for `pid`. |
| `mem translate <pid> <v>`| Yields Physical Memory translated addresses. |
| `mem policy <p>` | Switches policy among `fifo`, `lru`, `optimal`. |
| `mem compare` | Pit FIFO, LRU, and Optimal algorithms against one another in a Page Fault test. | 
| `sync demo <sce>` | Fires Producer/Consumer, Philosophers, or Deadlock scenarios with streaming results. |
| `experiment run` | Automate all testing criteria across OS workload simulations. |
| `exit` | Powers off GhostKernel cleanly. |

## Architecture
GhostKernel separates simulation from presentation: 
**1. The Engine:** Pure C++ simulating clocks, process arrays, FIFO queues, RR quantums, LRU caching matrices. 
**2. The Bridge:** Node.js pipe bridging standard raw I/O across local WebSockets.
**3. The Shell:** Zustand and TS/React xterm UI overlay drawing the floating-window Desktop Window Manager.

(View full spec details in [PRD.md](./PRD.md))
