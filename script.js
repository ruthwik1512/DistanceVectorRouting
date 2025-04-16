// DOM Elements
const networkCanvas = document.getElementById('network-canvas');
const statusMessage = document.getElementById('status-message');
const iterationInfo = document.getElementById('iteration-info');
const addRouterBtn = document.getElementById('add-router');
const deleteRouterBtn = document.getElementById('delete-router');
const addLinkBtn = document.getElementById('add-link');
const findPathBtn = document.getElementById('find-path');
const runDvrBtn = document.getElementById('run-dvr');
const resetBtn = document.getElementById('reset');

// Popup Elements
const routerPopup = document.getElementById('router-popup');
const routerPopupTitle = document.getElementById('router-popup-title');
const routingTableContainer = document.getElementById('routing-table-container');
const linkPopup = document.getElementById('link-popup');
const pathPopup = document.getElementById('path-popup');
const linkFromSelect = document.getElementById('link-from');
const linkToSelect = document.getElementById('link-to');
const linkCostInput = document.getElementById('link-cost');
const confirmAddLinkBtn = document.getElementById('confirm-add-link');
const pathFromSelect = document.getElementById('path-from');
const pathToSelect = document.getElementById('path-to');
const confirmFindPathBtn = document.getElementById('confirm-find-path');
const closePopupBtns = document.querySelectorAll('.close-popup');

// Add new DOM element reference
const allRoutingTables = document.getElementById('all-routing-tables');

// Add new DOM elements for convergence popup
const convergencePopup = document.getElementById('convergence-popup');
const convergenceMessage = document.getElementById('convergence-message');
const convergenceIterations = document.getElementById('convergence-iterations');
const confirmConvergenceBtn = document.getElementById('confirm-convergence');

// Network state
let routers = {};
let links = {};
let nextRouterId = 1;
let selectedRouter = null;
let isDragging = false;
let offset = { x: 0, y: 0 };
let simulationRunning = false;
let isConverged = false;
let currentIteration = 0;
let currentRouterIndex = 0;

// Router class (similar to Node class in the Python code)
class Router {
    constructor(id, x, y) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.neighbors = [];
        this.distanceVector = {};
        this.nextHop = {};
        this.updatedInIteration = false;
        
        // Initialize distance vectors
        for (const routerId in routers) {
            this.distanceVector[routerId] = Infinity;
            this.nextHop[routerId] = null;
        }
        this.distanceVector[id] = 0;
        
        // Initialize distance vectors for all existing routers to include this new router
        for (const routerId in routers) {
            if (routerId !== id) {
                routers[routerId].distanceVector[id] = Infinity;
                routers[routerId].nextHop[id] = null;
            }
        }
    }
    
    updateDistanceVector(receivedVectors) {
        let updated = false;
        
        for (const neighbor of this.neighbors) {
            if (neighbor in receivedVectors) {
                const neighborVector = receivedVectors[neighbor];
                const linkCost = getLinkCost(this.id, neighbor);
                
                for (const dest in this.distanceVector) {
                    if (dest !== this.id) {
                        const newCost = linkCost + (neighborVector[dest] || Infinity);
                        if (newCost < this.distanceVector[dest]) {
                            this.distanceVector[dest] = newCost;
                            this.nextHop[dest] = neighbor;
                            updated = true;
                            this.updatedInIteration = true;
                        }
                    }
                }
            }
        }
        
        return updated;
    }
}

// Helper function to get link cost (handles both directions)
function getLinkCost(node1, node2) {
    const linkKey1 = `${node1}-${node2}`;
    const linkKey2 = `${node2}-${node1}`;
    
    if (linkKey1 in links) {
        return links[linkKey1].cost;
    } else if (linkKey2 in links) {
        return links[linkKey2].cost;
    } else {
        return Infinity;
    }
}

