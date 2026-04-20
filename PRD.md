# GhostKernel OS — Agent-Executable PRD
# For: Claude Code / antigravity agentic execution
# Project: CS-330 CEP | BESE-30 | Spring 2026
# Stack: C++ (kernel) + Node.js (bridge) + React/TypeScript (UI)
# Progress file: ./progress.txt (agent MUST update after EVERY task)

---

## AGENT INSTRUCTIONS

You are an autonomous coding agent building GhostKernel OS.
Read this PRD top to bottom. Execute tasks in PHASE order.
After completing ANY task:
  1. Mark it DONE in progress.txt
  2. Update LAST_UPDATED timestamp in progress.txt
  3. Update OVERALL_PROGRESS percentage in progress.txt
  4. Move to the next task immediately without stopping

Do NOT ask for confirmation between tasks unless you hit a BLOCKER.
If you hit a BLOCKER: write it in progress.txt under BLOCKERS section and stop.

---

## PROJECT OVERVIEW

Name:    GhostKernel OS
Concept: Browser-accessible OS kernel simulator with a CRT amber terminal UI.
         C++ handles all kernel logic (scheduling, memory, sync).
         Node.js bridges the C++ binary to the React frontend via JSON over stdin/stdout.
         React renders a full terminal emulator (xterm.js) with retro CRT aesthetic.
Tagline: "No GUI. Just Kernel."

---

## REPOSITORY STRUCTURE TO CREATE

ghostkernel/
├── kernel/
│   ├── include/
│   │   ├── json.hpp          (download from nlohmann — see AGENT NOTES)
│   │   ├── pcb.h
│   │   ├── scheduler.h
│   │   ├── memory.h
│   │   └── sync.h
│   ├── src/
│   │   ├── pcb.cpp
│   │   ├── scheduler.cpp
│   │   ├── memory.cpp
│   │   ├── sync.cpp
│   │   ├── workload.cpp
│   │   └── main.cpp
│   └── CMakeLists.txt
├── server/
│   ├── index.js
│   ├── bridge.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── BootSequence.tsx
│   │   │   ├── Dock.tsx
│   │   │   ├── StatusBar.tsx
│   │   │   ├── WindowManager.tsx
│   │   │   ├── TerminalApp.tsx
│   │   │   ├── ProcessManager.tsx
│   │   │   ├── SchedulerView.tsx
│   │   │   ├── MemoryViewer.tsx
│   │   │   └── SyncVisualizer.tsx
│   │   ├── commands/
│   │   │   ├── index.ts
│   │   │   ├── ps.ts
│   │   │   ├── sched.ts
│   │   │   ├── mem.ts
│   │   │   └── sync.ts
│   │   ├── store/
│   │   │   ├── kernelStore.ts
│   │   │   └── windowStore.ts
│   │   └── App.tsx
│   ├── index.html
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── package.json
├── progress.txt
├── PRD.md
└── README.md

---

## PHASE 0 — SCAFFOLDING

### TASK-001: Initialize repository structure
ACTION: Create all directories and empty placeholder files per the structure above.
VERIFY: `find ghostkernel/ -type f` lists all expected files.
UPDATE_PROGRESS: Mark TASK-001 DONE.

### TASK-002: Setup C++ CMakeLists.txt
ACTION: Create ghostkernel/kernel/CMakeLists.txt:
  - cmake_minimum_required VERSION 3.16
  - project: ghostkernel, language: CXX
  - set CMAKE_CXX_STANDARD 17
  - add_executable(ghostkernel_engine src/pcb.cpp src/scheduler.cpp src/memory.cpp src/sync.cpp src/workload.cpp src/main.cpp)
  - target_include_directories: include/
  - compile flags: -pthread -O2 -Wall
ACTION: Download nlohmann json.hpp:
  curl -L https://github.com/nlohmann/json/releases/download/v3.11.3/json.hpp -o kernel/include/json.hpp
VERIFY: cmake -S kernel/ -B kernel/build && cmake --build kernel/build succeeds.
UPDATE_PROGRESS: Mark TASK-002 DONE.

### TASK-003: Setup Node.js server
ACTION: Create server/package.json:
  {
    "name": "ghostkernel-server",
    "version": "1.0.0",
    "main": "index.js",
    "scripts": { "start": "node index.js" },
    "dependencies": { "express": "^4.18.0", "cors": "^2.8.5", "ws": "^8.14.0" }
  }
ACTION: Run `cd ghostkernel/server && npm install`
VERIFY: node_modules/ exists with no errors.
UPDATE_PROGRESS: Mark TASK-003 DONE.

### TASK-004: Setup React frontend
ACTION: In ghostkernel/frontend/ run:
  npm create vite@latest . -- --template react-ts
  npm install
  npm install xterm xterm-addon-fit zustand recharts tailwindcss autoprefixer postcss
  npx tailwindcss init -p
ACTION: Set tailwind.config.js content: ["./index.html","./src/**/*.{ts,tsx}"]
ACTION: Replace frontend/src/index.css with:

  @tailwind base;
  @tailwind components;
  @tailwind utilities;

  :root {
    --amber: #ffb000;
    --green: #00ff41;
    --red:   #ff3c3c;
    --dim:   #555555;
    --bg:    #0a0a0a;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: var(--bg);
    color: var(--amber);
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    overflow: hidden;
    height: 100vh;
  }

  body::after {
    content: '';
    position: fixed;
    inset: 0;
    background: repeating-linear-gradient(
      0deg, transparent, transparent 2px,
      rgba(0,0,0,0.05) 2px, rgba(0,0,0,0.05) 4px
    );
    pointer-events: none;
    z-index: 9999;
  }

ACTION: Add to index.html <head>:
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
VERIFY: cd frontend && npm run build completes with no type errors.
UPDATE_PROGRESS: Mark TASK-004 DONE.

---

## PHASE 1 — C++ KERNEL ENGINE

