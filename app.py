from flask import Flask, request, jsonify
from flask_cors import CORS
import heapq
from collections import deque

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# In-memory graph storage
graph = {
    'nodes': {},  # Format: { 'A': {'x': 100, 'y': 100}, 'B': {'x': 200, 'y': 150}, ... }
    'edges': {}   # Format: { 'A': {'B': 5, 'C': 10}, 'B': {'A': 5, 'D': 8}, ... }
}

# Route to add a node
@app.route('/add_node', methods=['POST'])
def add_node():
    data = request.json
    name = data.get('name')
    x = data.get('x')
    y = data.get('y')
    
    if not name or x is None or y is None:
        return jsonify({'success': False, 'message': 'Missing required parameters'}), 400
    
    if name in graph['nodes']:
        return jsonify({'success': False, 'message': f'Node {name} already exists'}), 400
    
    graph['nodes'][name] = {'x': x, 'y': y}
    graph['edges'][name] = {}
    
    return jsonify({'success': True})

# Route to add an edge
@app.route('/add_edge', methods=['POST'])
def add_edge():
    data = request.json
    from_node = data.get('from_node')
    to_node = data.get('to_node')
    weight = data.get('weight')
    
    if not from_node or not to_node or weight is None:
        return jsonify({'success': False, 'message': 'Missing required parameters'}), 400
    
    if from_node not in graph['nodes'] or to_node not in graph['nodes']:
        return jsonify({'success': False, 'message': 'One or both nodes do not exist'}), 400
    
    # Add edge in both directions (undirected graph)
    graph['edges'][from_node][to_node] = weight
    graph['edges'][to_node][from_node] = weight
    
    return jsonify({'success': True})

# Route to remove a node
@app.route('/remove_node', methods=['POST'])
def remove_node():
    data = request.json
    name = data.get('name')
    
    if not name:
        return jsonify({'success': False, 'message': 'Missing node name'}), 400
    
    if name not in graph['nodes']:
        return jsonify({'success': False, 'message': f'Node {name} does not exist'}), 400
    
    # Remove the node
    del graph['nodes'][name]
    del graph['edges'][name]
    
    # Remove all edges connected to this node
    for node in graph['edges']:
        if name in graph['edges'][node]:
            del graph['edges'][node][name]
    
    return jsonify({'success': True})

# Route to remove an edge
@app.route('/remove_edge', methods=['POST'])
def remove_edge():
    data = request.json
    from_node = data.get('from_node')
    to_node = data.get('to_node')
    
    if not from_node or not to_node:
        return jsonify({'success': False, 'message': 'Missing required parameters'}), 400
    
    if from_node not in graph['edges'] or to_node not in graph['edges']:
        return jsonify({'success': False, 'message': 'One or both nodes do not exist'}), 400
    
    if to_node not in graph['edges'][from_node]:
        return jsonify({'success': False, 'message': 'Edge does not exist'}), 400
    
    # Remove edge in both directions
    del graph['edges'][from_node][to_node]
    del graph['edges'][to_node][from_node]
    
    return jsonify({'success': True})

# Route to update an edge
@app.route('/update_edge', methods=['POST'])
def update_edge():
    data = request.json
    from_node = data.get('from_node')
    to_node = data.get('to_node')
    weight = data.get('weight')
    
    if not from_node or not to_node or weight is None:
        return jsonify({'success': False, 'message': 'Missing required parameters'}), 400
    
    if from_node not in graph['edges'] or to_node not in graph['edges']:
        return jsonify({'success': False, 'message': 'One or both nodes do not exist'}), 400
    
    if to_node not in graph['edges'][from_node]:
        return jsonify({'success': False, 'message': 'Edge does not exist'}), 400
    
    # Update edge in both directions
    graph['edges'][from_node][to_node] = weight
    graph['edges'][to_node][from_node] = weight
    
    return jsonify({'success': True})

# Route to update a node position
@app.route('/update_node_position', methods=['POST'])
def update_node_position():
    data = request.json
    name = data.get('name')
    x = data.get('x')
    y = data.get('y')
    
    if not name or x is None or y is None:
        return jsonify({'success': False, 'message': 'Missing required parameters'}), 400
    
    if name not in graph['nodes']:
        return jsonify({'success': False, 'message': f'Node {name} does not exist'}), 400
    
    # Update the node position
    graph['nodes'][name] = {'x': x, 'y': y}
    
    return jsonify({'success': True})