// Create a router element in the DOM
function createRouterElement(router) {
    const routerElement = document.createElement('div');
    routerElement.className = 'router';
    routerElement.id = `router-${router.id}`;
    routerElement.textContent = router.id;
    routerElement.style.left = `${router.x}px`;
    routerElement.style.top = `${router.y}px`;
    
    // Add event listeners
    routerElement.addEventListener('mousedown', (e) => {
        if (simulationRunning) return;
        
        if (selectedRouter && selectedRouter !== router.id) {
            // If a router is already selected, deselect it
            document.getElementById(`router-${selectedRouter}`).classList.remove('selected');
        }
        
        // Select this router
        selectedRouter = router.id;
        routerElement.classList.add('selected');
        
        // Set up dragging
        isDragging = true;
        offset.x = e.clientX - router.x;
        offset.y = e.clientY - router.y;
        
        e.stopPropagation();
    });
    
    routerElement.addEventListener('click', (e) => {
        if (simulationRunning) return;
        
        // Show routing table popup
        showRouterPopup(router.id);
        e.stopPropagation();
    });
    
    networkCanvas.appendChild(routerElement);
}

// Create a link element in the DOM
function createLinkElement(link) {
    const router1 = routers[link.from];
    const router2 = routers[link.to];
    
    // Create link line
    const linkElement = document.createElement('div');
    linkElement.className = 'link';
    linkElement.id = `link-${link.from}-${link.to}`;
    
    // Create link cost label
    const linkCostElement = document.createElement('div');
    linkCostElement.className = 'link-cost';
    linkCostElement.textContent = link.cost;
    
    // Position link and cost
    updateLinkPosition(link, linkElement, linkCostElement);
    
    networkCanvas.appendChild(linkElement);
    networkCanvas.appendChild(linkCostElement);
    
    // Store the cost element reference
    link.costElement = linkCostElement;
    link.element = linkElement;
}

// Update link position based on connected routers
function updateLinkPosition(link, linkElement, costElement) {
    const router1 = routers[link.from];
    const router2 = routers[link.to];
    
    const r1x = router1.x + 30; // Center of router
    const r1y = router1.y + 30;
    const r2x = router2.x + 30;
    const r2y = router2.y + 30;
    
    // Calculate length and angle
    const dx = r2x - r1x;
    const dy = r2y - r1y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    
    // Position link line
    linkElement.style.width = `${length}px`;
    linkElement.style.left = `${r1x}px`;
    linkElement.style.top = `${r1y}px`;
    linkElement.style.transform = `rotate(${angle}deg)`;
    
    // Position cost label
    costElement.style.left = `${r1x + dx / 2 - 15}px`;
    costElement.style.top = `${r1y + dy / 2 - 15}px`;
}

// Update all link positions (e.g., after moving a router)
function updateAllLinks() {
    for (const linkKey in links) {
        const link = links[linkKey];
        updateLinkPosition(link, link.element, link.costElement);
    }
}

// Add a router to the network
function addRouter(x, y) {
    const id = nextRouterId.toString();
    const router = new Router(id, x, y);
    routers[id] = router;
    createRouterElement(router);
    nextRouterId++;
    
    statusMessage.textContent = `Added Router ${id}`;
    updateAllRoutingTables(); // Update routing tables
    return router;
}

// Delete a router from the network
function deleteRouter(routerId) {
    if (!routers[routerId]) return;
    
    // Remove router element
    const routerElement = document.getElementById(`router-${routerId}`);
    if (routerElement) {
        networkCanvas.removeChild(routerElement);
    }
    
    // Remove associated links
    const linksToRemove = [];
    for (const linkKey in links) {
        const link = links[linkKey];
        if (link.from === routerId || link.to === routerId) {
            linksToRemove.push(linkKey);
            if (link.element) networkCanvas.removeChild(link.element);
            if (link.costElement) networkCanvas.removeChild(link.costElement);
            
            // Remove this router from the neighbor list of connected routers
            if (link.from === routerId && routers[link.to]) {
                const idx = routers[link.to].neighbors.indexOf(routerId);
                if (idx !== -1) routers[link.to].neighbors.splice(idx, 1);
            } else if (link.to === routerId && routers[link.from]) {
                const idx = routers[link.from].neighbors.indexOf(routerId);
                if (idx !== -1) routers[link.from].neighbors.splice(idx, 1);
            }
        }
    }
    
    // Remove links from links object
    for (const linkKey of linksToRemove) {
        delete links[linkKey];
    }
    
    // Remove router from distance vectors of all other routers
    for (const id in routers) {
        if (id !== routerId) {
            delete routers[id].distanceVector[routerId];
            delete routers[id].nextHop[routerId];
        }
    }
    
    // Remove router from routers object
    delete routers[routerId];
    
    if (selectedRouter === routerId) {
        selectedRouter = null;
    }
    
    statusMessage.textContent = `Deleted Router ${routerId}`;
    updateAllRoutingTables(); // Update routing tables
}

