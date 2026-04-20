#include "memory.h"
#include <iostream>
#include <iomanip>
#include <sstream>
#include <algorithm>
#include <map>

using namespace std; // Using standard namespace as requested

// Initialize memory with 32 free frames
MemoryManager::MemoryManager() {
    for (int i = 0; i < TOTAL_FRAMES; ++i) {
        PageFrame frame;
        frame.frame_id = i;
        frames.push_back(frame);
    }
}

// Set page replacement policy
void MemoryManager::setPolicy(PagePolicy p) {
    policy = p;
}

// Allocate contiguous or non-contiguous frames to a process
bool MemoryManager::allocatePages(int pid, int num_pages) {
    int free_count = 0;
    for (const auto& f : frames) if (f.pid == -1) free_count++;

    // NEW: Greedy Allocation. Instead of rejecting, we evict if necessary.
    if (num_pages > TOTAL_FRAMES) return false;

    // While we don't have enough free frames, evict victims
    while (free_count < num_pages) {
        int victim_idx = -1;
        if (policy == PagePolicy::FIFO) victim_idx = fifoReplace();
        else victim_idx = lruReplace(); // Default to LRU for greedy alloc
        
        if (victim_idx != -1) {
            // Free the victim frame
            frames[victim_idx].pid = -1;
            frames[victim_idx].page_num = -1;
            frames[victim_idx].valid = false;
            frames[victim_idx].dirty = false;
            frames[victim_idx].referenced = false;
            free_count++;
            total_faults++; // Counts as a fault because we're forcing a replacement
        } else break;
    }
    
    vector<int> allocated_indices;
    int remaining = num_pages;
    
    // Assign frames to the process
    for (int i = 0; i < TOTAL_FRAMES && remaining > 0; ++i) {
        if (frames[i].pid == -1) {
            frames[i].pid = pid;
            frames[i].page_num = num_pages - remaining;
            frames[i].valid = true;
            frames[i].dirty = false;
            frames[i].referenced = false;
            frames[i].load_time = current_tick;
            frames[i].last_used = current_tick;
            allocated_indices.push_back(i);
            remaining--;
        }
    }
    
    // Store in page table
    page_tables[pid] = allocated_indices;
    return true;
}

// Release all frames held by a process
void MemoryManager::deallocate(int pid) {
    if (page_tables.count(pid)) {
        for (int frame_idx : page_tables[pid]) {
            frames[frame_idx].pid = -1;
            frames[frame_idx].page_num = -1;
            frames[frame_idx].valid = false;
            frames[frame_idx].dirty = false;
            frames[frame_idx].referenced = false;
        }
        page_tables.erase(pid);
    }
}

// Translate a virtual address into a physical address
int MemoryManager::translateAddress(int pid, int virtual_addr) {
    int page_num = virtual_addr / PAGE_SIZE;
    int offset = virtual_addr % PAGE_SIZE;
    
    // Process must have an entry in the page table
    if (page_tables.find(pid) == page_tables.end()) return -1;
    
    // Page number must be within the allocated range
    if (page_num >= (int)page_tables[pid].size()) return -1;
    
    int frame_idx = page_tables[pid][page_num];
    return (frame_idx * PAGE_SIZE) + offset;
}

// Process a page access request
void MemoryManager::accessPage(int pid, int page_num, vector<int> future_refs) {
    current_tick++;
    bool is_hit = false;
    
    // Search physical memory for the requested page
    for (auto& f : frames) {
        if (f.pid == pid && f.page_num == page_num) {
            is_hit = true;
            f.last_used = current_tick;
            f.referenced = true;
            total_hits++;
            break;
        }
    }
    
    // Handle page fault
    if (!is_hit) {
        total_faults++;
        int victim_idx = findFreeFrame();
        
        // If memory is full, run replacement algorithm
        if (victim_idx == -1) {
            if (policy == PagePolicy::FIFO) victim_idx = fifoReplace();
            else if (policy == PagePolicy::LRU) victim_idx = lruReplace();
            else victim_idx = optimalReplace(future_refs, 0);
        }
        
        // Load the new page into the selected frame
        if (victim_idx != -1) {
            frames[victim_idx].pid = pid;
            frames[victim_idx].page_num = page_num;
            frames[victim_idx].valid = true;
            frames[victim_idx].dirty = false;
            frames[victim_idx].referenced = true; // New page is immediately referenced
            frames[victim_idx].load_time = current_tick;
            frames[victim_idx].last_used = current_tick;
        }
    }
}

// Manually mark a page as dirty (simulation of a write)
void MemoryManager::setDirty(int pid, int page_num, bool dirty) {
    for (auto& f : frames) {
        if (f.pid == pid && f.page_num == page_num) {
            f.dirty = dirty;
            break;
        }
    }
}

// Find first empty frame
int MemoryManager::findFreeFrame() {
    for (int i = 0; i < TOTAL_FRAMES; ++i) {
        if (frames[i].pid == -1) return i;
    }
    return -1;
}

// FIFO: Find oldest frame by load time
int MemoryManager::fifoReplace() {
    int oldest = 0;
    int min_val = 2e9;
    for (int i = 0; i < TOTAL_FRAMES; ++i) {
        if (frames[i].pid != -1 && frames[i].load_time < min_val) {
            min_val = frames[i].load_time;
            oldest = i;
        }
    }
    return oldest;
}

