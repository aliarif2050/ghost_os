#include "scheduler.h"
#include <algorithm>
#include <iostream>
#include <iomanip>
#include <sstream>
#include <numeric>

using namespace std; // Using standard namespace as requested

// Set the current scheduling algorithm
void Scheduler::setAlgorithm(SchedulerAlgo algo) {
    current_algo = algo;
}

// Set the time slice (quantum) for Round Robin
void Scheduler::setQuantum(int q) {
    quantum = q;
}

// Main method to run the selected algorithm
SchedulerMetrics Scheduler::run(vector<PCB> processes) {
    if (current_algo == SchedulerAlgo::FCFS) return runFCFS(processes);
    if (current_algo == SchedulerAlgo::ROUND_ROBIN) return runRR(processes);
    if (current_algo == SchedulerAlgo::PRIORITY) return runPriority(processes);
    if (current_algo == SchedulerAlgo::MLFQ) return runMLFQ(processes);
    return runFCFS(processes); // Fallback
}

// Convert metrics to a JSON string for frontend communication
string Scheduler::metricsToJson(const SchedulerMetrics& m) {
    nlohmann::json j;
    j["avg_waiting_time"] = m.avg_waiting_time;
    j["avg_turnaround_time"] = m.avg_turnaround_time;
    j["avg_response_time"] = m.avg_response_time;
    j["cpu_utilization"] = m.cpu_utilization;
    j["throughput"] = m.throughput;
    
    nlohmann::json gantt_array = nlohmann::json::array();
    for (const auto& entry : m.gantt) {
        nlohmann::json e;
        e["pid"] = entry.pid;
        e["start"] = entry.start_time;
        e["end"] = entry.end_time;
        gantt_array.push_back(e);
    }
    j["gantt"] = gantt_array;
    return j.dump(); // Single line dump
}

// Create an ASCII art Gantt chart for terminal display
string Scheduler::ganttToAscii(const SchedulerMetrics& m, const vector<PCB>& procs) {
    if (m.gantt.empty()) return "No processes to schedule\n";

    stringstream ss;
    string algo_name;
    
    switch (current_algo) {
        case SchedulerAlgo::FCFS:        algo_name = "FCFS"; break;
        case SchedulerAlgo::ROUND_ROBIN: algo_name = "ROUND_ROBIN"; break;
        case SchedulerAlgo::PRIORITY:    algo_name = "PRIORITY"; break;
        case SchedulerAlgo::MLFQ:        algo_name = "MLFQ"; break;
    }
    
    ss << "GANTT [" << algo_name << " q=" << quantum << "]" << endl;
    
    int total_time = m.gantt.back().end_time;
    
    // Print the timeline header
    ss << "Time:  ";
    for (int t = 0; t <= total_time; t += 4) {
        ss << left << setw(5) << t;
    }
    ss << endl << "       ";
    for (int t = 0; t <= total_time; t += 4) {
        ss << "|    ";
    }
    ss << endl;
    
    // Render bars for each process
    for (const auto& p : procs) {
        ss << "P" << left << setw(3) << p.pid << " :  ";
        for (int t = 0; t < total_time; ++t) {
            bool is_running = false;
            for (const auto& event : m.gantt) {
                if (event.pid == p.pid && t >= event.start_time && t < event.end_time) {
                    is_running = true;
                    break;
                }
            }
            ss << (is_running ? "=" : " ");
        }
        ss << endl;
    }
    
    // Print performance summary
    ss << "---" << endl;
    ss << fixed << setprecision(2);
    ss << "AvgWait: " << m.avg_waiting_time << "  AvgTAT: " << m.avg_turnaround_time 
       << "  CPU: " << m.cpu_utilization << "%  Throughput: " << m.throughput << " proc/tick" << endl;
    
    return ss.str();
}

// FIRST-COME FIRST-SERVED (FCFS)
SchedulerMetrics Scheduler::runFCFS(vector<PCB> procs) {
    if (procs.empty()) return {0,0,0,0,0,{}};
    
    // Sort by arrival time (standard FCFS)
    sort(procs.begin(), procs.end(), [](const PCB& a, const PCB& b) {
        if (a.arrival_time != b.arrival_time) return a.arrival_time < b.arrival_time;
        return a.pid < b.pid; // Tie-break with PID
    });
    
    SchedulerMetrics m;
    int current_time = 0;
    double total_wait = 0, total_tat = 0, total_resp = 0;
    int worked_ticks = 0;
    
    for (auto& p : procs) {
        // CPU remains idle until the next process arrives
        if (current_time < p.arrival_time) current_time = p.arrival_time;
        
        // Calculate delays
        int start = current_time;
        p.response_time = start - p.arrival_time;
        p.waiting_time = start - p.arrival_time;
        
        // Record execution segment
        m.gantt.push_back({p.pid, start, start + p.burst_time});
        
        // Move clock forward
        current_time += p.burst_time;
        worked_ticks += p.burst_time;
        p.turnaround_time = current_time - p.arrival_time;
        
        // Accummulate for averages
        total_wait += p.waiting_time;
        total_tat += p.turnaround_time;
        total_resp += p.response_time;
    }
    
    // Finalize metrics
    int n = procs.size();
    m.avg_waiting_time = total_wait / n;
    m.avg_turnaround_time = total_tat / n;
    m.avg_response_time = total_resp / n;
    m.cpu_utilization = current_time > 0 ? ((double)worked_ticks / current_time) * 100.0 : 0;
    m.throughput = current_time > 0 ? (double)n / current_time : 0;
    
    return m;
}

