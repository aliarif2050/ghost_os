#include <iostream>
#include <string>
#include <vector>
#include <map>
#include <algorithm>
#include <iomanip>
#include "json.hpp"
#include "pcb.h"
#include "scheduler.h"
#include "memory.h"
#include "sync.h"
#include "workload.h"

// Using standard namespace as requested throughout the kernel code
using namespace std;
using json = nlohmann::json;

// Global state for the simulation engine
vector<PCB> g_processes;
Scheduler g_scheduler;
MemoryManager g_memory;
SyncEngine g_sync;
int g_tick_count = 0;

// Helper to locate a specific process by its PID
PCB* find_pcb(int pid) {
    for (auto& p : g_processes) if (p.pid == pid) return &p;
    return nullptr;
}

// Generate the classic 'ghostfetch' ASCII art with live system stats
string get_ghostfetch_ascii() {
    stringstream ss;
    ss << " ██████╗ ██╗  ██╗ ██████╗ ███████╗████████╗" << endl;
    ss << "██╔════╝ ██║  ██║██╔═══██╗██╔════╝╚══██╔══╝" << endl;
    ss << "██║  ███╗███████║██║   ██║███████╗   ██║   " << endl;
    ss << "██║   ██║██╔══██║██║   ██║╚════██║   ██║   " << endl;
    ss << "╚██████╔╝██║  ██║╚██████╔╝███████║   ██║   " << endl;
    ss << " ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝   ╚═╝   " << endl;
    ss << endl;
    
    // Determine current scheduling algorithm name
    string algo_name;
    switch(g_scheduler.current_algo) {
        case SchedulerAlgo::FCFS: algo_name = "FCFS"; break;
        case SchedulerAlgo::ROUND_ROBIN: algo_name = "ROUND_ROBIN"; break;
        case SchedulerAlgo::PRIORITY: algo_name = "PRIORITY"; break;
        case SchedulerAlgo::MLFQ: algo_name = "MLFQ"; break;
    }
    
    MemoryStats m = g_memory.getStats();
    int running = 0, waiting = 0;
    for(const auto& p : g_processes) {
        if(p.state == ProcessState::RUNNING) running++;
        else if(p.state == ProcessState::READY || p.state == ProcessState::WAITING) waiting++;
    }

    // Print the system info table
    ss << "OS         : GhostKernel 1.0.0 (user-space)" << endl;
    ss << "Kernel     : C++17 / Node Bridge / React" << endl;
    ss << "Shell      : ghostsh 1.0" << endl;
    ss << "Scheduler  : " << algo_name << endl;
    ss << "Memory     : " << m.used_frames << "/32 frames | " << m.page_faults << " faults | " << fixed << setprecision(1) << m.hit_rate << "% hit" << endl;
    ss << "Processes  : " << g_processes.size() << " total, " << running << " running, " << waiting << " waiting" << endl;
    ss << "Uptime     : " << g_tick_count << " ticks" << endl;
    ss << "Build      : CS-330 CEP Spring 2026" << endl;
    
    return ss.str();
}

