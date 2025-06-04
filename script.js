// DOM Elements
const canvas = document.getElementById('graph-canvas');
const ctx = canvas.getContext('2d');

// Dropdown Elements
const edgeStartSelect = document.getElementById('edge-start');
const edgeEndSelect = document.getElementById('edge-end');
const removeNodeSelect = document.getElementById('remove-node');
const removeEdgeStartSelect = document.getElementById('remove-edge-start');
const removeEdgeEndSelect = document.getElementById('remove-edge-end');
const updateEdgeStartSelect = document.getElementById('update-edge-start');
const updateEdgeEndSelect = document.getElementById('update-edge-end');
const pathStartSelect = document.getElementById('path-start');
const pathEndSelect = document.getElementById('path-end');

// Button Elements
const addNodeBtn = document.getElementById('add-node-btn');
const addEdgeBtn = document.getElementById('add-edge-btn');
const removeNodeBtn = document.getElementById('remove-node-btn');
const removeEdgeBtn = document.getElementById('remove-edge-btn');
const updateEdgeBtn = document.getElementById('update-edge-btn');
const findPathBtn = document.getElementById('find-path-btn');

// Input Elements
const nodeNameInput = document.getElementById('node-name');
const nodeXInput = document.getElementById('node-x');
const nodeYInput = document.getElementById('node-y');
const edgeWeightInput = document.getElementById('edge-weight');
const updateEdgeWeightInput = document.getElementById('update-edge-weight');
const algorithmSelect = document.getElementById('algorithm');
const pathResultDiv = document.getElementById('path-result');

// Graph data
let nodes = {};
let edges = {};
let selectedPath = [];

// Dragging state
let isDragging = false;
let draggedNode = null;
let lastMousePos = { x: 0, y: 0 };

// API base URL
const API_URL = 'http://localhost:5000';

// Graph layout and rendering settings
const graphSettings = {
    nodeRadius: 25,        // Larger node radius for better visibility
    nodeFontSize: 14,      // Font size for node labels
    edgeFontSize: 14,      // Font size for edge weights
    lineWidth: 2,          // Default line width
    selectedLineWidth: 4,  // Line width for selected paths
    padding: 50,           // Padding around the graph
    scaleToFit: true,      // Whether to scale the graph to fit the canvas
    animationSpeed: 300,   // Animation speed in ms
    defaultColor: '#3498db',      // Default node color
    selectedColor: '#e74c3c',     // Color for selected nodes/edges
    edgeColor: '#95a5a6',         // Default edge color
    fontFamily: 'Segoe UI, sans-serif' // Font family for all text
};

// Auto-scaling properties
let scaleFactor = 1;
let offsetX = 0;
let offsetY = 0;
let graphBounds = { minX: 0, minY: 0, maxX: 0, maxY: 0 };

// Canvas setup
function setupCanvas() {
    // Set physical canvas size to match display size for crisp rendering
    const container = canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    
    // Set display size (css pixels)
    const rect = container.getBoundingClientRect();
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    
    // Set actual canvas size in pixels (higher resolution)
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    // Scale the context to ensure correct drawing operations
    ctx.scale(dpr, dpr);
    
    // Set default text attributes for crisp rendering
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.font = `${graphSettings.nodeFontSize}px ${graphSettings.fontFamily}`;
    
    // Update on window resize
    window.addEventListener('resize', () => {
        const rect = container.getBoundingClientRect();
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        drawGraph();
    });
}

// Calculate graph boundaries and set scale/offset for centering
function updateGraphBounds() {
    if (Object.keys(nodes).length === 0) return;
    
    // Find min/max coordinates
    graphBounds = {
        minX: Infinity,
        minY: Infinity,
        maxX: -Infinity,
        maxY: -Infinity
    };
    
    for (const [_, position] of Object.entries(nodes)) {
        graphBounds.minX = Math.min(graphBounds.minX, position.x);
        graphBounds.minY = Math.min(graphBounds.minY, position.y);
        graphBounds.maxX = Math.max(graphBounds.maxX, position.x);
        graphBounds.maxY = Math.max(graphBounds.maxY, position.y);
    }
    
    // Add padding and node radius to bounds
    const padding = graphSettings.padding + graphSettings.nodeRadius;
    graphBounds.minX -= padding;
    graphBounds.minY -= padding;
    graphBounds.maxX += padding;
    graphBounds.maxY += padding;
    
    // Calculate the graph dimensions
    const graphWidth = graphBounds.maxX - graphBounds.minX;
    const graphHeight = graphBounds.maxY - graphBounds.minY;
    
    // Calculate how much we need to scale
    const canvasWidth = parseInt(canvas.style.width);
    const canvasHeight = parseInt(canvas.style.height);
    
    const scaleX = canvasWidth / graphWidth;
    const scaleY = canvasHeight / graphHeight;
    
    // Use the smaller scale factor to ensure everything fits
    scaleFactor = Math.min(scaleX, scaleY, 1.5); // Cap scale factor at 1.5 to prevent excessive scaling
    
    // Calculate offsets to center the graph
    offsetX = (canvasWidth - graphWidth * scaleFactor) / 2 - graphBounds.minX * scaleFactor;
    offsetY = (canvasHeight - graphHeight * scaleFactor) / 2 - graphBounds.minY * scaleFactor;
}