// ROUND ROBIN (RR)
SchedulerMetrics Scheduler::runRR(vector<PCB> procs) {
    if (procs.empty()) return {0,0,0,0,0,{}};
    
    int n = procs.size();
    vector<int> rem_burst(n);
    vector<int> first_start(n, -1);
    vector<int> final_end(n, 0);
    
    for(int i=0; i<n; ++i) rem_burst[i] = procs[i].burst_time;
    
    queue<int> ready_q;
    vector<bool> was_queued(n, false);
    
    int current_time = 0, completed = 0, worked_ticks = 0;
    SchedulerMetrics m;
    
    // Helper to add arrived processes to ready queue
    auto check_arrivals = [&]() {
        for(int i=0; i<n; ++i) {
            if (!was_queued[i] && procs[i].arrival_time <= current_time && rem_burst[i] > 0) {
                ready_q.push(i);
                was_queued[i] = true;
            }
        }
    };
    
    check_arrivals();
    
    while (completed < n) {
        if (ready_q.empty()) {
            current_time++; // CPU Idle
            check_arrivals();
            continue;
        }
        
        int i = ready_q.front();
        ready_q.pop();
        
        // Record response time
        if (first_start[i] == -1) first_start[i] = current_time;
        
        // Run for quantum or until finished
        int slice = min(rem_burst[i], quantum);
        m.gantt.push_back({procs[i].pid, current_time, current_time + slice});
        
        // Simulate tick-by-tick to allow mid-quantum arrivals
        for (int t = 0; t < slice; ++t) {
            current_time++;
            check_arrivals();
        }
        
        rem_burst[i] -= slice;
        worked_ticks += slice;
        
        if (rem_burst[i] > 0) {
            ready_q.push(i); // Back to queue
        } else {
            completed++;
            final_end[i] = current_time;
        }
    }
    
    // Post-simulation data gathering
    double tw=0, tt=0, tr=0;
    for(int i=0; i<n; ++i) {
        int turnaround = final_end[i] - procs[i].arrival_time;
        tt += turnaround;
        tw += (turnaround - procs[i].burst_time);
        tr += (first_start[i] - procs[i].arrival_time);
    }
    
    m.avg_waiting_time = tw/n; m.avg_turnaround_time = tt/n; m.avg_response_time = tr/n;
    m.cpu_utilization = current_time > 0 ? ((double)worked_ticks / current_time) * 100.0 : 0;
    m.throughput = current_time > 0 ? (double)n / current_time : 0;
    
    return m;
}

// PREEMPTIVE PRIORITY
SchedulerMetrics Scheduler::runPriority(vector<PCB> procs) {
    if (procs.empty()) return {0,0,0,0,0,{}};
    
    int n = procs.size();
    vector<int> rem_burst(n);
    vector<int> first_start(n, -1);
    vector<bool> is_done(n, false);
    for(int i=0; i<n; ++i) rem_burst[i] = procs[i].burst_time;
    
    int current_time = 0, completed = 0, worked_ticks = 0;
    SchedulerMetrics m;
    
    while (completed < n) {
        int best = -1;
        int max_p = -1;
        
        // Find highest priority process currently available
        for (int i = 0; i < n; ++i) {
            if (!is_done[i] && procs[i].arrival_time <= current_time) {
                if (procs[i].priority > max_p) {
                    max_p = procs[i].priority;
                    best = i;
                } else if (procs[i].priority == max_p) { // FCFS tie-break
                    if (best == -1 || procs[i].arrival_time < procs[best].arrival_time) best = i;
                }
            }
        }
        
        if (best == -1) {
            current_time++; // Nothing arrived yet
            continue;
        }
        
        if (first_start[best] == -1) first_start[best] = current_time;
        
        // Add to Gantt chart (merge segments of the same process)
        if (!m.gantt.empty() && m.gantt.back().pid == procs[best].pid && m.gantt.back().end_time == current_time) {
            m.gantt.back().end_time++;
        } else {
            m.gantt.push_back({procs[best].pid, current_time, current_time + 1});
        }
        
        rem_burst[best]--;
        current_time++;
        worked_ticks++;
        
        if (rem_burst[best] == 0) {
            is_done[best] = true;
            completed++;
            procs[best].turnaround_time = current_time - procs[best].arrival_time;
            procs[best].waiting_time = procs[best].turnaround_time - procs[best].burst_time;
            procs[best].response_time = first_start[best] - procs[best].arrival_time;
        }
    }
    
    double tw=0, tt=0, tr=0;
    for(const auto& p : procs) { tw+=p.waiting_time; tt+=p.turnaround_time; tr+=p.response_time; }
    m.avg_waiting_time = tw/n; m.avg_turnaround_time = tt/n; m.avg_response_time = tr/n;
    m.cpu_utilization = ((double)worked_ticks/current_time)*100.0;
    m.throughput = (double)n/current_time;
    
    return m;
}

