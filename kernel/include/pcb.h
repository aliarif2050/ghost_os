#ifndef PCB_H
#define PCB_H

#include <string>
#include <vector>
#include "json.hpp"

enum class ProcessState { NEW, READY, RUNNING, WAITING, TERMINATED };

std::string stateToString(ProcessState s);

struct PCB {
    int pid;
    std::string name;
    ProcessState state;
    int priority; // 1-10
    int burst_time;
    int remaining_time;
    int arrival_time;
    int waiting_time;
    int turnaround_time;
    int response_time = -1;
    int program_counter;
};

struct TCB {
    int tid;
    int parent_pid;
    int stack_ptr;
    ProcessState state;
};

std::string pcbToJson(const PCB& p);
std::string pcbListToJson(const std::vector<PCB>& list);
std::string tcbToJson(const TCB& t);

#endif // PCB_H