### TASK-101: pcb.h and pcb.cpp

FILE: kernel/include/pcb.h
IMPLEMENT:
  - enum class ProcessState { NEW, READY, RUNNING, WAITING, TERMINATED }
  - string stateToString(ProcessState s)
  - struct PCB { int pid, name(string), state, priority(1-10), burst_time,
                 remaining_time, arrival_time, waiting_time, turnaround_time,
                 response_time(default -1), program_counter }
  - struct TCB { int tid, parent_pid, stack_ptr; ProcessState state }
  - string pcbToJson(const PCB& p)
  - string pcbListToJson(const vector<PCB>& list)
  - string tcbToJson(const TCB& t)

FILE: kernel/src/pcb.cpp
IMPLEMENT: all declared functions using nlohmann::json for serialization.

VERIFY: Compiles with zero warnings as part of cmake build.
UPDATE_PROGRESS: Mark TASK-101 DONE.

### TASK-102: scheduler.h and scheduler.cpp

FILE: kernel/include/scheduler.h
IMPLEMENT:
  - enum class SchedulerAlgo { FCFS, ROUND_ROBIN, PRIORITY, MLFQ }
  - struct GanttEntry { int pid, start_time, end_time }
  - struct SchedulerMetrics {
      double avg_waiting_time, avg_turnaround_time, avg_response_time,
             cpu_utilization, throughput;
      vector<GanttEntry> gantt;
    }
  - class Scheduler {
      public:
        SchedulerAlgo current_algo = FCFS;
        int quantum = 4;
        void setAlgorithm(SchedulerAlgo algo);
        void setQuantum(int q);
        SchedulerMetrics run(vector<PCB> processes);
        string metricsToJson(const SchedulerMetrics& m);
        string ganttToAscii(const SchedulerMetrics& m, const vector<PCB>& procs);
      private:
        SchedulerMetrics runFCFS(vector<PCB> procs);
        SchedulerMetrics runRR(vector<PCB> procs);
        SchedulerMetrics runPriority(vector<PCB> procs);
        SchedulerMetrics runMLFQ(vector<PCB> procs);
    }

FILE: kernel/src/scheduler.cpp
IMPLEMENT:
  FCFS:     sort by arrival_time, run each to completion, track waiting/turnaround.
  RR:       circular ready queue, preempt after quantum ticks, re-add to queue tail.
  Priority: preemptive — always run highest priority ready process.
  MLFQ:     3 queues: Q0(q=4) Q1(q=8) Q2(FCFS). Demote on quantum expiry.
            Boost all processes to Q0 every 50 ticks.

  ganttToAscii: render ASCII chart. Format exactly:
    GANTT [<ALGO> q=<Q>]
    Time:  0    4    8    12   16   20
           |    |    |    |    |    |
    P1  :  [====]         [==]
    P2  :       [====]
    P3  :            [====]         [==]
    ---
    AvgWait: X.XX  AvgTAT: X.XX  CPU: XX.X%  Throughput: X.XX proc/tick

VERIFY: Test workload P1(arr=0,burst=5) P2(arr=1,burst=3) P3(arr=2,burst=8) P4(arr=3,burst=2)
  FCFS avg_waiting_time must equal 4.25 (within 0.01 tolerance).
UPDATE_PROGRESS: Mark TASK-102 DONE.

### TASK-103: memory.h and memory.cpp

FILE: kernel/include/memory.h
IMPLEMENT:
  - enum class PagePolicy { FIFO, LRU, OPTIMAL }
  - struct PageFrame { int frame_id, pid(-1=free), page_num(-1=free),
                       load_time, last_used; bool valid, dirty, referenced }
  - struct MemoryStats { int total_frames(32), used_frames, free_frames,
                         page_faults, page_hits; double hit_rate }
  - class MemoryManager {
      public:
        static const int TOTAL_FRAMES = 32;
        static const int PAGE_SIZE = 4;
        PagePolicy policy = LRU;
        int current_tick = 0;
        MemoryManager();
        void setPolicy(PagePolicy p);
        bool allocatePages(int pid, int num_pages);
        void deallocate(int pid);
        int translateAddress(int pid, int virtual_addr);
        void accessPage(int pid, int page_num, vector<int> future_refs = {});
        MemoryStats getStats();
        string memoryMapToString();
        string allFramesToJson();
        string compareReplacement(vector<int> ref_string, int num_frames);
      private:
        vector<PageFrame> frames;
        map<int, vector<int>> page_tables;
        int page_faults = 0, page_hits = 0;
        int findFreeFrame();
        int fifoReplace();
        int lruReplace();
        int optimalReplace(vector<int>& future_refs, int current_pos);
    }

FILE: kernel/src/memory.cpp
IMPLEMENT:
  memoryMapToString format exactly:
    PHYSICAL MEMORY [32 FRAMES | 128KB]  Policy: LRU
    FRAME  PID   PAGE  V  D  R  USAGE
    [00]   001    0   [V][ ][ ] ████████████████
    [01]   ---    -   [ ][ ][ ] ░░░░░░░░░░░░░░░░
    ...
    USED: X/32  FREE: Y/32  FAULTS: Z  HIT RATE: XX.X%

  compareReplacement: simulate FIFO, LRU, Optimal independently on same ref_string.
    Return JSON: {"fifo": N, "lru": N, "optimal": N, "ref_string": [...], "frames": N}

VERIFY: ref_string=[7,0,1,2,0,3,0,4,2,3,0,3,2] frames=3
  FIFO=9 faults, LRU=10 faults, Optimal=7 faults.
  (These are classic textbook values — must match exactly.)
UPDATE_PROGRESS: Mark TASK-103 DONE.

### TASK-104: sync.h and sync.cpp

