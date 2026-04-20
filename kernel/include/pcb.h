#ifndef PCB_H
#define PCB_H

#include <string>
#include <vector>
#include "json.hpp"

// Use standard namespace for easier coding as requested
using namespace std;

// Enum to represent the lifecycle of a process
enum class ProcessState { 
    NEW,        // Just created
    READY,      // Waiting in ready queue
    RUNNING,    // Currently executing on CPU
    WAITING,    // Blocked/Waiting for I/O or event
    TERMINATED  // Finished execution
};

// Converts the enum state to a readable string
string stateToString(ProcessState s);

// Process Control Block - stores all info about a process
struct PCB {
    int pid;                // Process ID
    string name;            // Process Name
    ProcessState state;     // Current State
    int priority;           // Priority (1-10, higher is better)
    int burst_time;         // Total CPU time needed
    int remaining_time;     // Time left to finish
    int arrival_time;       // Time when process entered system
    int waiting_time;       // Time spent in ready queue
    int turnaround_time;    // Total time from arrival to completion
    int response_time = -1; // Time from arrival to first execution
    int program_counter;    // Current instruction pointer
};

// Thread Control Block - stores info about a thread
struct TCB {
    int tid;                // Thread ID
    int parent_pid;         // PID of the owner process
    int stack_ptr;          // Pointer to thread stack
    ProcessState state;     // Current State
};

// Serialization helpers to convert objects to JSON strings
string pcbToJson(const PCB& p);
string pcbListToJson(const vector<PCB>& list);
string tcbToJson(const TCB& t);

#endif // PCB_H