// Add a link between two routers
function addLink(fromRouter, toRouter, cost) {
    if (fromRouter === toRouter) {
        statusMessage.textContent = "Cannot create a link to the same router";
        return false;
    }
    
    const linkKey = `${fromRouter}-${toRouter}`;
    const reverseLinkKey = `${toRouter}-${fromRouter}`;
    
    if (linkKey in links || reverseLinkKey in links) {
        statusMessage.textContent = "Link already exists between these routers";
        return false;
    }
    
    const link = {
        from: fromRouter,
        to: toRouter,
        cost: cost
    };
    
    links[linkKey] = link;
    createLinkElement(link);
    
    // Add neighbors to routers
    routers[fromRouter].neighbors.push(toRouter);
    routers[toRouter].neighbors.push(fromRouter);
    
    // Update direct costs in distance vectors
    routers[fromRouter].distanceVector[toRouter] = cost;
    routers[fromRouter].nextHop[toRouter] = toRouter;
    
    routers[toRouter].distanceVector[fromRouter] = cost;
    routers[toRouter].nextHop[fromRouter] = fromRouter;
    
    statusMessage.textContent = `Added link from Router ${fromRouter} to Router ${toRouter} with cost ${cost}`;
    updateAllRoutingTables(); // Update routing tables
    return true;
}

// Find the path between source and destination routers
function findPath(fromRouter, toRouter) {
    if (!isConverged) {
        statusMessage.textContent = "Please run DVR algorithm first to find paths";
        return;
    }
    
    if (fromRouter === toRouter) {
        statusMessage.textContent = "Source and destination are the same";
        return;
    }
    
    // Reset all links (remove active-path class)
    for (const linkKey in links) {
        const link = links[linkKey];
        link.element.classList.remove('active-path');
    }
    
    let currentHop = fromRouter;
    let path = [currentHop];
    const nextHop = routers[currentHop].nextHop[toRouter];
    
    if (!nextHop || routers[currentHop].distanceVector[toRouter] === Infinity) {
        statusMessage.textContent = `No path exists from Router ${fromRouter} to Router ${toRouter}`;
        return;
    }
    
    // Traverse the path
    while (currentHop !== toRouter) {
        const nextHop = routers[currentHop].nextHop[toRouter];
        if (!nextHop || nextHop === null) {
            statusMessage.textContent = `Path incomplete from Router ${fromRouter} to Router ${toRouter}`;
            return;
        }
        
        // Highlight the link
        const linkKey1 = `${currentHop}-${nextHop}`;
        const linkKey2 = `${nextHop}-${currentHop}`;
        
        if (linkKey1 in links) {
            links[linkKey1].element.classList.add('active-path');
        } else if (linkKey2 in links) {
            links[linkKey2].element.classList.add('active-path');
        }
        
        path.push(nextHop);
        currentHop = nextHop;
        
        // Prevent infinite loops
        if (path.length > Object.keys(routers).length) {
            statusMessage.textContent = "Error: Loop detected in path";
            return;
        }
    }
    
    statusMessage.textContent = `Path from Router ${fromRouter} to Router ${toRouter}: ${path.join(' → ')} (Cost: ${routers[fromRouter].distanceVector[toRouter]})`;
}