FILE: kernel/include/sync.h
IMPLEMENT:
  - struct SyncEvent { int tick, pid; string action, resource; bool success }
  - class Mutex {
      public: string name; int owner_pid=-1; bool locked=false;
              queue<int> wait_queue;
              Mutex(string n);
              bool lock(int pid, vector<SyncEvent>& log, int tick);
              void unlock(int pid, vector<SyncEvent>& log, int tick);
              string toJson();
    }
  - class Semaphore {
      public: string name; int count, max_count; queue<int> wait_queue;
              Semaphore(string n, int initial, int max);
              void wait(int pid, vector<SyncEvent>& log, int tick);   // P()
              void signal(int pid, vector<SyncEvent>& log, int tick); // V()
              string toJson();
    }
  - struct ScenarioResult { vector<SyncEvent> events; bool deadlock_occurred; string summary }
  - class SyncEngine {
      public:
        string runProducerConsumer(int num_items, int buffer_size);
        string runDiningPhilosophers(int num_philosophers, bool allow_deadlock);
        string runReaderWriter(int num_readers, int num_writers);
        string detectDeadlock(map<int,int>& held, map<int,int>& waiting);
    }

FILE: kernel/src/sync.cpp
IMPLEMENT:
  Producer-Consumer: semaphores empty(buffer_size), full(0), mutex(1).
    1 producer thread (simulated), 1 consumer thread (simulated).
    Simulate num_items productions and consumptions sequentially.
    Log every P()/V()/BLOCKED event with tick timestamp.

  Dining Philosophers (5 philosophers, 5 fork mutexes):
    allow_deadlock=false: philosopher 4 picks right fork first (resource ordering).
    allow_deadlock=true:  all philosophers pick left fork first → circular wait.
    Detect deadlock using DFS cycle detection on wait-for graph.
    Log DEADLOCK event when detected.

  Reader-Writer: readers-preference.
    readcount semaphore, mutex for readcount, wrt mutex for writers.
    Simulate 3 readers and 2 writers with interleaved access.

  detectDeadlock: DFS on wait-for graph. held[pid]=resource, waiting[pid]=resource.
    Return string: "DEADLOCK: cycle P1->P2->P1" or "NO DEADLOCK"

VERIFY:
  runDiningPhilosophers(5, true)  → deadlock_occurred == true
  runDiningPhilosophers(5, false) → deadlock_occurred == false
UPDATE_PROGRESS: Mark TASK-104 DONE.

### TASK-105: workload.cpp and main.cpp (command dispatcher)

FILE: kernel/src/workload.cpp
IMPLEMENT:
  vector<PCB> generateWorkload(const string& type, int seed=42)
    cpu_bound: 10 procs, burst uniform[15,30], priority uniform[1,3], arrival uniform[0,5]
    io_bound:  10 procs, burst uniform[2,6],  priority uniform[4,7], arrival uniform[0,20]
    mixed:     10 procs, burst uniform[3,25], priority uniform[1,10], arrival uniform[0,15]
  Use mt19937(seed) for reproducibility. Auto-assign PIDs starting at 1.
  string workloadToJson(const vector<PCB>& procs)

FILE: kernel/src/main.cpp
IMPLEMENT a JSON command dispatcher:
  - Read lines from stdin in a loop (while getline(cin, line))
  - Parse each line as JSON using nlohmann::json
  - Dispatch on cmd field, write JSON response to stdout, flush immediately
  - Handle every command in the table below:

  CMD                  | RESPONSE FIELDS
  ---------------------|--------------------------------------------------
  ping                 | status, msg:"GhostKernel Engine 1.0"
  spawn                | status, pid, process:{pcb json}
    params: name, burst, priority, arrival(default 0)
  kill                 | status  (error if pid not found)
    params: pid
  ps                   | status, processes:[pcb list], count
  sched_set            | status, algo, quantum
    params: algo(fcfs/rr/priority/mlfq), quantum(optional)
  sched_run            | status, metrics:{json}, gantt_ascii:string
    (runs scheduler on current process list)
  sched_compare        | status, results:[{algo, metrics}x4]
    params: workload(cpu_bound/io_bound/mixed)
  mem_map              | status, map:string, stats:{json}
  mem_alloc            | status (error if no free frames)
    params: pid, pages
  mem_free             | status
    params: pid
  mem_translate        | status, physical_addr (error if unmapped)
    params: pid, vaddr
  mem_policy           | status
    params: policy(fifo/lru/optimal)
  mem_compare          | status, comparison:{fifo,lru,optimal,ref_string,frames}
    params: ref_string:[int array], frames
  sync_demo            | status, events:[SyncEvent list], deadlock:bool, summary
    params: scenario(producer_consumer/dining_philosophers/reader_writer)
            + scenario-specific params
  workload             | status, processes:[pcb list]
    params: type(cpu_bound/io_bound/mixed)
  experiment_run       | status, results:[{workload, algo, metrics}] (12 entries)
    (runs all 4 algos x 3 workloads automatically)
  ghostfetch           | status, ascii:string (see format below)
  exit                 | status — then call exit(0)

  ghostfetch ascii format (populate live stats from engine state):
    ██████╗ ██╗  ██╗ ██████╗ ███████╗████████╗
    (ascii art block — hardcode a clean 6-line GHOST block letter art)
    then key:value info table:
      OS         : GhostKernel 1.0.0 (user-space)
      Kernel     : C++17 / Node Bridge / React
      Shell      : ghostsh 1.0
      Scheduler  : <current algo>
      Memory     : <used>/32 frames | <faults> faults | <hit_rate>% hit
      Processes  : <total> total, <running> running, <waiting> waiting
      Uptime     : <tick_count> ticks
      Build      : CS-330 CEP Spring 2026

VERIFY:
  echo '{"cmd":"ping"}' | ./kernel/build/ghostkernel_engine
    → {"status":"ok","msg":"GhostKernel Engine 1.0"}
  echo '{"cmd":"experiment_run"}' | ./kernel/build/ghostkernel_engine
    → valid JSON with results array of length 12
UPDATE_PROGRESS: Mark TASK-105 DONE.

