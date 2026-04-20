#ifndef SYNC_H
#define SYNC_H

#include <string>
#include <vector>
#include <queue>
#include <map>
#include "json.hpp"

// Using standard namespace throughout for simplicity
using namespace std;

// Logs an event in the synchronization simulation
struct SyncEvent {
    int tick;         // System tick when the event happened
    int pid;          // Process ID involved
    string action;    // e.g., "LOCK", "UNLOCK", "P", "V", "BLOCKED", "DEADLOCK"
    string resource;  // Name of the mutex/semaphore
    bool success;     // Whether the request was granted immediately
};

// Represents a mutual exclusion lock
class Mutex {
public:
    string name;
    int owner_pid = -1;       // -1 if currently unlocked
    bool locked = false;
    queue<int> wait_queue;    // Processes waiting for this mutex

    Mutex(string n) : name(n) {}

    // Attempt to acquire the lock
    bool lock(int pid, vector<SyncEvent>& log, int tick);
    
    // Release the lock and wake up next waiting process
    void unlock(int pid, vector<SyncEvent>& log, int tick);

    // Convert state to JSON for frontend
    string toJson();
};

// Represents a counting semaphore
class Semaphore {
public:
    string name;
    int count;               // Current value of semaphore
    int max_count;
    queue<int> wait_queue;   // Processes blocked on this semaphore

    Semaphore(string n, int initial, int max);

    // P() operation (wait)
    void wait(int pid, vector<SyncEvent>& log, int tick);
    
    // V() operation (signal)
    void signal(int pid, vector<SyncEvent>& log, int tick);

    // Convert state to JSON
    string toJson();
};

// Simulation results and status
struct ScenarioResult {
    vector<SyncEvent> events;
    bool deadlock_occurred = false;
    string summary;
};

// Engine to run classical synchronization problems
class SyncEngine {
public:
    // Scenarios
    ScenarioResult runProducerConsumer(int num_items, int buffer_size);
    ScenarioResult runDiningPhilosophers(int num_philosophers, bool allow_deadlock);
    ScenarioResult runReaderWriter(int num_readers, int num_writers);

    // Deadlock utility
    string detectDeadlock(map<int, string>& held, map<int, string>& waiting);

private:
    // Helper for DFS cycle detection
    bool hasCycle(int start, map<int, vector<int>>& adj, vector<int>& visited, vector<int>& stack, vector<int>& cycle_path);
};

#endif // SYNC_H