// Run one step of the DVR algorithm
function runDvrStep() {
    if (Object.keys(routers).length < 2) {
        statusMessage.textContent = "Need at least 2 routers to run DVR";
        simulationRunning = false;
        return false;
    }
    
    const routerIds = Object.keys(routers);
    
    // Reset updated flag at the start of each iteration
    if (currentRouterIndex === 0) {
        for (const id in routers) {
            routers[id].updatedInIteration = false;
        }
    }
    
    // Get current router
    const currentRouterId = routerIds[currentRouterIndex];
    const currentRouter = routers[currentRouterId];
    
    // Reset router colors
    for (const id in routers) {
        const routerElement = document.getElementById(`router-${id}`);
        routerElement.classList.remove('active');
        routerElement.classList.remove('updated');
    }
    
    // Highlight current router
    const routerElement = document.getElementById(`router-${currentRouterId}`);
    routerElement.classList.add('active');
    
    // Get received vectors from neighbors
    const receivedVectors = {};
    for (const neighbor of currentRouter.neighbors) {
        receivedVectors[neighbor] = {...routers[neighbor].distanceVector};
    }
    
    // Update distance vector
    const updated = currentRouter.updateDistanceVector(receivedVectors);
    
    // Highlight updated routers
    if (updated) {
        routerElement.classList.add('updated');
    }
    
    // Update all routing tables in the status panel
    updateAllRoutingTables();
    
    // Update status
    iterationInfo.textContent = `Iteration ${currentIteration + 1}, Router ${currentRouterId}`;
    
    // Move to next router
    currentRouterIndex++;
    
    // If we've processed all routers, check if we need another iteration
    if (currentRouterIndex >= routerIds.length) {
        currentRouterIndex = 0;
        
        // Check if any router was updated in this iteration
        let anyUpdated = false;
        for (const id in routers) {
            if (routers[id].updatedInIteration) {
                anyUpdated = true;
                break;
            }
        }
        
        // If no updates, we've converged
        if (!anyUpdated) {
            isConverged = true;
            statusMessage.textContent = `DVR algorithm converged after ${currentIteration + 1} iterations`;
            simulationRunning = false;
            
            // Show convergence popup
            showConvergencePopup(currentIteration + 1);
            
            return false;
        }
        
        currentIteration++;
        
        // Safety check to prevent infinite loops
        if (currentIteration >= 20) {
            statusMessage.textContent = "Reached maximum iterations (20)";
            simulationRunning = false;
            return false;
        }
    }
    
    return true;
}

// Run the full DVR algorithm (using setTimeout for animation)
function runDvr() {
    if (simulationRunning) return;
    
    simulationRunning = true;
    isConverged = false;
    currentIteration = 0;
    currentRouterIndex = 0;
    
    statusMessage.textContent = "Running DVR Algorithm...";
    
    function animateStep() {
        if (runDvrStep()) {
            setTimeout(animateStep, 800); // Match the animation interval from the Python code
        } else {
            simulationRunning = false;
        }
    }
    
    animateStep();
}

// Reset the simulation
function resetSimulation() {
    // Clear all routers and links
    for (const id in routers) {
        const routerElement = document.getElementById(`router-${id}`);
        if (routerElement) {
            networkCanvas.removeChild(routerElement);
        }
    }
    
    for (const linkKey in links) {
        const link = links[linkKey];
        if (link.element) networkCanvas.removeChild(link.element);
        if (link.costElement) networkCanvas.removeChild(link.costElement);
    }
    
    // Reset state
    routers = {};
    links = {};
    nextRouterId = 1;
    selectedRouter = null;
    simulationRunning = false;
    isConverged = false;
    currentIteration = 0;
    currentRouterIndex = 0;
    
    statusMessage.textContent = "Simulation reset";
    iterationInfo.textContent = "";
    routerPopup.style.display = "none";
    allRoutingTables.innerHTML = ""; // Clear routing tables
}

// Show router popup with routing table
function showRouterPopup(routerId) {
    const router = routers[routerId];
    if (!router) return;
    
    routerPopupTitle.textContent = `Router ${routerId} Routing Table`;
    routingTableContainer.innerHTML = "";
    
    // Create routing table
    const table = document.createElement('table');
    table.className = 'routing-table';
    
    // Table header
    const headerRow = document.createElement('tr');
    const headerDest = document.createElement('th');
    headerDest.textContent = 'Destination';
    const headerNext = document.createElement('th');
    headerNext.textContent = 'Next Hop';
    const headerCost = document.createElement('th');
    headerCost.textContent = 'Cost';
    
    headerRow.appendChild(headerDest);
    headerRow.appendChild(headerNext);
    headerRow.appendChild(headerCost);
    table.appendChild(headerRow);
    
    // Table rows
    for (const destId in router.distanceVector) {
        if (destId !== routerId) {
            const row = document.createElement('tr');
            
            const cellDest = document.createElement('td');
            cellDest.textContent = destId;
            
            const cellNext = document.createElement('td');
            cellNext.textContent = router.nextHop[destId] || '-';
            
            const cellCost = document.createElement('td');
            const cost = router.distanceVector[destId];
            if (cost === Infinity) {
                cellCost.textContent = '∞';
                cellCost.className = 'infinity';
            } else {
                cellCost.textContent = cost;
            }
            
            row.appendChild(cellDest);
            row.appendChild(cellNext);
            row.appendChild(cellCost);
            table.appendChild(row);
        }
    }
    
    routingTableContainer.appendChild(table);
    routerPopup.style.display = "flex";
}