---

## PHASE 2 — NODE.JS BRIDGE

### TASK-201: bridge.js
FILE: server/bridge.js
IMPLEMENT class KernelBridge:
  - constructor: spawn ../kernel/build/ghostkernel_engine as child_process
  - Use readline to read stdout line by line
  - sendCommand(jsonObj): write JSON+\n to stdin, return Promise resolving to parsed response
  - Use a pending request queue (Map<id, {resolve,reject}>) to match responses
    (add a _req_id field to every command, echo it back in response)
  - Handle stderr: log to console.error, do not reject pending requests
  - Handle child exit: reject all pending, attempt restart up to 3 times with 1s delay
  - restartCount tracker, emit 'offline' event if restarts exhausted
module.exports = new KernelBridge()

### TASK-202: server/index.js
FILE: server/index.js
IMPLEMENT:
  - Express app on PORT 3001
  - cors({ origin: 'http://localhost:5173' })
  - express.json() middleware
  - GET  /ping         → { status:'ok', engine:'GhostKernel' }
  - POST /command      → forward body to bridge.sendCommand(), return result
  - WebSocket server (ws) upgrading the same http server
  - On WS message: parse JSON, sendCommand, send response back to that client
  - On WS error/close: clean up gracefully

VERIFY:
  node server/index.js &
  curl -X POST http://localhost:3001/command \
    -H "Content-Type: application/json" \
    -d '{"cmd":"ping"}'
  → {"status":"ok","msg":"GhostKernel Engine 1.0"}
UPDATE_PROGRESS: Mark TASK-201 and TASK-202 DONE.

---

## PHASE 3 — REACT FRONTEND (DESKTOP ENVIRONMENT)

### TASK-301: kernelStore.ts
FILE: frontend/src/store/kernelStore.ts
IMPLEMENT Zustand store:
  State:
    processes: PCB[]        (default [])
    algo: string            (default 'fcfs')
    quantum: number         (default 4)
    memStats: object        (default {used:0,free:32,faults:0,hit_rate:0})
    uptime: number          (default 0, increments every second)
    engineOnline: boolean   (default false)

  Actions:
    sendCommand(cmd: object): Promise<any>
      → POST to http://localhost:3001/command with cmd as body
      → return parsed JSON response
    refreshStatus(): Promise<void>
      → sendCommand({cmd:'ps'}) → update processes
      → sendCommand({cmd:'mem_map'}) → update memStats
    setAlgo(algo: string): void
      → update local state + sendCommand({cmd:'sched_set', algo})
    checkEngine(): Promise<void>
      → sendCommand({cmd:'ping'}) → set engineOnline true/false

  On store init:
    setInterval(refreshStatus, 2000)
    setInterval(incrementUptime, 1000)
    checkEngine()

### TASK-302: BootSequence.tsx
FILE: frontend/src/components/BootSequence.tsx
PROPS: { onComplete: () => void }
IMPLEMENT:
  - Full screen div, bg #0a0a0a, text #ffb000, font monospace
  - On mount: play sequence below line-by-line, each line appends to displayed lines array
  - After last line + 500ms delay: call onComplete()
  - [OK] suffix text must be colored #00ff41
  - Render each line with a fade-in CSS animation (opacity 0 → 1, 150ms)

  Sequence (ms delay before showing each line):
    300  "GhostKernel BIOS v1.0 — Initializing..."
    400  "Checking RAM .................. 256MB     [OK]"
    300  "Detecting CPU cores ........... 4 cores   [OK]"
    500  "Loading kernel image .......... loaded     [OK]"
    300  "Mounting virtual filesystem ... /proc /sys [OK]"
    400  "Starting scheduler ............ MLFQ       [OK]"
    300  "Starting memory manager ....... Paging LRU [OK]"
    400  "Starting sync daemon .......... ready      [OK]"
    600  ""
    300  "████████████████████████████████ 100%"
    500  ""
    400  "ghostkernel login: root"
    800  "Password: ████████"
    300  ""
    400  "Welcome to GhostKernel 1.0.0 (CS-330 CEP Spring 2026)"
    300  "Kernel: C++17 | Bridge: Node.js | UI: React/TypeScript"
    500  "Type 'help' for available commands."
    300  ""

### TASK-303: StatusBar.tsx (Desktop Top Bar)
FILE: frontend/src/components/StatusBar.tsx
IMPLEMENT:
  - Fixed top bar across the entire desktop, height 32px, full width, z-index above windows
  - bg: rgba(10,10,10,0.9), backdrop-filter: blur(8px), border-bottom: 1px solid #ffb000
  - Left:   "GHOSTKERNEL OS" bold amber + engine status indicator (green dot if online)
  - Center: clickable algo badge cycling fcfs→rr→priority→mlfq on click
            badge style: border 1px solid amber, px-2, uppercase monospace
  - Right:  "CPU:[████░░░░] XX%  MEM:XX%  PROCS:X  UP:XXXs" + clock (HH:MM:SS)
            derive CPU% as (running_procs / max(total_procs,1)) * 100
            derive MEM% as (used_frames / 32) * 100
  - All values from kernelStore, update reactively
  - This bar sits above the desktop workspace and all windows (highest z-index layer)

