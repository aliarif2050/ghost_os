#ifndef SCHEDULER_H
#define SCHEDULER_H

#include <vector>
#include <string>
#include <map>
#include <queue>
#include "pcb.h"

// Using standard namespace throughout the code for simplicity
using namespace std;

// Available CPU scheduling algorithms
enum class SchedulerAlgo { FCFS, ROUND_ROBIN, PRIORITY, MLFQ };

// Represents one entry in the Gantt chart (which process ran when)
struct GanttEntry {
    int pid;        // Process ID
    int start_time; // Start tick
    int end_time;   // End tick
};

// Summary metrics of the scheduler performance
struct SchedulerMetrics {
    double avg_waiting_time;
    double avg_turnaround_time;
    double avg_response_time;
    double cpu_utilization;
    double throughput;
    vector<GanttEntry> gantt; // The timeline of execution
};

// The main Scheduler class that handles process scheduling
class Scheduler {
public:
    SchedulerAlgo current_algo = SchedulerAlgo::FCFS; // Default algo
    int quantum = 4;                                 // Default time slice for RR

    // Settings
    void setAlgorithm(SchedulerAlgo algo);
    void setQuantum(int q);

    // Main execution entry point
    SchedulerMetrics run(vector<PCB> processes);

    // Serialization and visualization
    string metricsToJson(const SchedulerMetrics& m);
    string ganttToAscii(const SchedulerMetrics& m, const vector<PCB>& procs);

private:
    // Implementation of specific algorithms
    SchedulerMetrics runFCFS(vector<PCB> procs);     // First-Come First-Served
    SchedulerMetrics runRR(vector<PCB> procs);       // Round Robin
    SchedulerMetrics runPriority(vector<PCB> procs); // Preemptive Priority
    SchedulerMetrics runMLFQ(vector<PCB> procs);     // Multi-Level Feedback Queue
};

#endif // SCHEDULER_H