// Transform a point from graph coordinates to canvas coordinates
function transformPoint(x, y) {
    return {
        x: x * scaleFactor + offsetX,
        y: y * scaleFactor + offsetY
    };
}

// Transform a point from canvas coordinates to graph coordinates
function inverseTransformPoint(canvasX, canvasY) {
    return {
        x: (canvasX - offsetX) / scaleFactor,
        y: (canvasY - offsetY) / scaleFactor
    };
}

// Check if a point is inside a node
function isPointInNode(x, y, nodeName) {
    const node = nodes[nodeName];
    if (!node) return false;
    
    const nodeCanvas = transformPoint(node.x, node.y);
    const distance = Math.sqrt(
        Math.pow(x - nodeCanvas.x, 2) + 
        Math.pow(y - nodeCanvas.y, 2)
    );
    
    return distance <= graphSettings.nodeRadius;
}

// Find the node under a point
function findNodeUnderPoint(x, y) {
    for (const nodeName in nodes) {
        if (isPointInNode(x, y, nodeName)) {
            return nodeName;
        }
    }
    return null;
}

// Draw the graph
function drawGraph() {
    // Clear canvas
    const canvasWidth = parseInt(canvas.style.width);
    const canvasHeight = parseInt(canvas.style.height);
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    // Update bounds and scaling for auto-centering
    updateGraphBounds();
    
    // If no nodes, show a message
    if (Object.keys(nodes).length === 0) {
        ctx.font = `16px ${graphSettings.fontFamily}`;
        ctx.fillStyle = '#95a5a6';
        ctx.fillText('Add locations to start building your graph', canvasWidth/2, canvasHeight/2);
        return;
    }
    
    // Draw edges
    for (const [fromNode, connections] of Object.entries(edges)) {
        for (const [toNode, weight] of Object.entries(connections)) {
            drawEdge(fromNode, toNode, weight);
        }
    }
    
    // Draw nodes
    for (const [name, position] of Object.entries(nodes)) {
        drawNode(name, position.x, position.y);
    }
}

// Draw a node
function drawNode(name, x, y) {
    const isInPath = selectedPath.includes(name);
    
    // Transform coordinates
    const point = transformPoint(x, y);
    const radius = graphSettings.nodeRadius;
    
    // Draw node circle with shadow
    ctx.beginPath();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 3;
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = isInPath ? graphSettings.selectedColor : graphSettings.defaultColor;
    ctx.fill();
    
    // Reset shadow for text
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    // Draw text with slight shadow for readability
    ctx.font = `bold ${graphSettings.nodeFontSize}px ${graphSettings.fontFamily}`;
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Add a subtle text shadow for better visibility
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 2;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 1;
    
    ctx.fillText(name, point.x, point.y);
    
    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
}