# Dijkstra's Algorithm for shortest path
def dijkstra(graph, start, end):
    if start not in graph['edges'] or end not in graph['edges']:
        return [], 0
    
    # Initialize distance dictionary
    distances = {node: float('infinity') for node in graph['nodes']}
    distances[start] = 0
    
    # Priority queue for Dijkstra's
    priority_queue = [(0, start)]
    
    # Dictionary to store the previous node in the path
    previous = {node: None for node in graph['nodes']}
    
    while priority_queue:
        current_distance, current_node = heapq.heappop(priority_queue)
        
        # If we've reached the destination
        if current_node == end:
            break
        
        # If we've found a longer path, skip
        if current_distance > distances[current_node]:
            continue
        
        # Check neighbors
        for neighbor, weight in graph['edges'][current_node].items():
            distance = current_distance + weight
            
            # If we've found a shorter path to the neighbor
            if distance < distances[neighbor]:
                distances[neighbor] = distance
                previous[neighbor] = current_node
                heapq.heappush(priority_queue, (distance, neighbor))
    
    # Reconstruct path
    path = []
    current = end
    
    while current:
        path.append(current)
        current = previous[current]
    
    # Reverse path (start to end)
    path.reverse()
    
    # If no path was found, return empty list
    if path[0] != start:
        return [], 0
    
    return path, distances[end]

# Breadth-First Search for unweighted shortest path
def bfs(graph, start, end):
    if start not in graph['edges'] or end not in graph['edges']:
        return []
    
    # Queue for BFS
    queue = deque([start])
    
    # Dictionary to store the previous node in the path
    previous = {node: None for node in graph['nodes']}
    
    # Mark the start node as visited
    visited = {node: False for node in graph['nodes']}
    visited[start] = True
    
    while queue:
        current = queue.popleft()
        
        # If we've reached the destination
        if current == end:
            break
        
        # Visit all neighbors
        for neighbor in graph['edges'][current]:
            if not visited[neighbor]:
                queue.append(neighbor)
                visited[neighbor] = True
                previous[neighbor] = current
    
    # Reconstruct path
    path = []
    current = end
    
    while current:
        path.append(current)
        current = previous[current]
    
    # Reverse path (start to end)
    path.reverse()
    
    # If no path was found, return empty list
    if path[0] != start:
        return []
    
    return path

# Route to find path
@app.route('/find_path', methods=['POST'])
def find_path():
    data = request.json
    start_node = data.get('start_node')
    end_node = data.get('end_node')
    algorithm = data.get('algorithm', 'dijkstra')
    
    if not start_node or not end_node:
        return jsonify({'success': False, 'message': 'Missing required parameters'}), 400
    
    if start_node not in graph['nodes'] or end_node not in graph['nodes']:
        return jsonify({'success': False, 'message': 'One or both nodes do not exist'}), 400
    
    if algorithm == 'dijkstra':
        path, distance = dijkstra(graph, start_node, end_node)
        return jsonify({
            'success': True,
            'path': path,
            'distance': distance
        })
    elif algorithm == 'bfs':
        path = bfs(graph, start_node, end_node)
        return jsonify({
            'success': True,
            'path': path
        })
    else:
        return jsonify({'success': False, 'message': 'Invalid algorithm'}), 400

# Initialize the graph with sample data
def init_sample_data():
    # Sample nodes
    graph['nodes'] = {
        'A': {'x': 100, 'y': 100},
        'B': {'x': 300, 'y': 50},
        'C': {'x': 400, 'y': 200},
        'D': {'x': 200, 'y': 250},
        'E': {'x': 500, 'y': 100}
    }
    
    # Sample edges
    graph['edges'] = {
        'A': {'B': 5, 'D': 8},
        'B': {'A': 5, 'C': 6, 'E': 12},
        'C': {'B': 6, 'E': 4, 'D': 3},
        'D': {'A': 8, 'C': 3},
        'E': {'B': 12, 'C': 4}
    }

if __name__ == '__main__':
    init_sample_data()
    app.run(debug=True, port=5000) 