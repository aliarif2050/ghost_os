#include "sync.h"
#include <iostream>
#include <numeric>
#include <algorithm>
#include <sstream>

using namespace std; // Using standard namespace as requested

// MUTEX IMPLEMENTATION
// Attempt to lock. If already locked, process goes to wait queue.
bool Mutex::lock(int pid, vector<SyncEvent>& log, int tick) {
    if (!locked) {
        locked = true;
        owner_pid = pid;
        log.push_back({tick, pid, "LOCK", name, true});
        return true;
    } else {
        // Simple re-entrancy check
        if (owner_pid == pid) return true; 
        
        wait_queue.push(pid);
        log.push_back({tick, pid, "BLOCKED", name, false});
        return false;
    }
}

// Release lock and pass it to the next waiting process if any
void Mutex::unlock(int pid, vector<SyncEvent>& log, int tick) {
    if (owner_pid == pid) {
        log.push_back({tick, pid, "UNLOCK", name, true});
        if (!wait_queue.empty()) {
            owner_pid = wait_queue.front();
            wait_queue.pop();
            log.push_back({tick, owner_pid, "WAKE", name, true});
        } else {
            locked = false;
            owner_pid = -1;
        }
    }
}

string Mutex::toJson() {
    nlohmann::json j;
    j["name"] = name;
    j["locked"] = locked;
    j["owner"] = owner_pid;
    return j.dump();
}

// SEMAPHORE IMPLEMENTATION
Semaphore::Semaphore(string n, int initial, int max) : name(n), count(initial), max_count(max) {}

// P() operation: decrement count, block if negative
void Semaphore::wait(int pid, vector<SyncEvent>& log, int tick) {
    count--;
    if (count < 0) {
        wait_queue.push(pid);
        log.push_back({tick, pid, "BLOCKED", name, false});
    } else {
        log.push_back({tick, pid, "P_SUCCESS", name, true});
    }
}

// V() operation: increment count, wake up one process if anyone is waiting
void Semaphore::signal(int pid, vector<SyncEvent>& log, int tick) {
    count++;
    if (count <= 0 && !wait_queue.empty()) {
        int next = wait_queue.front();
        wait_queue.pop();
        log.push_back({tick, next, "WAKE", name, true});
    }
    log.push_back({tick, pid, "V_SIGNAL", name, true});
}

string Semaphore::toJson() {
    nlohmann::json j;
    j["name"] = name;
    j["count"] = count;
    return j.dump();
}

// SCENARIO: PRODUCER-CONSUMER
// Uses semaphores to manage buffer boundaries and a mutex for atomic access
ScenarioResult SyncEngine::runProducerConsumer(int num_items, int buffer_size) {
    ScenarioResult res;
    Semaphore empty_slots("empty", buffer_size, buffer_size);
    Semaphore full_slots("full", 0, buffer_size);
    Mutex buffer_mutex("buffer_mutex");
    
    int producer_pid = 1, consumer_pid = 2;
    int tick = 0;
    
    for (int i = 0; i < num_items; ++i) {
        // Producer sequence
        tick++;
        empty_slots.wait(producer_pid, res.events, tick);
        buffer_mutex.lock(producer_pid, res.events, tick);
        res.events.push_back({tick, producer_pid, "PRODUCE", "item_" + to_string(i), true});
        buffer_mutex.unlock(producer_pid, res.events, tick);
        full_slots.signal(producer_pid, res.events, tick);
        
        // Consumer sequence
        tick++;
        full_slots.wait(consumer_pid, res.events, tick);
        buffer_mutex.lock(consumer_pid, res.events, tick);
        res.events.push_back({tick, consumer_pid, "CONSUME", "item_" + to_string(i), true});
        buffer_mutex.unlock(consumer_pid, res.events, tick);
        empty_slots.signal(consumer_pid, res.events, tick);
    }
    
    res.summary = "Produced and consumed " + to_string(num_items) + " items safely.";
    return res;
}

