cmake_minimum_required(VERSION 3.16)
project(ghostkernel LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_compile_options(-pthread -O2 -Wall)

add_executable(ghostkernel_engine
    src/pcb.cpp
    src/scheduler.cpp
    src/memory.cpp
    src/sync.cpp
    src/workload.cpp
    src/main.cpp
)

target_include_directories(ghostkernel_engine PRIVATE include/)
target_link_libraries(ghostkernel_engine pthread)