// Draw an edge
function drawEdge(fromNode, toNode, weight) {
    const from = nodes[fromNode];
    const to = nodes[toNode];
    
    if (!from || !to) return;
    
    const isInPath = selectedPath.includes(fromNode) && 
                     selectedPath.includes(toNode) && 
                     isConsecutiveInPath(fromNode, toNode);
    
    // Transform coordinates
    const fromPoint = transformPoint(from.x, from.y);
    const toPoint = transformPoint(to.x, to.y);
    
    // Calculate direction vector
    const dx = toPoint.x - fromPoint.x;
    const dy = toPoint.y - fromPoint.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    // Normalize direction vector
    const ndx = dx / length;
    const ndy = dy / length;
    
    // Adjust start and end points to be on the circle edge
    const radius = graphSettings.nodeRadius;
    const startX = fromPoint.x + ndx * radius;
    const startY = fromPoint.y + ndy * radius;
    const endX = toPoint.x - ndx * radius;
    const endY = toPoint.y - ndy * radius;
    
    // Draw the line with antialiasing
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = isInPath ? graphSettings.selectedColor : graphSettings.edgeColor;
    ctx.lineWidth = isInPath ? graphSettings.selectedLineWidth : graphSettings.lineWidth;
    ctx.stroke();
    
    // Calculate midpoint for weight label
    const midX = (fromPoint.x + toPoint.x) / 2;
    const midY = (fromPoint.y + toPoint.y) / 2;
    
    // Create a background for the weight label
    ctx.font = `bold ${graphSettings.edgeFontSize}px ${graphSettings.fontFamily}`;
    const textWidth = ctx.measureText(weight).width;
    
    // Draw a rounded rectangle background
    const bgPadding = 6;
    const bgWidth = textWidth + bgPadding * 2;
    const bgHeight = graphSettings.edgeFontSize + bgPadding * 2;
    const cornerRadius = 4;
    
    // Save context for clip path
    ctx.save();
    
    // Create rounded rectangle clip path
    ctx.beginPath();
    ctx.moveTo(midX - bgWidth/2 + cornerRadius, midY - bgHeight/2);
    ctx.lineTo(midX + bgWidth/2 - cornerRadius, midY - bgHeight/2);
    ctx.arcTo(midX + bgWidth/2, midY - bgHeight/2, midX + bgWidth/2, midY - bgHeight/2 + cornerRadius, cornerRadius);
    ctx.lineTo(midX + bgWidth/2, midY + bgHeight/2 - cornerRadius);
    ctx.arcTo(midX + bgWidth/2, midY + bgHeight/2, midX + bgWidth/2 - cornerRadius, midY + bgHeight/2, cornerRadius);
    ctx.lineTo(midX - bgWidth/2 + cornerRadius, midY + bgHeight/2);
    ctx.arcTo(midX - bgWidth/2, midY + bgHeight/2, midX - bgWidth/2, midY + bgHeight/2 - cornerRadius, cornerRadius);
    ctx.lineTo(midX - bgWidth/2, midY - bgHeight/2 + cornerRadius);
    ctx.arcTo(midX - bgWidth/2, midY - bgHeight/2, midX - bgWidth/2 + cornerRadius, midY - bgHeight/2, cornerRadius);
    ctx.closePath();
    
    // Draw the background with shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 1;
    ctx.fillStyle = 'white';
    ctx.fill();
    
    // Reset shadow for text
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    
    // Draw the weight text
    ctx.fillStyle = isInPath ? graphSettings.selectedColor : '#2c3e50';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(weight, midX, midY);
    
    // Restore context
    ctx.restore();
}

// Check if two nodes are consecutive in the selected path
function isConsecutiveInPath(node1, node2) {
    for (let i = 0; i < selectedPath.length - 1; i++) {
        if ((selectedPath[i] === node1 && selectedPath[i+1] === node2) ||
            (selectedPath[i] === node2 && selectedPath[i+1] === node1)) {
            return true;
        }
    }
    return false;
}

// Update all dropdown options
function updateDropdowns() {
    const nodeNames = Object.keys(nodes);
    
    // Clear all dropdowns
    [edgeStartSelect, edgeEndSelect, removeNodeSelect, 
     removeEdgeStartSelect, removeEdgeEndSelect, 
     updateEdgeStartSelect, updateEdgeEndSelect,
     pathStartSelect, pathEndSelect].forEach(select => {
        select.innerHTML = '';
    });
    
    // Add default empty option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select a location';
    
    // Populate node dropdowns
    nodeNames.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        
        edgeStartSelect.appendChild(option.cloneNode(true));
        edgeEndSelect.appendChild(option.cloneNode(true));
        removeNodeSelect.appendChild(option.cloneNode(true));
        removeEdgeStartSelect.appendChild(option.cloneNode(true));
        removeEdgeEndSelect.appendChild(option.cloneNode(true));
        updateEdgeStartSelect.appendChild(option.cloneNode(true));
        updateEdgeEndSelect.appendChild(option.cloneNode(true));
        pathStartSelect.appendChild(option.cloneNode(true));
        pathEndSelect.appendChild(option.cloneNode(true));
    });
}

