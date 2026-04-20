#ifndef WORKLOAD_H
#define WORKLOAD_H

#include <vector>
#include <string>
#include "pcb.h"

using namespace std; // Using standard namespace as requested

struct WorkloadParams {
    int count;
    int min_burst;
    int max_burst;
    int min_pri;
    int max_pri;
    int min_arr;
    int max_arr;
};

// Generates a list of processes based on workload type
vector<PCB> generateWorkload(const string& type, int seed = 42);

// Generates a parameterized custom workload
vector<PCB> generateCustomWorkload(const WorkloadParams& params, int seed = 42);

// Converts a list of processes to a JSON string
string workloadToJson(const vector<PCB>& procs);

#endif // WORKLOAD_H
