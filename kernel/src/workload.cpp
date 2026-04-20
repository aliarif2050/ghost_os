#include "workload.h"
#include <random>
#include <algorithm>

using namespace std; // Using standard namespace as requested

// Generate a set of processes biased towards specific behavior
vector<PCB> generateWorkload(const string& type, int seed) {
    mt19937 gen(seed); // Standard mersenne_twister_engine seeded for reproducibility
    vector<PCB> procs;
    
    // Distribution parameters as specified in the PRD (TASK-105)
    uniform_int_distribution<> d_burst, d_pri, d_arr;
    int count = 10;
    
    if (type == "cpu_bound") {
        d_burst = uniform_int_distribution<>(15, 30); // Long tasks
        d_pri = uniform_int_distribution<>(1, 3);    // Lower priority
        d_arr = uniform_int_distribution<>(0, 5);     // All arrive early
    } else if (type == "io_bound") {
        d_burst = uniform_int_distribution<>(2, 6);   // Short tasks
        d_pri = uniform_int_distribution<>(4, 7);    // Higher priority
        d_arr = uniform_int_distribution<>(0, 20);    // Spread out arrival
    } else { // mixed
        d_burst = uniform_int_distribution<>(3, 25);  // Varied
        d_pri = uniform_int_distribution<>(1, 10);   // Full range
        d_arr = uniform_int_distribution<>(0, 15);    // Varied
    }
    
    for (int i = 1; i <= count; ++i) {
        PCB p;
        p.pid = i;
        p.name = "p_" + to_string(i);
        p.state = ProcessState::NEW;
        p.burst_time = d_burst(gen);
        p.remaining_time = p.burst_time;
        p.priority = d_pri(gen);
        p.arrival_time = d_arr(gen);
        p.waiting_time = 0;
        p.turnaround_time = 0;
        p.program_counter = 0;
        procs.push_back(p);
    }
    
    return procs;
}

vector<PCB> generateCustomWorkload(const WorkloadParams& params, int seed) {
    mt19937 gen(seed);
    vector<PCB> procs;
    
    uniform_int_distribution<> d_burst(params.min_burst, params.max_burst);
    uniform_int_distribution<> d_pri(params.min_pri, params.max_pri);
    uniform_int_distribution<> d_arr(params.min_arr, params.max_arr);
    
    for (int i = 1; i <= params.count; ++i) {
        PCB p;
        p.pid = i;
        p.name = "p_" + to_string(i);
        p.state = ProcessState::NEW;
        p.burst_time = d_burst(gen);
        p.remaining_time = p.burst_time;
        p.priority = d_pri(gen);
        p.arrival_time = d_arr(gen);
        p.waiting_time = 0;
        p.turnaround_time = 0;
        p.program_counter = 0;
        procs.push_back(p);
    }
    
    return procs;
}

// Convert the generated workload to JSON for the bridge
string workloadToJson(const vector<PCB>& procs) {
    return pcbListToJson(procs);
}
