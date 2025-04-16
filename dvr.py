import networkx as nx
import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation
import random

# Get user-defined topology
def get_topology_input():
    nodes_dict = {}
    link_costs = {}

    num_nodes = int(input("Enter number of nodes: "))
    print("\nEnter names of nodes (e.g., A B C):")
    node_names = input().split()
    if len(node_names) != num_nodes:
        print("Error: Number of node names must match the number of nodes.")
        exit()

    for name in node_names:
        nodes_dict[name] = []

    num_links = int(input("\nEnter number of links: "))
    print("Enter link details in the format: <Node1> <Node2> <Cost>")
    for _ in range(num_links):
        u, v, cost = input().split()
        cost = int(cost)
        nodes_dict[u].append(v)
        nodes_dict[v].append(u)
        link_costs[(u, v)] = cost  # handle undirected in get_link_cost()

    return nodes_dict, link_costs

# Get topology input from user
nodes_dict, link_costs = get_topology_input()

# Helper function to get link cost (handles both directions)
def get_link_cost(node1, node2, link_costs):
    if (node1, node2) in link_costs:
        return link_costs[(node1, node2)]
    elif (node2, node1) in link_costs:
        return link_costs[(node2, node1)]
    else:
        return float('inf')

# Define the Node class for each router
class Node:
    def __init__(self, node_id, neighbors, link_costs):
        self.id = node_id
        self.neighbors = neighbors
        self.distance_vector = {node: float('inf') for node in nodes_dict.keys()}
        self.distance_vector[self.id] = 0
        self.next_hop = {node: None for node in nodes_dict.keys()}
        self.updated_in_iteration = False

        for neighbor in self.neighbors:
            cost = get_link_cost(self.id, neighbor, link_costs)
            if cost != float('inf'):
                self.distance_vector[neighbor] = cost
                self.next_hop[neighbor] = neighbor

    def update_distance_vector(self, received_vectors):
        updated = False
        for neighbor in self.neighbors:
            if neighbor in received_vectors:
                neighbor_vector = received_vectors[neighbor]
                link_cost = get_link_cost(self.id, neighbor, link_costs)
                for dest in self.distance_vector:
                    if dest != self.id:
                        new_cost = link_cost + neighbor_vector.get(dest, float('inf'))
                        if new_cost < self.distance_vector[dest]:
                            self.distance_vector[dest] = new_cost
                            self.next_hop[dest] = neighbor
                            updated = True
                            self.updated_in_iteration = True
        return updated

# Create nodes
nodes = {nid: Node(nid, neighbors, link_costs) for nid, neighbors in nodes_dict.items()}
node_order = list(nodes_dict.keys())

# Visualization setup
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 7))
G = nx.Graph(nodes_dict)
pos = nx.spring_layout(G, seed=42)

for u, v in G.edges():
    G[u][v]['weight'] = get_link_cost(u, v, link_costs)

def display_routing_tables(ax, nodes, active_node=None):
    ax.clear()
    ax.axis('off')
    table_text = "CURRENT ROUTING TABLES:\n\n"
    for node_id in node_order:
        node = nodes[node_id]
        if node_id == active_node:
            table_text += f">>> Node {node_id} (UPDATING) <<<\n"
        else:
            table_text += f"Node {node_id}:\n"
        table_text += "Dest | Next | Cost\n"
        table_text += "-----|------|-----\n"
        for dest in sorted(node.distance_vector.keys()):
            if dest != node_id:
                cost = node.distance_vector[dest]
                next_hop = node.next_hop[dest]
                cost_str = str(int(cost)) if cost != float('inf') else "∞"
                next_hop_str = next_hop if next_hop else "-"
                table_text += f" {dest}   |  {next_hop_str}   | {cost_str}\n"
        table_text += "\n"
    ax.text(0, 1, table_text, va='top', ha='left', fontfamily='monospace')

iteration = 0
converged = False
max_iterations = 20
max_frames = max_iterations * len(node_order)
stable_iterations = 0
total_updated = False

def update(frame):
    global iteration, converged, total_updated, stable_iterations

    if converged:
        return

    ax1.clear()
    node_index = frame % len(node_order)
    current_node_id = node_order[node_index]
    current_node = nodes[current_node_id]

    if node_index == 0:
        for node in nodes.values():
            node.updated_in_iteration = False
        if frame > 0:
            if not total_updated:
                stable_iterations += 1
                if stable_iterations >= 2:
                    converged = True
                    ax1.set_title(f"Distance Vector Routing (Converged after {iteration} iterations)")
                    display_routing_tables(ax2, nodes)
                    return
            else:
                stable_iterations = 0
        iteration += 1
        total_updated = False

    received_vectors = {nid: nodes[nid].distance_vector.copy() for nid in current_node.neighbors}
    updated = current_node.update_distance_vector(received_vectors)
    if updated:
        total_updated = True

    edge_labels = {(u, v): G[u][v]['weight'] for u, v in G.edges()}
    node_colors = []
    for n in G.nodes():
        if n == current_node_id:
            node_colors.append('red')
        elif nodes[n].updated_in_iteration:
            node_colors.append('orange')
        else:
            node_colors.append('lightblue')

    nx.draw(G, pos, ax=ax1, with_labels=True, node_color=node_colors,
            node_size=500, font_weight='bold')
    nx.draw_networkx_edge_labels(G, pos, edge_labels=edge_labels, ax=ax1)

    if current_node_id:
        for dest, next_hop in current_node.next_hop.items():
            if next_hop and dest != current_node_id:
                edge_color = 'green' if current_node.distance_vector[dest] < float('inf') else 'gray'
                nx.draw_networkx_edges(G, pos, edgelist=[(current_node_id, next_hop)],
                                      edge_color=edge_color, width=2, arrows=True,
                                      arrowstyle='->', arrowsize=15, ax=ax1)

    display_routing_tables(ax2, nodes, active_node=current_node_id)
    status = f" (Stabilizing: {stable_iterations}/2)" if stable_iterations > 0 else ""
    ax1.set_title(f"Distance Vector Routing - Iteration {iteration}, Node {current_node_id}{status}")

ani = FuncAnimation(fig, update, frames=max_frames, interval=800, repeat=False, blit=False)
plt.tight_layout()
plt.show()

print("\nFinal Routing Tables:")
for node_id in node_order:
    node = nodes[node_id]
    print(f"Node {node_id}:")
    for dest in sorted(node.distance_vector.keys()):
        if dest != node_id:
            print(f"  To {dest}: Next hop = {node.next_hop[dest]}, Cost = {node.distance_vector[dest]}")
    print()