// Add a new node
async function addNode() {
    const name = nodeNameInput.value.trim();
    const x = parseInt(nodeXInput.value);
    const y = parseInt(nodeYInput.value);
    
    if (!name || isNaN(x) || isNaN(y)) {
        alert('Please provide a valid name and position for the location.');
        return;
    }
    
    if (nodes[name]) {
        alert(`Location "${name}" already exists.`);
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/add_node`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, x, y })
        });
        
        const data = await response.json();
        
        if (data.success) {
            nodes[name] = { x, y };
            updateDropdowns();
            drawGraph();
            nodeNameInput.value = '';
            nodeXInput.value = '';
            nodeYInput.value = '';
        } else {
            alert(`Error: ${data.message}`);
        }
    } catch (error) {
        console.error('Error adding node:', error);
        alert('Failed to add location. Please check console for details.');
    }
}

// Initialize the application
function init() {
    setupCanvas();
    
    // Event listeners for UI controls
    addNodeBtn.addEventListener('click', addNode);
    addEdgeBtn.addEventListener('click', addEdge);
    removeNodeBtn.addEventListener('click', removeNode);
    removeEdgeBtn.addEventListener('click', removeEdge);
    updateEdgeBtn.addEventListener('click', updateEdge);
    findPathBtn.addEventListener('click', findPath);
    
    // Canvas click event for adding nodes
    canvas.addEventListener('click', handleCanvasClick);
    
    // Mouse events for dragging nodes
    canvas.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    // Optional: Add these to handle cursor appearance when hovering over nodes
    canvas.addEventListener('mousemove', handleHover);
    
    // Load sample data for testing
    loadSampleData();
}

// Start the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', init);

// Calculate Euclidean distance between two points
function calculateDistance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

// Update edge weights based on node positions
function updateEdgeWeights() {
    // For each edge, recalculate the weight based on Euclidean distance
    for (const fromNode in edges) {
        for (const toNode in edges[fromNode]) {
            if (nodes[fromNode] && nodes[toNode]) {
                // Calculate the Euclidean distance
                const distance = calculateDistance(
                    nodes[fromNode].x, nodes[fromNode].y,
                    nodes[toNode].x, nodes[toNode].y
                );
                
                // Update the edge weight (rounded to nearest integer)
                const weight = Math.round(distance / 10); // Scale down for better usability
                edges[fromNode][toNode] = weight;
                edges[toNode][fromNode] = weight; // Update both directions
            }
        }
    }
}

// Handle mouse down event
function handleMouseDown(e) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Check if we clicked on a node
    const nodeName = findNodeUnderPoint(mouseX, mouseY);
    
    if (nodeName) {
        // Start dragging
        isDragging = true;
        draggedNode = nodeName;
        lastMousePos = { x: mouseX, y: mouseY };
        
        // Change cursor to indicate dragging
        canvas.style.cursor = 'grabbing';
        
        // Prevent default behavior (like text selection)
        e.preventDefault();
    }
}

// Handle mouse move event
function handleMouseMove(e) {
    if (!isDragging || !draggedNode) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Calculate the mouse movement delta
    const deltaX = mouseX - lastMousePos.x;
    const deltaY = mouseY - lastMousePos.y;
    
    // Convert delta to graph coordinates
    const scaledDeltaX = deltaX / scaleFactor;
    const scaledDeltaY = deltaY / scaleFactor;
    
    // Update the node position
    nodes[draggedNode].x += scaledDeltaX;
    nodes[draggedNode].y += scaledDeltaY;
    
    // Update edge weights
    updateEdgeWeights();
    
    // Update last mouse position
    lastMousePos = { x: mouseX, y: mouseY };
    
    // Redraw the graph
    drawGraph();
}

// Handle mouse up event
function handleMouseUp(e) {
    if (isDragging && draggedNode) {
        // Stop dragging
        isDragging = false;
        
        // Send the updated node position to the server
        updateNodePosition(draggedNode, nodes[draggedNode].x, nodes[draggedNode].y);
        
        // Update all edges connected to this node
        updateConnectedEdges(draggedNode);
        
        // Reset cursor
        canvas.style.cursor = 'default';
        
        // Reset dragged node
        draggedNode = null;
    }
}

// Update node position on the server
async function updateNodePosition(nodeName, x, y) {
    try {
        const response = await fetch(`${API_URL}/update_node_position`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: nodeName, x, y })
        });
        
        const data = await response.json();
        
        if (!data.success) {
            console.error('Failed to update node position:', data.message);
        }
    } catch (error) {
        console.error('Error updating node position:', error);
    }
}

// Update all edges connected to a node
async function updateConnectedEdges(nodeName) {
    if (!edges[nodeName]) return;
    
    for (const connectedNode in edges[nodeName]) {
        const weight = edges[nodeName][connectedNode];
        
        try {
            const response = await fetch(`${API_URL}/update_edge`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    from_node: nodeName, 
                    to_node: connectedNode, 
                    weight 
                })
            });
            
            const data = await response.json();
            
            if (!data.success) {
                console.error('Failed to update edge:', data.message);
            }
        } catch (error) {
            console.error('Error updating edge:', error);
        }
    }
}

// Handle hover over nodes
function handleHover(e) {
    // Only process if not dragging
    if (isDragging) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Check if hovering over a node
    const nodeName = findNodeUnderPoint(mouseX, mouseY);
    
    if (nodeName) {
        // Change cursor to indicate the node can be dragged
        canvas.style.cursor = 'grab';
    } else {
        // Reset cursor
        canvas.style.cursor = 'default';
    }
}

// Modified canvas click handler to not interfere with dragging
function handleCanvasClick(e) {
    // Skip if we were dragging
    if (isDragging || draggedNode) return;
    
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    // If we have scaling active, convert canvas coordinates back to graph coordinates
    if (scaleFactor !== 1 || offsetX !== 0 || offsetY !== 0) {
        // Inverse transform to get graph coordinates
        const graphX = Math.round((clickX - offsetX) / scaleFactor);
        const graphY = Math.round((clickY - offsetY) / scaleFactor);
        
        nodeXInput.value = graphX;
        nodeYInput.value = graphY;
    } else {
        // No scaling, use raw coordinates
        nodeXInput.value = Math.round(clickX);
        nodeYInput.value = Math.round(clickY);
    }
}

// Add a new edge
async function addEdge() {
    const fromNode = edgeStartSelect.value;
    const toNode = edgeEndSelect.value;
    const weight = parseInt(edgeWeightInput.value);
    
    if (!fromNode || !toNode || isNaN(weight) || weight <= 0) {
        alert('Please select both locations and enter a positive distance.');
        return;
    }
    
    if (fromNode === toNode) {
        alert('Cannot create a route from a location to itself.');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/add_edge`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ from_node: fromNode, to_node: toNode, weight })
        });
        
        const data = await response.json();
        
        if (data.success) {
            if (!edges[fromNode]) edges[fromNode] = {};
            if (!edges[toNode]) edges[toNode] = {};
            
            edges[fromNode][toNode] = weight;
            edges[toNode][fromNode] = weight; // Make it an undirected graph
            
            drawGraph();
            edgeWeightInput.value = '';
        } else {
            alert(`Error: ${data.message}`);
        }
    } catch (error) {
        console.error('Error adding edge:', error);
        alert('Failed to add route. Please check console for details.');
    }
}