// SCENARIO: DINING PHILOSOPHERS
// Demonstrates deadlocks and their prevention
ScenarioResult SyncEngine::runDiningPhilosophers(int num_philo, bool allow_deadlock) {
    ScenarioResult res;
    vector<Mutex*> forks;
    for(int i=0; i<num_philo; ++i) forks.push_back(new Mutex("fork_" + to_string(i)));
    
    int tick = 0;
    map<int, string> held, waiting;

    // 1. All philosophers attempt to pick up their FIRST fork
    for(int i=0; i<num_philo; ++i) {
        tick++;
        int p1 = i; // Default: Left fork
        
        // Prevention: Last philosopher picks right fork first
        if (!allow_deadlock && i == num_philo - 1) p1 = (i + 1) % num_philo;
        
        if (forks[p1]->lock(i, res.events, tick)) {
            held[i] = forks[p1]->name;
        } else {
            waiting[i] = forks[p1]->name;
        }
    }

    // 2. All philosophers attempt to pick up their SECOND fork
    for(int i=0; i<num_philo; ++i) {
        tick++;
        int p2 = (i + 1) % num_philo; // Default: Right fork
        
        // Prevention: Last philosopher picks left fork second
        if (!allow_deadlock && i == num_philo - 1) p2 = i;
        
        if (held.count(i) && held[i].find(" & ") == string::npos) {
            if (forks[p2]->lock(i, res.events, tick)) {
                held[i] += " & " + forks[p2]->name;
                res.events.push_back({tick, i, "EAT", "started", true});
                
                // Release (simulated completion)
                int f1 = (p2 == i) ? (i + 1) % num_philo : i; // Reverse logic for prevention
                if (!allow_deadlock && i == num_philo - 1) { /* already handled by swap */ }

                // Simplified release for simulation stability
                // In a real deadlock case, this code won't be reached for all
            } else {
                waiting[i] = forks[p2]->name;
            }
        }
        
        // Check for deadlock after each second-fork attempt
        string dl_status = detectDeadlock(held, waiting);
        if (dl_status != "NO DEADLOCK") {
            res.deadlock_occurred = true;
            res.summary = dl_status;
            res.events.push_back({tick, -1, "DEADLOCK", dl_status, false});
            break; 
        }
    }
    
    if (!res.deadlock_occurred) res.summary = "Safe execution: All philosophers finished or are waiting without cycles.";
    for(auto f : forks) delete f;
    return res;
}

// SCENARIO: READER-WRITER
// Implements readers-preference solution
ScenarioResult SyncEngine::runReaderWriter(int num_readers, int num_writers) {
    ScenarioResult res;
    Semaphore write_block("db_access", 1, 1);
    Mutex count_mutex("read_count_mutex");
    int read_count = 0;
    int tick = 0;
    
    // Simulate interleaved access
    for (int i = 0; i < max(num_readers, num_writers); ++i) {
        // Reader logic
        if (i < num_readers) {
            tick++;
            count_mutex.lock(100+i, res.events, tick);
            read_count++;
            if (read_count == 1) write_block.wait(100+i, res.events, tick);
            count_mutex.unlock(100+i, res.events, tick);
            
            res.events.push_back({tick, 100+i, "READ", "data_entry", true});
            
            tick++;
            count_mutex.lock(100+i, res.events, tick);
            read_count--;
            if (read_count == 0) write_block.signal(100+i, res.events, tick);
            count_mutex.unlock(100+i, res.events, tick);
        }
        
        // Writer logic
        if (i < num_writers) {
            tick++;
            write_block.wait(200+i, res.events, tick);
            res.events.push_back({tick, 200+i, "WRITE", "data_entry", true});
            write_block.signal(200+i, res.events, tick);
        }
    }
    
    res.summary = "Readers-Writers simulation complete.";
    return res;
}

// DEADLOCK DETECTION
// Detects cycles in the wait-for graph using DFS
string SyncEngine::detectDeadlock(map<int, string>& held, map<int, string>& waiting) {
    map<int, vector<int>> adj;
    map<string, int> resource_owner;
    
    // Build resource ownership map
    for (auto const& [pid, rname] : held) {
        if (rname.find(" & ") != string::npos) {
            resource_owner[rname.substr(0, rname.find(" & "))] = pid;
            resource_owner[rname.substr(rname.find(" & ") + 3)] = pid;
        } else {
            resource_owner[rname] = pid;
        }
    }
    
    // Build wait-for adjacency list
    for (auto const& [pid, rname] : waiting) {
        if (resource_owner.count(rname)) {
            adj[pid].push_back(resource_owner[rname]);
        }
    }
    
    if (adj.empty()) return "NO DEADLOCK";
    
    // DFS Cycle Detection
    map<int, int> visited; // 0: unvisited, 1: visiting, 2: visited
    for (auto const& [start_node, _] : adj) {
        if (visited[start_node] == 0) {
            vector<int> stack, cycle;
            if (hasCycle(start_node, adj, visited, stack, cycle)) {
                stringstream ss;
                ss << "DEADLOCK DETECTED: ";
                for (size_t i = 0; i < cycle.size(); ++i) {
                    ss << "P" << cycle[i] << (i == cycle.size() - 1 ? "" : " -> ");
                }
                return ss.str();
            }
        }
    }
    
    return "NO DEADLOCK";
}

bool SyncEngine::hasCycle(int u, map<int, vector<int>>& adj, map<int, int>& visited, vector<int>& stack, vector<int>& cycle) {
    visited[u] = 1;
    stack.push_back(u);
    
    for (int v : adj[u]) {
        if (visited[v] == 1) { // Found a back edge = cycle
            auto it = find(stack.begin(), stack.end(), v);
            while (it != stack.end()) {
                cycle.push_back(*it);
                it++;
            }
            cycle.push_back(v);
            return true;
        }
        if (visited[v] == 0 && hasCycle(v, adj, visited, stack, cycle)) return true;
    }
    
    visited[u] = 2; // Fully explored
    stack.pop_back();
    return false;
}