// MULTI-LEVEL FEEDBACK QUEUE (MLFQ)
SchedulerMetrics Scheduler::runMLFQ(vector<PCB> procs) {
    if (procs.empty()) return {0,0,0,0,0,{}};
    
    int n = procs.size();
    vector<int> rem_burst(n);
    vector<int> first_start(n, -1);
    vector<int> curr_q_level(n, 0); // Tracker for which level process is in
    vector<bool> is_done(n, false), in_sys(n, false);
    for(int i=0; i<n; ++i) rem_burst[i] = procs[i].burst_time;
    
    queue<int> q0, q1, q2; // 3 priority levels
    int current_time = 0, completed = 0, worked_ticks = 0, last_boost = 0;
    SchedulerMetrics m;
    
    // Add new arrivals to high priority queue
    auto update_arrivals = [&]() {
        for(int i=0; i<n; ++i) {
            if (!is_done[i] && !in_sys[i] && procs[i].arrival_time <= current_time) {
                q0.push(i);
                in_sys[i] = true;
                curr_q_level[i] = 0;
            }
        }
    };
    
    // Periodic priority boost to prevent starvation
    auto priority_boost = [&]() {
        while(!q1.empty()) { int i = q1.front(); q1.pop(); q0.push(i); curr_q_level[i]=0; }
        while(!q2.empty()) { int i = q2.front(); q2.pop(); q0.push(i); curr_q_level[i]=0; }
        last_boost = current_time;
    };
    
    while (completed < n) {
        update_arrivals();
        if (current_time - last_boost >= 50) priority_boost();
        
        int idx = -1, limit = 0;
        
        // Pick top queue
        if (!q0.empty()) { idx = q0.front(); q0.pop(); limit = 4; }
        else if (!q1.empty()) { idx = q1.front(); q1.pop(); limit = 8; }
        else if (!q2.empty()) { idx = q2.front(); q2.pop(); limit = 1e9; }
        
        if (idx == -1) {
            current_time++;
            continue;
        }
        
        if (first_start[idx] == -1) first_start[idx] = current_time;
        
        int run_count = 0;
        while (run_count < limit && rem_burst[idx] > 0) {
            // Segment merging
            if (!m.gantt.empty() && m.gantt.back().pid == procs[idx].pid && m.gantt.back().end_time == current_time) {
                m.gantt.back().end_time++;
            } else {
                m.gantt.push_back({procs[idx].pid, current_time, current_time + 1});
            }
            
            current_time++;
            worked_ticks++;
            run_count++;
            rem_burst[idx]--;
            
            update_arrivals();
            
            // Check preemption/boost
            if (current_time - last_boost >= 50) { 
                if (rem_burst[idx] > 0) { q0.push(idx); curr_q_level[idx] = 0; }
                priority_boost();
                goto switch_process; 
            }
            
            // Preemption by higher priority (newer queue) arrival
            if (curr_q_level[idx] > 0 && !q0.empty()) {
                if (curr_q_level[idx] == 1) q1.push(idx); else q2.push(idx);
                goto switch_process;
            }
            if (curr_q_level[idx] == 2 && !q1.empty()) {
                q2.push(idx);
                goto switch_process;
            }
        }
        
        if (rem_burst[idx] == 0) {
            is_done[idx] = true;
            completed++;
            procs[idx].turnaround_time = current_time - procs[idx].arrival_time;
            procs[idx].waiting_time = procs[idx].turnaround_time - procs[idx].burst_time;
            procs[idx].response_time = first_start[idx] - procs[idx].arrival_time;
        } else {
            // Demote due to quantum exhaustion
            if (curr_q_level[idx] == 0) { q1.push(idx); curr_q_level[idx] = 1; }
            else { q2.push(idx); curr_q_level[idx] = 2; }
        }
        
        switch_process:;
    }
    
    // Average calculations
    double tw=0, tt=0, tr=0;
    for(int i=0; i<n; ++i) { tw+=procs[i].waiting_time; tt+=procs[i].turnaround_time; tr+=(first_start[i]-procs[i].arrival_time); }
    m.avg_waiting_time = tw/n; m.avg_turnaround_time = tt/n; m.avg_response_time = tr/n;
    m.cpu_utilization = ((double)worked_ticks/current_time)*100.0;
    m.throughput = (double)n/current_time;
    
    return m;
}
