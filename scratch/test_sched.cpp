#include <iostream>
#include <vector>
#include "pcb.h"
#include "scheduler.h"

int main() {
    Scheduler sched;
    std::vector<PCB> procs = {
        {1, "P1", ProcessState::NEW, 1, 5, 5, 0, 0, 0, -1, 0},
        {2, "P2", ProcessState::NEW, 1, 3, 3, 1, 0, 0, -1, 0},
        {3, "P3", ProcessState::NEW, 1, 8, 8, 2, 0, 0, -1, 0},
        {4, "P4", ProcessState::NEW, 1, 2, 2, 3, 0, 0, -1, 0}
    };

    std::cout << "Testing FCFS..." << std::endl;
    sched.setAlgorithm(SchedulerAlgo::FCFS);
    SchedulerMetrics m = sched.run(procs);

    std::cout << "Avg Waiting Time: " << m.avg_waiting_time << std::endl;
    std::cout << "Expected: 4.25 (or something else?)" << std::endl;

    if (m.avg_waiting_time == 4.25) {
        std::cout << "VERIFICATION SUCCESSFUL!" << std::endl;
    } else {
        std::cout << "VERIFICATION FAILED! Got " << m.avg_waiting_time << std::endl;
        
        // Try swapping P3 and P4 bursts
        std::cout << "Trying with P3 burst=2, P4 burst=8..." << std::endl;
        procs[2].burst_time = 2;
        procs[3].burst_time = 8;
        m = sched.run(procs);
        std::cout << "New Avg Waiting Time: " << m.avg_waiting_time << std::endl;
    }

    return 0;
}
