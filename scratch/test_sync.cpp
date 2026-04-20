#include <iostream>
#include "sync.h"

using namespace std;

int main() {
    SyncEngine engine;
    
    cout << "--- Testing Synchronization Scenarios ---" << endl;
    
    // 1. Producer-Consumer
    cout << "\n[1] Producer-Consumer (items=5, buffer=2)" << endl;
    ScenarioResult pc = engine.runProducerConsumer(5, 2);
    cout << "Summary: " << pc.summary << endl;
    cout << "Events: " << pc.events.size() << endl;
    
    // 2. Dining Philosophers - Safe
    cout << "\n[2] Dining Philosophers - Safe (N=5)" << endl;
    ScenarioResult dp_safe = engine.runDiningPhilosophers(5, false);
    cout << "Deadlock: " << (dp_safe.deadlock_occurred ? "YES" : "NO") << endl;
    cout << "Summary: " << dp_safe.summary << endl;
    
    // 3. Dining Philosophers - Deadlock
    cout << "\n[3] Dining Philosophers - Deadlock (N=5)" << endl;
    ScenarioResult dp_dead = engine.runDiningPhilosophers(5, true);
    cout << "Deadlock: " << (dp_dead.deadlock_occurred ? "YES" : "NO") << endl;
    cout << "Summary: " << dp_dead.summary << endl;
    
    return 0;
}