### TASK-304: TerminalApp.tsx (Terminal in Floating Window)
FILE: frontend/src/components/TerminalApp.tsx
IMPLEMENT:
  - Terminal is now an "app" that opens inside a floating managed window (via WindowManager)
  - The component receives NO position/size props — WindowManager handles all positioning
  - Create xterm Terminal instance with options:
      theme: { background:'#0a0a0a', foreground:'#ffb000',
               cursor:'#ffb000', selectionBackground:'#ffb000' }
      fontFamily: 'JetBrains Mono, monospace'
      fontSize: 14
      cursorBlink: true
  - Use FitAddon to fill the window's CONTENT AREA (not full screen)
  - Re-fit terminal whenever the parent window is resized or focused
    (listen to windowStore dimension changes for this window's ID)
  - Mount terminal into a div ref on component mount
  - Render prompt: "\x1b[33mroot@ghostkernel:~$\x1b[0m "  (amber colored)
  - On keypress:
      Printable chars: append to input buffer, write to terminal
      Backspace: pop from input buffer, terminal write "\b \b"
      Enter: dispatch command, clear buffer, write newline
      ArrowUp/Down: navigate commandHistory array, replace buffer
  - commandHistory: string[], maxLength 50
  - Expose writeOutput(lines: string[]) method via useImperativeHandle
    writes lines one by one with 20ms delay (typewriter effect for responses)
  - Color codes for output:
      ERROR lines (start with ERROR or ⚠): \x1b[31m ... \x1b[0m  (red)
      SUCCESS/OK lines: \x1b[32m ... \x1b[0m  (green)
      DEADLOCK lines: \x1b[31m\x1b[1m ... \x1b[0m  (bold red)
      Default: \x1b[33m  (amber)

### TASK-305: Command handlers

FILE: frontend/src/commands/ps.ts
IMPLEMENT functions (each returns Promise<string[]> — lines to print):
  handlePs()         → sendCommand({cmd:'ps'}) → format aligned ASCII table:
                        PID  NAME       STATE     PRI  BURST  WAIT  TAT
                        001  proc_A     RUNNING   5    8      0     -
  handleSpawn(args)  → sendCommand({cmd:'spawn', name, burst, priority, arrival:0})
                        → "Process spawned: PID=X name=Y"
  handleKill(args)   → sendCommand({cmd:'kill', pid:Number(args[0])})
  handlePstree()     → sendCommand({cmd:'ps'}) → ASCII tree grouped by state:
                        PROCESS TREE
                        ├── RUNNING
                        │   └── [001] proc_A (burst=8, pri=5)
                        ├── READY
                        │   ├── [002] proc_B
                        └── WAITING
                            └── [003] proc_C
  handleGhostfetch() → sendCommand({cmd:'ghostfetch'}) → return ascii field split by \n

FILE: frontend/src/commands/sched.ts
IMPLEMENT:
  handleSchedSet(args)     → parse algo and optional --quantum flag
                              sendCommand({cmd:'sched_set', algo, quantum})
  handleSchedRun()         → sendCommand({cmd:'sched_run'})
                              → return gantt_ascii split by \n
  handleSchedMetrics()     → sendCommand({cmd:'sched_run'})
                              → format metrics as table:
                                SCHEDULER METRICS [<algo>]
                                Avg Waiting Time  : X.XX ticks
                                Avg Turnaround    : X.XX ticks
                                Avg Response Time : X.XX ticks
                                CPU Utilization   : XX.X%
                                Throughput        : X.XX proc/tick
  handleSchedCompare(args) → sendCommand({cmd:'sched_compare', workload:args[0]||'mixed'})
                              → ASCII table with all 4 algos as rows, metrics as columns

FILE: frontend/src/commands/mem.ts
IMPLEMENT:
  handleMemMap()             → sendCommand({cmd:'mem_map'}) → return map field split by \n
  handleMemAlloc(args)       → sendCommand({cmd:'mem_alloc', pid, pages})
  handleMemFree(args)        → sendCommand({cmd:'mem_free', pid})
  handleMemTranslate(args)   → sendCommand({cmd:'mem_translate', pid, vaddr})
                                → "Virtual 0x<vaddr> → Physical 0x<paddr>"
  handleMemPolicy(args)      → sendCommand({cmd:'mem_policy', policy:args[0]})
  handleMemCompare()         → sendCommand({cmd:'mem_compare',
                                ref_string:[7,0,1,2,0,3,0,4,2,3,0,3,2], frames:3})
                                → ASCII table:
                                  PAGE REPLACEMENT COMPARISON [3 frames]
                                  Ref String: 7 0 1 2 0 3 0 4 2 3 0 3 2
                                  Algorithm   Page Faults   Winner?
                                  FIFO        9
                                  LRU         10
                                  Optimal     7             <-- BEST
  handleMemStress()          → generate random ref_string of 30 ints (0-7)
                                → sendCommand with frames:4, same compare format

FILE: frontend/src/commands/sync.ts
IMPLEMENT:
  handleSyncDemo(args)   → route to correct scenario based on args[0]:
    producer-consumer    → sendCommand({cmd:'sync_demo', scenario:'producer_consumer',
                              items:10, buffer:5})
    dining-philosophers  → sendCommand({cmd:'sync_demo', scenario:'dining_philosophers',
                              num_philosophers:5, allow_deadlock:false})
    dining-deadlock      → same but allow_deadlock:true
    reader-writer        → sendCommand({cmd:'sync_demo', scenario:'reader_writer',
                              readers:3, writers:2})
  → stream events to terminal:
    DEADLOCK events: prefix with "⚠ " and color red
    LOCK/SIGNAL:     color green
    BLOCKED:         color amber
    all events: format as "[T=XXXms] P<pid> → <action> <resource>"
  → after all events: print summary line and deadlock status

FILE: frontend/src/commands/index.ts
IMPLEMENT command router:
  - parseInput(input: string): {command, subcommand, args}
  - dispatch(parsed): Promise<string[]>  — returns lines to print
  - Route table (all commands):
      ps                        → handlePs
      spawn <n> <burst> <pri>  → handleSpawn
      kill <pid>                → handleKill
      pstree                    → handlePstree
      ghostfetch                → handleGhostfetch
      sched set <algo>          → handleSchedSet
      sched run                 → handleSchedRun
      sched metrics             → handleSchedMetrics
      sched compare [workload]  → handleSchedCompare
      mem map                   → handleMemMap
      mem alloc <pid> <pages>   → handleMemAlloc
      mem free <pid>            → handleMemFree
      mem translate <pid> <v>   → handleMemTranslate
      mem policy <p>            → handleMemPolicy
      mem compare               → handleMemCompare
      mem stress                → handleMemStress
      sync demo <scenario>      → handleSyncDemo
      workload <type>           → sendCommand({cmd:'workload', type})
      experiment run            → sendCommand({cmd:'experiment_run'})
                                   → render 12-row ASCII table grouped by workload
      help                      → print all commands with one-line description
      clear                     → signal terminal to clear (return ['__CLEAR__'])
      exit                      → sendCommand({cmd:'exit'}) → "Shutting down GhostKernel..."
      unknown                   → "Command not found: <x>. Type 'help' for list."

### TASK-306: App.tsx (Desktop Environment Shell)
FILE: frontend/src/App.tsx
IMPLEMENT:
  - State: booted(bool, default false)
  - If !booted: <BootSequence onComplete={()=>setBooted(true)} />
  - If booted: Render full desktop environment:
      <div className="desktop-env h-screen w-screen relative overflow-hidden">
        {/* Background: dark CRT wallpaper with subtle grid/scanline pattern */}
        <div className="wallpaper absolute inset-0 bg-[#080808]" />
        <StatusBar />                    {/* Fixed top bar — highest z-index */}
        <Dock />                         {/* Left-side app dock/sidebar */}
        <div className="desktop-workspace absolute inset-0 mt-8 ml-16">
          <WindowManager />             {/* Renders all floating windows */}
        </div>
      </div>
  - On booted: call kernelStore.checkEngine()
    If engine offline: auto-open a Terminal window with warning:
      "⚠ WARNING: Kernel engine offline."
      "Start server: cd server && node index.js"
      "Then refresh the page."
  - Auto-open a Terminal window on first boot as the default landing experience

### TASK-307: Window Manager System (Zustand + React)
FILE: frontend/src/store/windowStore.ts
FILE: frontend/src/components/WindowManager.tsx
IMPLEMENT Zustand store (windowStore.ts):
  State:
    windows: WindowState[]
      WindowState: { id:string, title:string, appType:string,
                     x:number, y:number, width:number, height:number,
                     zIndex:number, isMinimized:boolean, isFocused:boolean }
    nextZIndex: number        (default 100)
    activeWindowId: string | null
  Actions:
    openWindow(appType, title, initialSize?): string
      → create WindowState with unique id, staggered default position, push to array
      → return the new window id
    closeWindow(id): void       → remove from array
    focusWindow(id): void       → set activeWindowId, assign nextZIndex++ to that window
    minimizeWindow(id): void    → toggle isMinimized
    moveWindow(id, x, y): void  → update position (clamped to desktop bounds)
    resizeWindow(id, w, h): void → update dimensions (min 400x300)

IMPLEMENT WindowManager.tsx:
  - Renders all non-minimized windows from windowStore
  - Each window is a floating <div> with absolute positioning:
      style: { left: x, top: y, width: w, height: h, zIndex }
  - Window chrome (title bar + borders):
      Title bar: 28px tall, bg #111, border-bottom 1px solid #ffb000
        Left:  app icon (emoji or CSS-drawn) + window title (amber monospace)
        Right: [—] minimize   [✕] close   (amber text, bright on hover)
      Title bar is the drag handle (onMouseDown starts drag, onMouseMove updates pos,
        onMouseUp ends drag — use document-level listeners for smooth dragging)
      Border: 1px solid rgba(255,176,0,0.4), border-radius 4px
      Content area: bg #0a0a0a, overflow hidden, flex-1
      Resize handle: 12x12 area at bottom-right corner, cursor nwse-resize
      Window shadow: 0 0 20px rgba(255,176,0,0.08)
  - On click anywhere in window: call focusWindow(id) → brings to front via z-index
  - Focused window: border brightens to rgba(255,176,0,0.8)
  - Content area renders the app component based on appType:
      'terminal'          → <TerminalApp />
      'process-manager'   → <ProcessManager />
      'scheduler'         → <SchedulerView />
      'memory'            → <MemoryViewer />
      'sync'              → <SyncVisualizer />

### TASK-308: Dock.tsx (App Launcher Sidebar)
FILE: frontend/src/components/Dock.tsx
IMPLEMENT:
  - Fixed left-side vertical dock, width 64px, full height below StatusBar
  - bg: rgba(10,10,10,0.85), backdrop-filter: blur(8px), border-right: 1px solid #333
  - Contains icon buttons for each application:
      Terminal (>_)         → windowStore.openWindow('terminal', 'Terminal')
      Process Manager (☰)  → windowStore.openWindow('process-manager', 'Process Manager')
      CPU Scheduler (▤)    → windowStore.openWindow('scheduler', 'CPU Scheduler')
      Memory Viewer (⬡)    → windowStore.openWindow('memory', 'Memory Viewer')
      Sync Demo (⟳)        → windowStore.openWindow('sync', 'Sync Demo')
  - Each icon: 48x48 area with centered content
      Default: dim amber (#555) icon/text
      Hover: bright amber (#ffb000) with subtle glow (box-shadow 0 0 8px rgba(255,176,0,0.3))
      Tooltip: app name on hover (positioned to the right of the icon)
  - Active indicator: 3px tall amber bar on left edge next to icons with open windows
  - Use CSS-drawn icons or simple Unicode glyphs for retro aesthetic

### TASK-309: ProcessManager.tsx (GUI App Window)
FILE: frontend/src/components/ProcessManager.tsx
IMPLEMENT:
  - Renders inside a managed window (no position props — WindowManager handles layout)
  - Auto-refreshes process list from kernelStore every 2 seconds
  - Top toolbar:
      [SPAWN] button → expands inline form: name (text), burst (number), priority (number)
        → dispatches spawn command on submit, collapses form
      [WORKLOAD ▼] dropdown → options: cpu_bound, io_bound, mixed
        → dispatches workload command to generate batch processes
      [REFRESH] button → manual refresh of process list
  - Main area: process table with columns:
      PID | Name | State | Priority | Burst | Remaining | Wait | TAT
  - State column uses colored dot indicators:
      ● green (#00ff41)  = RUNNING
      ● amber (#ffb000)  = READY
      ● red   (#ff3c3c)  = TERMINATED
      ● dim   (#555555)  = WAITING / NEW
  - Action column per row:
      [KILL] button (red text) → sends kill command, refreshes list after response
  - Empty state: centered message "No processes. Click SPAWN or load a WORKLOAD."
  - Table styling: monospace font, amber text on #0a0a0a bg, subtle row hover (#111)
  - Header row: border-bottom 1px solid #ffb000, uppercase amber text, sticky top

### TASK-310: SchedulerView.tsx (GUI App Window)
FILE: frontend/src/components/SchedulerView.tsx
IMPLEMENT:
  - Renders inside a managed window
  - Top section: Algorithm Controls
      Four buttons: [FCFS] [RR] [PRIORITY] [MLFQ]
        Active algo: filled amber bg (#ffb000), dark text (#0a0a0a)
        Inactive: outlined amber border, amber text
      Quantum slider: visible when RR or MLFQ selected (range 1-20, default 4)
      [RUN SCHEDULER] button: bright amber, triggers sched_run command
  - Middle section: Gantt Chart Visualization
      Render scheduler results as horizontal bars on a time axis:
        X-axis: time ticks (0, 4, 8, 12, ...) with grid lines
        Y-axis: process labels (P1, P2, P3, ...)
        Each process: colored bar segment (amber/green/red palette, one color per PID)
        Bar shows PID label inside if wide enough
      Chart background: #0a0a0a with #111 gridlines
      Render using div-based bars (no external chart library needed for Gantt)
  - Bottom section: Metrics Panel
      Display as styled stat cards in a grid (2×3 or 3×2):
        Avg Waiting Time | Avg Turnaround Time | Avg Response Time
        CPU Utilization   | Throughput          | Process Count
      Each card: border 1px solid #333, amber value text, dim (#555) label text
  - [COMPARE ALL] button: runs sched_compare with current workload
      Shows side-by-side comparison table: rows=algos, cols=metrics
      Highlight the best (winning) algo per metric column in green (#00ff41)

### TASK-311: MemoryViewer.tsx (GUI App Window)
FILE: frontend/src/components/MemoryViewer.tsx
IMPLEMENT:
  - Renders inside a managed window
  - Main display: 32-cell visual grid (8×4) representing physical memory frames
      Each cell: ~60×60px box showing Frame #, PID (or "FREE"), Page #
      Color coding:
        Allocated: amber border + amber tint background
        Free: dim border (#333), dark empty interior
        Dirty: red left-border accent (#ff3c3c)
        Referenced: green dot indicator (#00ff41)
      Hover tooltip: full frame details (V/D/R flags, load_time, last_used)
  - Right panel: Memory Stats card
      Used frames / 32 (with amber progress bar)
      Free frames / 32
      Page faults counter
      Hit rate % (with progress bar, green accent)
      Current replacement policy badge
  - Bottom toolbar:
      Policy selector: [FIFO] [LRU] [OPTIMAL] toggle buttons
        Active: filled amber, inactive: outlined
        Clicking sends mem_policy command
      [ALLOCATE] button → inline form (PID, num_pages) → mem_alloc command
      [FREE] button → inline form (PID) → mem_free command
      [TRANSLATE] button → inline form (PID, virtual_addr) → shows physical addr result
  - [COMPARE POLICIES] button: runs mem_compare
      Shows comparison panel: bar chart of page faults per policy
      Highlight OPTIMAL as winner with green (#00ff41) accent

### TASK-312: SyncVisualizer.tsx (GUI App Window)
FILE: frontend/src/components/SyncVisualizer.tsx
IMPLEMENT:
  - Renders inside a managed window
  - Scenario selector: tab bar at top
      [Producer-Consumer] [Dining Philosophers] [Reader-Writer] [Deadlock Demo]
  - Each scenario has a [RUN] button with configurable parameters:
      Producer-Consumer: items (default 10), buffer_size (default 5)
      Dining Philosophers: num_philosophers (default 5), allow_deadlock=false
      Deadlock Demo: num_philosophers (default 5), allow_deadlock=true
      Reader-Writer: readers (default 3), writers (default 2)
  - Timeline view: vertical scrolling event log
      Each event row: "[T=XXX] P<pid> → <action> <resource>"
      Color coded:
        LOCK/SIGNAL events: #00ff41 (green) text
        BLOCKED events: #ffb000 (amber) text
        DEADLOCK events: #ff3c3c (red) bold text with CSS pulse animation
      Auto-scroll to latest event as they stream in
  - Visual indicator panel (scenario-specific, shown alongside timeline):
      Producer-Consumer: animated buffer fill-level bar (items in buffer / max)
      Dining Philosophers: circular arrangement of 5 philosopher nodes and 5 fork edges
        Show fork ownership (amber=held, dim=free) and philosopher states
        (green=eating, amber=thinking, red=waiting)
      Reader-Writer: resource block with reader count / writer count indicators
  - DEADLOCK alert: red banner with pulse animation across top of window when detected
      Text: "⚠ DEADLOCK DETECTED: circular wait cycle" in bold #ff3c3c
  - Summary panel at bottom: shows final stats after scenario completes

VERIFY:
  npm run dev starts without errors.
  Browser shows boot sequence animation.
  After boot: full desktop environment with wallpaper, dock, and status bar.
  Clicking dock icons opens floating windows.
  Windows are draggable, resizable, closable, and stackable (z-index).
  Terminal works inside a floating window with amber prompt and cursor.
  GUI app windows display kernel data with retro amber/dark CRT styling.
  All terminal commands still function correctly within the windowed terminal.
  Typing 'help' shows command list in terminal window.
  Typing 'ghostfetch' (with server running) shows ASCII art in terminal window.
UPDATE_PROGRESS: Mark TASK-301 through TASK-312 DONE.

---

## PHASE 4 — INTEGRATION & VERIFICATION

### TASK-401: Full stack smoke test
ACTION: Run all three components simultaneously:
  Terminal 1: cmake --build kernel/build
  Terminal 2: node server/index.js
  Terminal 3: cd frontend && npm run dev
  Open: http://localhost:5173

VERIFY each command end-to-end:
  ghostfetch           → ASCII art + stats printed
  ps                   → "No processes" or process table
  spawn alpha 10 5     → "Process spawned: PID=1"
  spawn beta 6 8       → "Process spawned: PID=2"
  ps                   → shows P1 and P2
  sched set rr         → "Scheduler set to ROUND_ROBIN"
  sched run            → ASCII Gantt chart printed
  sched metrics        → metrics table printed
  mem map              → memory frame table printed
  mem alloc 1 4        → success
  mem translate 1 0    → physical address printed
  mem compare          → FIFO/LRU/Optimal table with Optimal winning
  sync demo producer-consumer  → events streamed
  sync demo dining-deadlock    → DEADLOCK printed in red
  experiment run       → 12-row comparison table printed
  kill 1               → success
  ps                   → P1 gone or TERMINATED

UPDATE_PROGRESS: Mark TASK-401 DONE.

### TASK-402: Edge cases and polish
ACTION: Test and fix:
  - kill 999 → must show red error "ERROR: PID 999 not found"
  - mem translate 999 0 → must show red error "ERROR: PID 999 has no page table"
  - sched run with 0 processes → must show "No processes to schedule"
  - Resize window → xterm must refit (FitAddon.fit() on resize event)
  - Arrow up × 5 → must navigate command history correctly
  - Tab on "sche" → must autocomplete to "sched"
  - All experiment_run results have non-zero metrics (no division by zero)
UPDATE_PROGRESS: Mark TASK-402 DONE.

---

## PHASE 5 — REPORT & README

### TASK-501: Generate report assets
ACTION: Run experiment run in terminal. Capture output.
ACTION: Create report/results/experiment_results.json with the 12-run data.
ACTION: Build a standalone report/charts.html using Recharts (or Chart.js CDN) that renders:
  - Grouped bar chart: Avg Waiting Time (4 algos × 3 workloads)
  - Grouped bar chart: Avg Turnaround Time (4 algos × 3 workloads)
  - Bar chart: Page Faults — FIFO vs LRU vs Optimal (3 bars)
  - Bar chart: CPU Utilization per algorithm on mixed workload
  Chart colors: use the CRT palette (#ffb000, #00ff41, #ff3c3c, #555555)
  Charts should be self-contained in the HTML file (no server needed).
UPDATE_PROGRESS: Mark TASK-501 DONE.

### TASK-502: README.md
FILE: README.md (root)
IMPLEMENT:
  # GhostKernel OS
  > "No GUI. Just Kernel." — CS-330 CEP Spring 2026

  ## Prerequisites
  - g++ 17+
  - CMake 3.16+
  - Node.js 18+
  - npm 9+

  ## Build & Run (3 steps)
  Step 1: cmake -S kernel/ -B kernel/build && cmake --build kernel/build
  Step 2: cd server && npm install && node index.js
  Step 3: cd frontend && npm install && npm run dev
  Open: http://localhost:5173

  ## Terminal Commands
  (full table of all commands with descriptions)

  ## Team
  (names and roles)

  ## Architecture
  (brief description + link to PRD.md)

UPDATE_PROGRESS: Mark TASK-502 DONE. Set OVERALL_PROGRESS to 100%.

---

## COMPLETION CRITERIA

The project is complete when ALL of the following are true:
  cmake --build kernel/build → exits 0
  echo '{"cmd":"experiment_run"}' | ./kernel/build/ghostkernel_engine → 12 results
  node server/index.js → starts, curl /ping returns ok
  npm run dev → boot sequence → full desktop environment rendered
  Desktop shows: wallpaper background, top status bar, left dock sidebar
  Window Manager: open, drag, resize, close, minimize, z-stack all working
  Terminal opens as floating windowed app with functional xterm.js
  GUI apps (ProcessManager, SchedulerView, MemoryViewer, SyncVisualizer) render and function
  All 20+ CLI commands tested and working inside the terminal window
  DEADLOCK highlighted in red in both terminal and SyncVisualizer GUI
  ghostfetch shows live stats in terminal window
  Multiple windows can be open simultaneously with correct z-index stacking
  report/charts.html renders 4 charts
  progress.txt shows OVERALL_PROGRESS: 100%

---

## AGENT NOTES

1. nlohmann/json: Download with:
   curl -L https://github.com/nlohmann/json/releases/download/v3.11.3/json.hpp \
     -o kernel/include/json.hpp

2. C++ JSON protocol: Every response MUST be on a single line (no newlines in JSON).
   Use nlohmann::json::dump() with no indent argument.

3. Scheduler correctness is graded. Use textbook definitions:
   FCFS: non-preemptive, FIFO on arrival
   RR: preemptive on quantum, strict circular order
   Priority: preemptive, higher number = higher priority
   MLFQ: strict 3-queue demotion with periodic boost

4. ASCII art: use only printable ASCII 32-126.
   Exception: block chars ░ (U+2591) and █ (U+2588) are allowed for bars.

5. Test C++ binary standalone before wiring to Node. Always pipe single-line JSON.

6. If MLFQ implementation takes too long, implement FCFS+RR+Priority first,
   stub MLFQ as Priority with a note in progress.txt. Add MLFQ last.

7. Keep all C++ output flushed: use `cout << response << "\n" << flush;`

8. xterm.js version: use xterm@5.x for React 18 compatibility.

9. PRD.md may be updated for architectural pivots. Always update progress.txt.
