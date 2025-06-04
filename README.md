# Route Planning System Using Graphs and Shortest Path Algorithms

A lightweight application for Speedy Deliveries Inc. to optimize local delivery routes by modeling locations as a graph and finding the shortest paths.

## Features

- **Graph Representation**: Dynamic visualization of cities/locations as a weighted graph
- **Graph Operations**: Add/remove nodes and edges, update edge weights
- **Shortest Path Algorithms**: 
  - Dijkstra's Algorithm for weighted shortest paths
  - Breadth-First Search (BFS) for unweighted pathfinding
- **Visual Interface**: Interactive graph with highlighted paths and detailed results

## Prerequisites

- Python 3.7+ with pip
- Modern web browser (Chrome, Firefox, Edge, etc.)

## Installation

1. Clone this repository
2. Install the required Python packages:

```bash
pip install flask flask-cors
```

## Running the Application

1. Start the backend server:

```bash
python app.py
```

This will start the Flask server on http://localhost:5000

2. Open `index.html` in your web browser

You can simply double-click the file or open it through your browser's File menu.

## Usage

### Adding Locations (Nodes)

1. Enter a location name (e.g., "A", "New York")
2. Specify X and Y coordinates (or click directly on the canvas to auto-fill)
3. Click "Add Location"

### Adding Routes (Edges)

1. Select start and end locations from the dropdowns
2. Enter the distance (weight) between them
3. Click "Add Route"

### Finding Shortest Paths

1. Select start and end locations
2. Choose the algorithm (Dijkstra or BFS)
3. Click "Find Path"
4. The shortest path will be highlighted in red on the graph, and details will be displayed

### Other Operations

- **Remove Location**: Select a location and click "Remove Location"
- **Remove Route**: Select two connected locations and click "Remove Route"
- **Update Route**: Select two connected locations, enter a new distance, and click "Update Route"

## Project Structure

- `index.html`: Frontend interface
- `styles.css`: CSS styling for the application
- `script.js`: Frontend JavaScript for graph visualization and API calls
- `app.py`: Backend Python server with graph algorithms

## Example

The application comes pre-loaded with a sample graph of 5 locations (A, B, C, D, E) with various connections between them to demonstrate the functionality. 