// Show link popup to add a link
function showLinkPopup() {
    // Clear previous selections
    linkFromSelect.innerHTML = "";
    linkToSelect.innerHTML = "";
    
    // Populate router options
    for (const id in routers) {
        const option1 = document.createElement('option');
        option1.value = id;
        option1.textContent = `Router ${id}`;
        
        const option2 = document.createElement('option');
        option2.value = id;
        option2.textContent = `Router ${id}`;
        
        linkFromSelect.appendChild(option1);
        linkToSelect.appendChild(option2);
    }
    
    linkCostInput.value = 1;
    linkPopup.style.display = "flex";
}

// Show path popup to find a path
function showPathPopup() {
    // Clear previous selections
    pathFromSelect.innerHTML = "";
    pathToSelect.innerHTML = "";
    
    // Populate router options
    for (const id in routers) {
        const option1 = document.createElement('option');
        option1.value = id;
        option1.textContent = `Router ${id}`;
        
        const option2 = document.createElement('option');
        option2.value = id;
        option2.textContent = `Router ${id}`;
        
        pathFromSelect.appendChild(option1);
        pathToSelect.appendChild(option2);
    }
    
    pathPopup.style.display = "flex";
}

// Show convergence popup
function showConvergencePopup(iterations) {
    convergenceMessage.textContent = `The Distance Vector Routing algorithm has successfully converged after ${iterations} iteration${iterations > 1 ? 's' : ''}.`;
    convergenceIterations.textContent = iterations;
    convergencePopup.style.display = "flex";
}

// Event listeners
addRouterBtn.addEventListener('click', () => {
    if (simulationRunning) return;
    
    // Generate random position within the canvas
    const x = Math.random() * (networkCanvas.clientWidth - 100) + 20;
    const y = Math.random() * (networkCanvas.clientHeight - 100) + 20;
    addRouter(x, y);
});

deleteRouterBtn.addEventListener('click', () => {
    if (simulationRunning) return;
    
    if (selectedRouter) {
        deleteRouter(selectedRouter);
        selectedRouter = null;
    } else {
        statusMessage.textContent = "Please select a router to delete";
    }
});

addLinkBtn.addEventListener('click', () => {
    if (simulationRunning) return;
    
    if (Object.keys(routers).length < 2) {
        statusMessage.textContent = "Need at least 2 routers to create a link";
        return;
    }
    
    showLinkPopup();
});

findPathBtn.addEventListener('click', () => {
    if (!isConverged) {
        statusMessage.textContent = "Please run DVR algorithm first";
        return;
    }
    
    if (Object.keys(routers).length < 2) {
        statusMessage.textContent = "Need at least 2 routers to find a path";
        return;
    }
    
    showPathPopup();
});

runDvrBtn.addEventListener('click', () => {
    if (simulationRunning) return;
    
    runDvr();
});

resetBtn.addEventListener('click', () => {
    if (simulationRunning) return;
    
    resetSimulation();
});

confirmAddLinkBtn.addEventListener('click', () => {
    const fromRouter = linkFromSelect.value;
    const toRouter = linkToSelect.value;
    const cost = parseInt(linkCostInput.value, 10);
    
    if (isNaN(cost) || cost < 1) {
        statusMessage.textContent = "Link cost must be a positive number";
        return;
    }
    
    addLink(fromRouter, toRouter, cost);
    linkPopup.style.display = "none";
});

confirmFindPathBtn.addEventListener('click', () => {
    const fromRouter = pathFromSelect.value;
    const toRouter = pathToSelect.value;
    
    findPath(fromRouter, toRouter);
    pathPopup.style.display = "none";
});

confirmConvergenceBtn.addEventListener('click', () => {
    convergencePopup.style.display = "none";
});

