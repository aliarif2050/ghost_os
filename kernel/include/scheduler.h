#ifndef SCHEDULER_H
#define SCHEDULER_H

#include <vector>
#include <string>
#include <map>
#include <queue>
#include "pcb.h"

enum class SchedulerAlgo { FCFS, ROUND_ROBIN, PRIORITY, MLFQ };

struct GanttEntry {
    int pid;
    int start_time;
    int end_time;
};

struct SchedulerMetrics {
    double avg_waiting_time;
    double avg_turnaround_time;
    double avg_response_time;
    double cpu_utilization;
    double throughput;
    std::vector<GanttEntry> gantt;
};

class Scheduler {
public:
    SchedulerAlgo current_algo = SchedulerAlgo::FCFS;
    int quantum = 4;

    void setAlgorithm(SchedulerAlgo algo);
    void setQuantum(int q);
    SchedulerMetrics run(std::vector<PCB> processes);
    std::string metricsToJson(const SchedulerMetrics& m);
    std::string ganttToAscii(const SchedulerMetrics& m, const std::vector<PCB>& procs);

private:
    SchedulerMetrics runFCFS(std::vector<PCB> procs);
    SchedulerMetrics runRR(std::vector<PCB> procs);
    SchedulerMetrics runPriority(std::vector<PCB> procs);
    SchedulerMetrics runMLFQ(std::vector<PCB> procs);
};

#endif // SCHEDULER_H
