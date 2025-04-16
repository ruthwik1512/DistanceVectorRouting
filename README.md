# Distance Vector Routing Simulator

A web-based simulation of the Distance Vector Routing algorithm, implemented using vanilla JavaScript and CSS.

## Overview

This application simulates the Distance Vector Routing (DVR) algorithm, which is a fundamental routing algorithm used in computer networks. The simulator allows you to create a network of routers, establish links between them, and observe how routing tables are updated as the algorithm iterates.

## Features

1. **Add Routers**: Add routers to the network with automatic numbering.
2. **Delete Routers**: Remove selected routers from the network.
3. **Add Links**: Create links between routers with custom costs.
4. **Run DVR Algorithm**: Step through the DVR algorithm with animated updates.
5. **Path Finder**: Visualize the shortest path between two routers after the algorithm converges.
6. **Routing Tables**: View the routing table of any router by clicking on it.

## How to Use

1. **Setup the Network**:
   - Click "Add Router" to add routers to the canvas.
   - Click and drag routers to position them.
   - Click "Add Link" to create links between routers, specifying the cost.

2. **Run the Algorithm**:
   - Click "Run DVR" to start the Distance Vector Routing algorithm.
   - Watch as the algorithm steps through iterations, updating routing tables.
   - The simulation will stop automatically once the algorithm converges.

3. **Find Paths**:
   - After the algorithm converges, click "Find Path".
   - Select source and destination routers.
   - The shortest path will be highlighted in the network.

4. **View Routing Tables**:
   - Click on any router to see its current routing table.
   - The table shows destinations, next hops, and costs.

5. **Reset Simulation**:
   - Click "Reset" to clear the network and start over.

## Implementation Details

- The simulation uses a Router class similar to the Node class in the original Python implementation.
- Each router maintains a distance vector and next-hop table.
- The DVR algorithm is implemented iteratively, with visual feedback for each step.
- The canvas uses HTML/CSS for visualization rather than a canvas-based approach for simplicity.

## Run the Application

Open the `index.html` file in a web browser to start using the simulator. No server or additional dependencies are required.

## Educational Value

This simulator helps visualize how:
- Routers exchange distance vectors with neighbors
- Routing tables are updated based on the Bellman-Ford equation
- The algorithm converges over multiple iterations
- Optimal paths are determined in a distributed manner 