// Close popups
closePopupBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        routerPopup.style.display = "none";
        linkPopup.style.display = "none";
        pathPopup.style.display = "none";
        convergencePopup.style.display = "none";
    });
});

// Setup drag and drop for routers
networkCanvas.addEventListener('mousemove', (e) => {
    if (isDragging && selectedRouter && !simulationRunning) {
        const router = routers[selectedRouter];
        const rect = networkCanvas.getBoundingClientRect();
        
        // Calculate new position
        let newX = e.clientX - rect.left - offset.x;
        let newY = e.clientY - rect.top - offset.y;
        
        // Keep router within canvas bounds
        newX = Math.max(0, Math.min(newX, rect.width - 60));
        newY = Math.max(0, Math.min(newY, rect.height - 60));
        
        router.x = newX;
        router.y = newY;
        
        // Update router position in DOM
        const routerElement = document.getElementById(`router-${selectedRouter}`);
        routerElement.style.left = `${newX}px`;
        routerElement.style.top = `${newY}px`;
        
        // Update all connected links
        updateAllLinks();
    }
});

networkCanvas.addEventListener('mouseup', () => {
    isDragging = false;
});

networkCanvas.addEventListener('mouseleave', () => {
    isDragging = false;
});

// Click on canvas to deselect router
networkCanvas.addEventListener('click', () => {
    if (selectedRouter) {
        document.getElementById(`router-${selectedRouter}`).classList.remove('selected');
        selectedRouter = null;
    }
});

// Close popup when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === routerPopup) {
        routerPopup.style.display = "none";
    }
    if (e.target === linkPopup) {
        linkPopup.style.display = "none";
    }
    if (e.target === pathPopup) {
        pathPopup.style.display = "none";
    }
    if (e.target === convergencePopup) {
        convergencePopup.style.display = "none";
    }
});

// Initialize the simulation with some routers
document.addEventListener('DOMContentLoaded', () => {
    // Add example routers for testing
    addRouter(100, 100);
    addRouter(300, 100);
    addRouter(200, 250);
    
    // Add example links
    addLink("1", "2", 5);
    addLink("1", "3", 3);
    addLink("2", "3", 2);
    
    statusMessage.textContent = "Simulation ready. Add routers and links or run DVR.";
});

// Function to create a routing table for the status panel
function createStatusRoutingTable(routerId) {
    const router = routers[routerId];
    if (!router) return null;

    const container = document.createElement('div');
    container.className = 'router-table-container';

    const title = document.createElement('h5');
    title.textContent = `Router ${routerId}`;
    container.appendChild(title);

    const table = document.createElement('table');
    table.className = 'status-routing-table';

    // Table header
    const headerRow = document.createElement('tr');
    const headerDest = document.createElement('th');
    headerDest.textContent = 'Dest';
    const headerNext = document.createElement('th');
    headerNext.textContent = 'Next';
    const headerCost = document.createElement('th');
    headerCost.textContent = 'Cost';

    headerRow.appendChild(headerDest);
    headerRow.appendChild(headerNext);
    headerRow.appendChild(headerCost);
    table.appendChild(headerRow);

    // Table rows
    for (const destId in router.distanceVector) {
        if (destId !== routerId) {
            const row = document.createElement('tr');
            
            const cellDest = document.createElement('td');
            cellDest.textContent = destId;
            
            const cellNext = document.createElement('td');
            cellNext.textContent = router.nextHop[destId] || '-';
            
            const cellCost = document.createElement('td');
            const cost = router.distanceVector[destId];
            if (cost === Infinity) {
                cellCost.textContent = '∞';
                cellCost.className = 'infinity';
            } else {
                cellCost.textContent = cost;
            }
            
            row.appendChild(cellDest);
            row.appendChild(cellNext);
            row.appendChild(cellCost);
            table.appendChild(row);
        }
    }

    container.appendChild(table);
    return container;
}

// Function to update all routing tables in the status panel
function updateAllRoutingTables() {
    allRoutingTables.innerHTML = '';
    
    // Sort router IDs for consistent display
    const routerIds = Object.keys(routers).sort((a, b) => parseInt(a) - parseInt(b));
    
    for (const routerId of routerIds) {
        const table = createStatusRoutingTable(routerId);
        if (table) {
            allRoutingTables.appendChild(table);
        }
    }
} 