// Remove a node
async function removeNode() {
    const nodeName = removeNodeSelect.value;
    
    if (!nodeName) {
        alert('Please select a location to remove.');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/remove_node`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: nodeName })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Remove the node
            delete nodes[nodeName];
            
            // Remove all edges connected to this node
            for (const from in edges) {
                if (from === nodeName) {
                    delete edges[from];
                } else {
                    delete edges[from][nodeName];
                }
            }
            
            updateDropdowns();
            drawGraph();
        } else {
            alert(`Error: ${data.message}`);
        }
    } catch (error) {
        console.error('Error removing node:', error);
        alert('Failed to remove location. Please check console for details.');
    }
}

// Remove an edge
async function removeEdge() {
    const fromNode = removeEdgeStartSelect.value;
    const toNode = removeEdgeEndSelect.value;
    
    if (!fromNode || !toNode) {
        alert('Please select both locations to remove the route between them.');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/remove_edge`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ from_node: fromNode, to_node: toNode })
        });
        
        const data = await response.json();
        
        if (data.success) {
            if (edges[fromNode]) delete edges[fromNode][toNode];
            if (edges[toNode]) delete edges[toNode][fromNode];
            
            drawGraph();
        } else {
            alert(`Error: ${data.message}`);
        }
    } catch (error) {
        console.error('Error removing edge:', error);
        alert('Failed to remove route. Please check console for details.');
    }
}