// LRU: Find frame accessed furthest in the past
int MemoryManager::lruReplace() {
    int lru = 0;
    int min_val = 2e9;
    for (int i = 0; i < TOTAL_FRAMES; ++i) {
        if (frames[i].pid != -1 && frames[i].last_used < min_val) {
            min_val = frames[i].last_used;
            lru = i;
        }
    }
    return lru;
}

// OPTIMAL: Find frame whose page won't be used for the longest time
int MemoryManager::optimalReplace(const vector<int>& future_refs, int current_pos) {
    int victim = 0;
    int max_dist = -1;
    
    for (int i = 0; i < TOTAL_FRAMES; ++i) {
        if (frames[i].pid == -1) return i;
        
        int dist = 2e9; // Infinity if not found
        for (int j = current_pos; j < (int)future_refs.size(); ++j) {
            if (future_refs[j] == frames[i].page_num) {
                dist = j;
                break;
            }
        }
        
        if (dist > max_dist) {
            max_dist = dist;
            victim = i;
        }
    }
    return victim;
}

// Return current efficiency metrics
MemoryStats MemoryManager::getStats() {
    MemoryStats s;
    int used = 0;
    for (const auto& f : frames) if (f.pid != -1) used++;
    s.used_frames = used;
    s.free_frames = TOTAL_FRAMES - used;
    s.page_faults = total_faults;
    s.page_hits = total_hits;
    int total = total_hits + total_faults;
    s.hit_rate = total > 0 ? ((double)total_hits / total) * 100.0 : 0;
    return s;
}

// Create ASCII map of memory state
string MemoryManager::memoryMapToString() {
    stringstream ss;
    string policy_name = (policy == PagePolicy::FIFO ? "FIFO" : (policy == PagePolicy::LRU ? "LRU" : "OPTIMAL"));
    
    ss << "PHYSICAL MEMORY [32 FRAMES | 128KB]  Policy: " << policy_name << endl;
    ss << "FRAME  PID   PAGE  V  D  R  USAGE" << endl;
    
    for (int i = 0; i < TOTAL_FRAMES; ++i) {
        ss << "[" << setfill('0') << setw(2) << i << "]   ";
        if (frames[i].pid == -1) {
            ss << "---    -   [ ][ ][ ] ░░░░░░░░░░░░░░░░";
        } else {
            ss << setfill(' ') << setw(3) << frames[i].pid << "    " << setw(1) << frames[i].page_num << "   ";
            ss << "[" << (frames[i].valid ? "V" : " ") << "]"
               << "[" << (frames[i].dirty ? "D" : " ") << "]"
               << "[" << (frames[i].referenced ? "R" : " ") << "] "
               << "████████████████";
        }
        ss << endl;
    }
    
    MemoryStats s = getStats();
    ss << fixed << setprecision(1);
    ss << "USED: " << s.used_frames << "/32  FREE: " << s.free_frames << "/32  ";
    ss << "FAULTS: " << s.page_faults << "  HIT RATE: " << s.hit_rate << "%" << endl;
    
    return ss.str();
}

// Serialized frame data for frontend
string MemoryManager::allFramesToJson() {
    nlohmann::json arr = nlohmann::json::array();
    for (const auto& f : frames) {
        nlohmann::json j;
        j["id"] = f.frame_id;
        j["pid"] = f.pid;
        j["page"] = f.page_num;
        j["v"] = f.valid;
        j["d"] = f.dirty;
        j["r"] = f.referenced;
        j["load_time"] = f.load_time;
        j["last_used"] = f.last_used;
        arr.push_back(j);
    }
    return arr.dump();
}

// Compare FIFO, LRU, and Optimal algorithms on a reference string
string MemoryManager::compareReplacement(vector<int> ref_string, int num_frames) {
    // 1. FIFO Simulation
    auto sim_fifo = [&]() {
        vector<int> mem; int faults = 0;
        for (int p : ref_string) {
            if (find(mem.begin(), mem.end(), p) == mem.end()) {
                faults++;
                if ((int)mem.size() >= num_frames) mem.erase(mem.begin());
                mem.push_back(p);
            }
        }
        return faults;
    };
    
    // 2. LRU Simulation
    auto sim_lru = [&]() {
        vector<int> mem; int faults = 0;
        for (int p : ref_string) {
            auto it = find(mem.begin(), mem.end(), p);
            if (it == mem.end()) {
                faults++;
                if ((int)mem.size() >= num_frames) mem.erase(mem.begin());
                mem.push_back(p);
            } else {
                int val = *it; mem.erase(it); mem.push_back(val); // Move to back (MRU)
            }
        }
        return faults;
    };
    
    // 3. Optimal Simulation
    auto sim_opt = [&]() {
        vector<int> mem; int faults = 0;
        for (int i = 0; i < (int)ref_string.size(); ++i) {
            int p = ref_string[i];
            if (find(mem.begin(), mem.end(), p) == mem.end()) {
                faults++;
                if ((int)mem.size() < num_frames) mem.push_back(p);
                else {
                    int furthest = -1, victim = 0;
                    for (int k = 0; k < (int)mem.size(); ++k) {
                        int next = 1e9;
                        for (int m = i + 1; m < (int)ref_string.size(); ++m) if (ref_string[m] == mem[k]) { next = m; break; }
                        if (next > furthest) { furthest = next; victim = k; }
                    }
                    mem[victim] = p;
                }
            }
        }
        return faults;
    };

    nlohmann::json res;
    res["fifo"] = sim_fifo();
    res["lru"] = sim_lru();
    res["optimal"] = sim_opt();
    res["ref_string"] = ref_string;
    res["frames"] = num_frames;
    return res.dump();
}
