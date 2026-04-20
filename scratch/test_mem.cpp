#include <iostream>
#include <vector>
#include "memory.h"

int main() {
    MemoryManager mem;
    vector<int> ref = {7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2};
    int frames = 3;
    
    cout << "Testing Page Replacement Algorithms..." << endl;
    cout << "Ref String: ";
    for (int r : ref) cout << r << " ";
    cout << endl << "Frames: " << frames << endl;
    
    string result_json = mem.compareReplacement(ref, frames);
    cout << "Results: " << result_json << endl;
    
    return 0;
}
