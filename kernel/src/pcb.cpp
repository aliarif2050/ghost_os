#include "pcb.h"

std::string stateToString(ProcessState s) {
    switch (s) {
        case ProcessState::NEW: return "NEW";
        case ProcessState::READY: return "READY";
        case ProcessState::RUNNING: return "RUNNING";
        case ProcessState::WAITING: return "WAITING";
        case ProcessState::TERMINATED: return "TERMINATED";
        default: return "UNKNOWN";
    }
}

std::string pcbToJson(const PCB& p) {
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
    return j.dump();
}

std::string pcbListToJson(const std::vector<PCB>& list) {
    nlohmann::json j_list = nlohmann::json::array();
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
        j_list.push_back(j);
    }
    return j_list.dump();
}

std::string tcbToJson(const TCB& t) {
    nlohmann::json j;
    j["tid"] = t.tid;
    j["parent_pid"] = t.parent_pid;
    j["stack_ptr"] = t.stack_ptr;
    j["state"] = stateToString(t.state);
    return j.dump();
}
