#ifndef MEMORY_H
#define MEMORY_H

#include <vector>
#include <string>
#include <map>
#include "json.hpp"

// Using standard namespace throughout for simplicity
using namespace std;

// Page replacement policies supported by the system
enum class PagePolicy { FIFO, LRU, OPTIMAL };

// Represents a single frame in physical memory
struct PageFrame {
    int frame_id;       // Index of the frame (0-31)
    int pid = -1;       // PID of the process using this frame (-1 if free)
    int page_num = -1;  // Page number of the process (-1 if free)
    int load_time = 0;  // Tick when the page was loaded (for FIFO)
    int last_used = 0;  // Tick when the page was last accessed (for LRU)
    bool valid = false; // Is the data valid?
    bool dirty = false; // Has the page been modified?
    bool referenced = false; // Has the page been accessed recently?
};

// Memory counters and statistics
struct MemoryStats {
    int total_frames = 32;
    int used_frames = 0;
    int free_frames = 32;
    int page_faults = 0;
    int page_hits = 0;
    double hit_rate = 0.0;
};

// Memory Manager class to handle allocation and paging
class MemoryManager {
public:
    static const int TOTAL_FRAMES = 32;
    static const int PAGE_SIZE = 4; // 4KB per page
    
    PagePolicy policy = PagePolicy::LRU; // Default policy
    int current_tick = 0;                // System clock simulation
    
    MemoryManager();
    
    // Configuration
    void setPolicy(PagePolicy p);
    
    // Core memory operations
    bool allocatePages(int pid, int num_pages);
    void deallocate(int pid);
    int translateAddress(int pid, int virtual_addr);
    void accessPage(int pid, int page_num, vector<int> future_refs = {});
    
    // Status and visualization
    MemoryStats getStats();
    string memoryMapToString();
    string allFramesToJson();
    string compareReplacement(vector<int> ref_string, int num_frames);

private:
    vector<PageFrame> frames;           // Physical memory frames
    map<int, vector<int>> page_tables;  // PID -> list of frame indices
    int total_faults = 0;
    int total_hits = 0;
    
    // Internal algorithm helpers
    int findFreeFrame();
    int fifoReplace();
    int lruReplace();
    int optimalReplace(const vector<int>& future_refs, int current_pos);
};

#endif // MEMORY_H