// Update an edge
async function updateEdge() {
    const fromNode = updateEdgeStartSelect.value;
    const toNode = updateEdgeEndSelect.value;
    const weight = parseInt(updateEdgeWeightInput.value);
    
    if (!fromNode || !toNode || isNaN(weight) || weight <= 0) {
        alert('Please select both locations and enter a positive distance.');
        return;
    }
    
    if (!(edges[fromNode] && edges[fromNode][toNode])) {
        alert('No route exists between these locations. Add a new route instead.');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/update_edge`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ from_node: fromNode, to_node: toNode, weight })
        });
        
        const data = await response.json();
        
        if (data.success) {
            edges[fromNode][toNode] = weight;
            edges[toNode][fromNode] = weight;
            
            drawGraph();
            updateEdgeWeightInput.value = '';
        } else {
            alert(`Error: ${data.message}`);
        }
    } catch (error) {
        console.error('Error updating edge:', error);
        alert('Failed to update route. Please check console for details.');
    }
}

// Find the shortest path
async function findPath() {
    const startNode = pathStartSelect.value;
    const endNode = pathEndSelect.value;
    const algorithm = algorithmSelect.value;
    
    if (!startNode || !endNode) {
        alert('Please select both start and end locations.');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/find_path`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                start_node: startNode, 
                end_node: endNode,
                algorithm: algorithm
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            selectedPath = data.path;
            
            // Display the result
            if (data.path.length > 0) {
                const pathStr = data.path.join(' → ');
                const weightStr = algorithm === 'dijkstra' ? 
                    `Total distance: ${data.distance}` : 
                    `Number of hops: ${data.path.length - 1}`;
                
                pathResultDiv.innerHTML = `<strong>Path:</strong> ${pathStr}<br><strong>${weightStr}</strong>`;
            } else {
                pathResultDiv.textContent = 'No path found between the selected locations.';
            }
            
            drawGraph();
        } else {
            alert(`Error: ${data.message}`);
        }
    } catch (error) {
        console.error('Error finding path:', error);
        alert('Failed to find path. Please check console for details.');
    }
}

// Populate the graph with sample data
function loadSampleData() {
    // Sample nodes - with a better layout
    nodes = {
        'A': { x: 50, y: 150 },
        'B': { x: 200, y: 50 },
        'C': { x: 350, y: 200 },
        'D': { x: 150, y: 300 },
        'E': { x: 400, y: 100 }
    };
    
    // Sample edges
    edges = {
        'A': { 'B': 5, 'D': 8 },
        'B': { 'A': 5, 'C': 6, 'E': 12 },
        'C': { 'B': 6, 'E': 4, 'D': 3 },
        'D': { 'A': 8, 'C': 3 },
        'E': { 'B': 12, 'C': 4 }
    };
    
    updateDropdowns();
    drawGraph();
}

// Add dialog functionality

// Get the modal elements
const dijkstraDialog = document.getElementById('dijkstra-dialog');
const bfsDialog = document.getElementById('bfs-dialog');

// Get the buttons that open the dialogs
const dijkstraInfoBtn = document.getElementById('dijkstra-info-btn');
const bfsInfoBtn = document.getElementById('bfs-info-btn');

// Get the close buttons
const closeButtons = document.querySelectorAll('.close-btn');

// Function to open a modal dialog
function openModal(modal) {
    modal.style.display = 'block';
    // Prevent scrolling on the body
    document.body.style.overflow = 'hidden';
}

// Function to close a modal dialog
function closeModal(modal) {
    modal.style.display = 'none';
    // Restore scrolling on the body
    document.body.style.overflow = 'hidden'; // Keep overflow hidden for main app
}

// Event listeners for opening dialogs
dijkstraInfoBtn.addEventListener('click', () => openModal(dijkstraDialog));
bfsInfoBtn.addEventListener('click', () => openModal(bfsDialog));

// Event listeners for closing dialogs
closeButtons.forEach(button => {
    button.addEventListener('click', function() {
        const modal = this.closest('.modal');
        closeModal(modal);
    });
});

// Close the modal when clicking outside of it
window.addEventListener('click', function(event) {
    if (event.target === dijkstraDialog) {
        closeModal(dijkstraDialog);
    } else if (event.target === bfsDialog) {
        closeModal(bfsDialog);
    }
});

// Close modals when ESC key is pressed
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeModal(dijkstraDialog);
        closeModal(bfsDialog);
    }
}); 