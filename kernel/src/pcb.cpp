#include "pcb.h"

using namespace std; // Use standard namespace

// Helper to convert process state enum to string labels
string stateToString(ProcessState s) {
    switch (s) {
        case ProcessState::NEW:        return "NEW";
        case ProcessState::READY:      return "READY";
        case ProcessState::RUNNING:    return "RUNNING";
        case ProcessState::WAITING:    return "WAITING";
        case ProcessState::TERMINATED: return "TERMINATED";
        default:                       return "UNKNOWN";
    }
}

// Convert a single PCB object to a JSON string
string pcbToJson(const PCB& p) {
    nlohmann::json j;
    j["pid"] = p.pid;
    j["name"] = p.name;
    j["state"] = stateToString(p.state);
    j["priority"] = p.priority;
    j["burst_time"] = p.burst_time;
    j["remaining_time"] = p.remaining_time;
    j["arrival_time"] = p.arrival_time;
    j["waiting_time"] = p.waiting_time;
    j["turnaround_time"] = p.turnaround_time;
    j["response_time"] = p.response_time;
    j["program_counter"] = p.program_counter;
    
    // Dump to string without indentation for the bridge protocol
    return j.dump();
}

// Convert a list of PCB objects to a JSON array string
string pcbListToJson(const vector<PCB>& list) {
    nlohmann::json json_array = nlohmann::json::array();
    
    for (const auto& p : list) {
        nlohmann::json j;
        j["pid"] = p.pid;
        j["name"] = p.name;
        j["state"] = stateToString(p.state);
        j["priority"] = p.priority;
        j["burst_time"] = p.burst_time;
        j["remaining_time"] = p.remaining_time;
        j["arrival_time"] = p.arrival_time;
        j["waiting_time"] = p.waiting_time;
        j["turnaround_time"] = p.turnaround_time;
        j["response_time"] = p.response_time;
        j["program_counter"] = p.program_counter;
        json_array.push_back(j);
    }
    
    return json_array.dump();
}

// Convert a single TCB object to a JSON string
string tcbToJson(const TCB& t) {
    nlohmann::json j;
    j["tid"] = t.tid;
    j["parent_pid"] = t.parent_pid;
    j["stack_ptr"] = t.stack_ptr;
    j["state"] = stateToString(t.state);
    
    return j.dump();
}