int main() {
    string line;
    // Main loop: read JSON commands from stdin
    while (getline(cin, line)) {
        if (line.empty()) continue;
        
        try {
            json req = json::parse(line);
            string cmd = req.value("cmd", "");
            json res;
            res["status"] = "ok";
            
            // Forward request ID for bridge matching if present
            if (req.contains("_req_id")) res["_req_id"] = req["_req_id"];

            // 1. SYSTEM COMMANDS
            if (cmd == "ping") {
                res["msg"] = "GhostKernel Engine 1.0";
            }
            else if (cmd == "ghostfetch") {
                res["ascii"] = get_ghostfetch_ascii();
            }
            else if (cmd == "exit") {
                cout << json({{"status","ok"},{"msg","Shutting down GhostKernel..."}}).dump() << endl;
                exit(0);
            }

            // 2. PROCESS MANAGEMENT
            else if (cmd == "spawn") {
                PCB p;
                p.pid = g_processes.empty() ? 1 : g_processes.back().pid + 1;
                p.name = req.value("name", "new_proc");
                p.burst_time = req.value("burst", 5);
                p.remaining_time = p.burst_time;
                p.priority = req.value("priority", 5);
                p.arrival_time = req.value("arrival", 0);
                p.state = ProcessState::READY;
                p.waiting_time = 0;
                p.turnaround_time = 0;
                g_processes.push_back(p);
                res["pid"] = p.pid;
                res["process"] = json::parse(pcbToJson(p));
            }
            else if (cmd == "kill") {
                int pid = req.value("pid", -1);
                auto it = find_if(g_processes.begin(), g_processes.end(), [&](const PCB& p){ return p.pid == pid; });
                if (it != g_processes.end()) {
                    g_processes.erase(it);
                } else {
                    res["status"] = "error";
                    res["msg"] = "PID " + to_string(pid) + " not found";
                }
            }
            else if (cmd == "ps") {
                res["processes"] = json::parse(pcbListToJson(g_processes));
                res["count"] = g_processes.size();
            }
            else if (cmd == "workload") {
                string type = req.value("type", "mixed");
                if (type == "custom") {
                    WorkloadParams wp;
                    wp.count = req.value("count", 10);
                    wp.min_burst = req.value("min_burst", 1);
                    wp.max_burst = req.value("max_burst", 30);
                    wp.min_pri = req.value("min_pri", 1);
                    wp.max_pri = req.value("max_pri", 10);
                    wp.min_arr = req.value("min_arr", 0);
                    wp.max_arr = req.value("max_arr", 20);
                    g_processes = generateCustomWorkload(wp);
                } else {
                    g_processes = generateWorkload(type);
                }
                res["processes"] = json::parse(pcbListToJson(g_processes));
            }

            // 3. SCHEDULER MANAGEMENT
            else if (cmd == "sched_set") {
                string algo_str = req.value("algo", "fcfs");
                if (algo_str == "fcfs") g_scheduler.setAlgorithm(SchedulerAlgo::FCFS);
                else if (algo_str == "rr") g_scheduler.setAlgorithm(SchedulerAlgo::ROUND_ROBIN);
                else if (algo_str == "priority") g_scheduler.setAlgorithm(SchedulerAlgo::PRIORITY);
                else if (algo_str == "mlfq") g_scheduler.setAlgorithm(SchedulerAlgo::MLFQ);
                
                if (req.contains("quantum")) g_scheduler.setQuantum(req["quantum"]);
                res["algo"] = algo_str;
                res["quantum"] = g_scheduler.quantum;
            }
            else if (cmd == "sched_run") {
                SchedulerMetrics m = g_scheduler.run(g_processes);
                res["metrics"] = json::parse(g_scheduler.metricsToJson(m));
                res["gantt_ascii"] = g_scheduler.ganttToAscii(m, g_processes);
            }
            else if (cmd == "sched_compare") {
                string type = req.value("workload", "mixed");
                vector<PCB> workload = generateWorkload(type);
                json results = json::array();
                
                vector<SchedulerAlgo> algos = {SchedulerAlgo::FCFS, SchedulerAlgo::ROUND_ROBIN, SchedulerAlgo::PRIORITY, SchedulerAlgo::MLFQ};
                for(auto a : algos) {
                    Scheduler temp_sched;
                    temp_sched.setAlgorithm(a);
                    temp_sched.setQuantum(g_scheduler.quantum);
                    SchedulerMetrics m = temp_sched.run(workload);
                    json entry;
                    entry["algo"] = (a == SchedulerAlgo::FCFS ? "fcfs" : (a == SchedulerAlgo::ROUND_ROBIN ? "rr" : (a == SchedulerAlgo::PRIORITY ? "priority" : "mlfq")));
                    entry["metrics"] = json::parse(temp_sched.metricsToJson(m));
                    results.push_back(entry);
                }
                res["results"] = results;
            }

            // 4. MEMORY MANAGEMENT
            else if (cmd == "mem_map") {
                res["map"] = g_memory.memoryMapToString();
                MemoryStats s = g_memory.getStats();
                json sj;
                sj["used"] = s.used_frames;
                sj["free"] = s.free_frames;
                sj["faults"] = s.page_faults;
                sj["hits"] = s.page_hits;
                sj["hit_rate"] = s.hit_rate;
                res["stats"] = sj;
                res["frames"] = json::parse(g_memory.allFramesToJson());
            }
            else if (cmd == "mem_alloc") {
                int pid = req.value("pid", -1);
                int pages = req.value("pages", 1);
                if (g_memory.allocatePages(pid, pages)) {
                    res["msg"] = "Allocated " + to_string(pages) + " pages to PID " + to_string(pid);
                } else {
                    res["status"] = "error";
                    res["msg"] = "Memory allocation failed: Not enough free frames";
                }
            }
            else if (cmd == "mem_free") {
                int pid = req.value("pid", -1);
                g_memory.deallocate(pid);
                res["msg"] = "Released all memory for PID " + to_string(pid);
            }
            else if (cmd == "mem_translate") {
                int pid = req.value("pid", -1);
                int vaddr = req.value("vaddr", 0);
                int paddr = g_memory.translateAddress(pid, vaddr);
                if (paddr != -1) {
                    res["physical_addr"] = paddr;
                } else {
                    res["status"] = "error";
                    res["msg"] = "Translation failure: page not mapped";
                }
            }
            else if (cmd == "mem_access") {
                int pid = req.value("pid", -1);
                int page = req.value("page", 0);
                bool dirty = req.value("dirty", false);
                g_memory.accessPage(pid, page);
                if (dirty) g_memory.setDirty(pid, page, true);
                res["msg"] = "Accessed page " + to_string(page) + " for PID " + to_string(pid);
            }
            else if (cmd == "mem_policy") {
                string p = req.value("policy", "lru");
                if (p == "fifo") g_memory.setPolicy(PagePolicy::FIFO);
                else if (p == "lru") g_memory.setPolicy(PagePolicy::LRU);
                else if (p == "optimal") g_memory.setPolicy(PagePolicy::OPTIMAL);
                res["policy"] = p;
            }
            else if (cmd == "mem_compare") {
                vector<int> ref = req.value("ref_string", vector<int>{7,0,1,2,0,3,0,4,2,3,0,3,2});
                int f_count = req.value("frames", 3);
                res["comparison"] = json::parse(g_memory.compareReplacement(ref, f_count));
            }

            // 5. SYNCHRONIZATION DEMOS
            else if (cmd == "sync_demo") {
                string scenario = req.value("scenario", "producer_consumer");
                ScenarioResult sr;
                if (scenario == "producer_consumer") {
                    sr = g_sync.runProducerConsumer(req.value("items", 10), req.value("buffer", 5));
                } else if (scenario == "dining_philosophers") {
                    sr = g_sync.runDiningPhilosophers(req.value("num_philosophers", 5), req.value("allow_deadlock", false));
                } else if (scenario == "reader_writer") {
                    sr = g_sync.runReaderWriter(req.value("readers", 3), req.value("writers", 2));
                }
                
                json events = json::array();
                for(const auto& e : sr.events) {
                    json ej;
                    ej["tick"] = e.tick; ej["pid"] = e.pid; ej["action"] = e.action;
                    ej["resource"] = e.resource; ej["success"] = e.success;
                    events.push_back(ej);
                }
                res["events"] = events;
                res["deadlock"] = sr.deadlock_occurred;
                res["summary"] = sr.summary;
            }

            // 6. AUTOMATION / RESEARCH
            else if (cmd == "experiment_run") {
                vector<string> wtypes = {"cpu_bound", "io_bound", "mixed"};
                vector<SchedulerAlgo> salgos = {SchedulerAlgo::FCFS, SchedulerAlgo::ROUND_ROBIN, SchedulerAlgo::PRIORITY, SchedulerAlgo::MLFQ};
                json results = json::array();
                
                for(auto const& wt : wtypes) {
                    vector<PCB> wl = generateWorkload(wt);
                    for(auto a : salgos) {
                        Scheduler s_temp;
                        s_temp.setAlgorithm(a);
                        s_temp.setQuantum(g_scheduler.quantum);
                        SchedulerMetrics m = s_temp.run(wl);
                        json entry;
                        entry["workload"] = wt;
                        entry["algo"] = (a == SchedulerAlgo::FCFS ? "fcfs" : (a == SchedulerAlgo::ROUND_ROBIN ? "rr" : (a == SchedulerAlgo::PRIORITY ? "priority" : "mlfq")));
                        entry["metrics"] = json::parse(s_temp.metricsToJson(m));
                        results.push_back(entry);
                    }
                }
                res["results"] = results;
            }

            else {
                res["status"] = "error";
                res["msg"] = "Command '" + cmd + "' not recognized by engine.";
            }

            // Standard JSON output (single line, no newlines inside)
            cout << res.dump() << endl;
            cout.flush();
            
            g_tick_count++;

        } catch (const exception& e) {
            cout << json({{"status","error"},{"msg", string("Engine Exception: ") + e.what()}}).dump() << endl;
            cout.flush();
        }
    }
    return 0;
}
