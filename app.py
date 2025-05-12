"""
Flask web server for agent visualization
"""
from flask import Flask, render_template, jsonify, request
import json
import random
import time
from collections import deque

# Import our agent implementations and grid world
from reflex_agent import SimpleReflexAgent
from model_agent import ModelBasedAgent
from utility_agent import UtilityBasedAgent
from q_learning_agent import QLearningAgent
from grid_world import GridWorld

app = Flask(__name__)

# Global variables to store the current simulation state
current_env = None
current_agent = None
simulation_running = False
step_count = 0
simulation_data = {
    'steps': [],
    'performance': [],
    'visit_counts': {}
}

def convert_dict_keys_to_str(obj):
    """Convert all dictionary tuple keys to strings to make them JSON serializable"""
    if isinstance(obj, dict):
        return {str(k): convert_dict_keys_to_str(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_dict_keys_to_str(item) for item in obj]
    else:
        return obj

def is_path_valid(grid, start, goal):
    """
    Check if there's a valid path from start to goal using BFS.
    
    Args:
        grid: 2D grid of the environment (0=empty, 1=obstacle, 2=goal)
        start: Starting position (x, y)
        goal: Goal position (x, y)
        
    Returns:
        bool: True if there is a valid path, False otherwise
    """
    width = len(grid[0])
    height = len(grid)
    visited = set()
    queue = deque([start])
    
    while queue:
        x, y = queue.popleft()
        if (x, y) == goal:
            return True
            
        if (x, y) in visited:
            continue
            
        visited.add((x, y))
        
        # Check all four directions
        for dx, dy in [(0, -1), (0, 1), (-1, 0), (1, 0)]:
            nx, ny = x + dx, y + dy
            
            if 0 <= nx < width and 0 <= ny < height and grid[ny][nx] != 1:  # Not an obstacle
                queue.append((nx, ny))
                
    return False

def is_agent_trapped(grid, pos):
    """
    Check if an agent at the given position is trapped by obstacles.
    
    Args:
        grid: 2D grid of the environment
        pos: Position to check (x, y)
        
    Returns:
        bool: True if trapped (all directions blocked), False otherwise
    """
    x, y = pos
    width = len(grid[0])
    height = len(grid)
    
    # Check all four directions
    for dx, dy in [(0, -1), (0, 1), (-1, 0), (1, 0)]:
        nx, ny = x + dy, y + dx
        if 0 <= nx < width and 0 <= ny < height and grid[ny][nx] != 1:
            return False  # At least one direction is open
            
    return True  # All directions are blocked

@app.route('/')
def index():
    """Render the main page"""
    return render_template('index.html')

@app.route('/init', methods=['POST'])
def initialize_simulation():
    """Initialize a new simulation based on agent type"""
    global current_env, current_agent, simulation_running, step_count, simulation_data
    
    # Get agent type from request
    agent_type = request.json.get('agent_type', 'reflex')
    
    # Reset simulation state
    step_count = 0
    simulation_running = False
    simulation_data = {
        'steps': [],
        'performance': [],
        'visit_counts': {}
    }
    
    # Create environment
    width = 15
    height = 8
    current_env = GridWorld(width=width, height=height, name="Web Visualization")
    
    # Define start and goal positions
    start_pos = (1, 1)
    goal_pos = (width - 2, height - 2)
    
    # Add goal
    current_env.add_goal(goal_pos)
    
    # Create a maze with guaranteed path
    create_structured_maze(current_env, start_pos, goal_pos)
    
    # Create agent based on type
    if agent_type == 'reflex':
        current_agent = create_reflex_agent()
    elif agent_type == 'model':
        current_agent = ModelBasedAgent("Explorer")
    elif agent_type == 'utility':
        current_agent = UtilityBasedAgent("Explorer", exploration_rate=0.2)
    elif agent_type == 'qlearning':
        current_agent = QLearningAgent("Q-Learner", learning_rate=0.2, discount_factor=0.9, exploration_rate=0.3)
    else:
        # Default to reflex agent
        current_agent = create_reflex_agent()
    
    # Add agent to environment at position (1, 1)
    current_env.add_agent(current_agent, start_pos)
    
    # Return initial state
    return jsonify(get_environment_state())

def create_structured_maze(env, start_pos, goal_pos):
    """
    Create a structured maze with guaranteed path to goal.
    
    Args:
        env: The GridWorld environment
        start_pos: Starting position (x, y)
        goal_pos: Goal position (x, y)
    """
    # Add outer walls
    for x in range(env.width):
        env.add_obstacle((x, 0))
        env.add_obstacle((x, env.height-1))
    for y in range(env.height):
        env.add_obstacle((0, y))
        env.add_obstacle((env.width-1, y))
    
    # Create a temporary grid to validate paths
    temp_grid = [[env.EMPTY for _ in range(env.width)] for _ in range(env.height)]
    
    # Add outer walls to the temporary grid
    for x in range(env.width):
        temp_grid[0][x] = env.OBSTACLE
        temp_grid[env.height-1][x] = env.OBSTACLE
    for y in range(env.height):
        temp_grid[y][0] = env.OBSTACLE
        temp_grid[y][env.width-1] = env.OBSTACLE
    
    # Define a safe zone around the start position
    safe_zone = [start_pos]
    sx, sy = start_pos
    for dx, dy in [(0, -1), (0, 1), (-1, 0), (1, 0)]:
        safe_pos = (sx + dx, sy + dy)
        if 0 < safe_pos[0] < env.width-1 and 0 < safe_pos[1] < env.height-1:
            safe_zone.append(safe_pos)
    
    # Calculate evenly distributed gap positions
    x_gaps = [env.width // 4, env.width // 2, 3 * env.width // 4]
    y_gaps = [env.height // 3, 2 * env.height // 3]
    
    # Add vertical walls with gaps
    wall_spacing = max(2, env.width // 5)
    for x in range(wall_spacing, env.width-wall_spacing, wall_spacing):
        # Choose a random gap from y_gaps to place in this wall
        gap_y = random.choice(y_gaps)
        
        for y in range(1, env.height-1):
            # Skip safe zone around the start position
            if (x, y) in safe_zone:
                continue
                
            if y != gap_y:
                # Check if adding this obstacle would still allow a path
                temp_grid[y][x] = env.OBSTACLE
                if is_path_valid(temp_grid, start_pos, goal_pos):
                    env.add_obstacle((x, y))
                else:
                    temp_grid[y][x] = env.EMPTY
                
    # Add horizontal walls with gaps
    wall_spacing = max(2, env.height // 4)
    for y in range(wall_spacing, env.height-wall_spacing, wall_spacing):
        # Choose a random gap from x_gaps to place in this wall
        gap_x = random.choice(x_gaps)
        
        for x in range(1, env.width-1):
            # Skip safe zone around the start position
            if (x, y) in safe_zone:
                continue
                
            if x != gap_x:
                # Check if adding this obstacle would still allow a path
                temp_grid[y][x] = env.OBSTACLE
                if is_path_valid(temp_grid, start_pos, goal_pos):
                    env.add_obstacle((x, y))
                else:
                    temp_grid[y][x] = env.EMPTY
    
    # Final check for path validity
    grid_copy = [[env.EMPTY for _ in range(env.width)] for _ in range(env.height)]
    for y in range(env.height):
        for x in range(env.width):
            grid_copy[y][x] = env.grid[y][x]
    
    # Ensure agent isn't trapped at start
    if is_agent_trapped(grid_copy, start_pos):
        # Clear obstacles around start position
        sx, sy = start_pos
        for dx, dy in [(0, -1), (0, 1), (-1, 0), (1, 0)]:
            nx, ny = sx + dx, sy + dy
            if 0 <= nx < env.width and 0 <= ny < env.height and env.grid[ny][nx] == env.OBSTACLE:
                env.grid[ny][nx] = env.EMPTY
                grid_copy[ny][nx] = env.EMPTY
    
    # Final path validation
    if not is_path_valid(grid_copy, start_pos, goal_pos):
        print("WARNING: Final maze verification failed. Clearing path obstacles...")
        # Clear a direct path to goal as last resort
        gx, gy = goal_pos
        sx, sy = start_pos
        
        # Clear horizontal path
        for x in range(min(sx, gx), max(sx, gx) + 1):
            env.grid[sy][x] = env.EMPTY
            
        # Clear vertical path
        for y in range(min(sy, gy), max(sy, gy) + 1):
            env.grid[y][gx] = env.EMPTY

def create_reflex_agent():
    """Create and configure a reflex agent with rules"""
    agent = SimpleReflexAgent("Explorer")
    
    # Rule 1: If at the goal, stay there
    def at_goal(percept):
        return percept["cell_content"] == GridWorld.GOAL
    agent.add_rule(at_goal, None)
    
    # Rule 2: If a goal is visible, move toward it
    def goal_visible(percept):
        return percept["goal_visible"]
    agent.add_rule(goal_visible, lambda percept: percept["goal_direction"])
    
    # Rule 3: If obstacle ahead, try to go around it
    def obstacle_ahead(percept):
        open_directions = [d for d, content in percept["adjacents"].items() 
                          if content != GridWorld.OBSTACLE]
        if open_directions:
            return True
        return False
    
    # Choose a random open direction
    def choose_open_direction(percept):
        open_directions = [d for d, content in percept["adjacents"].items() 
                         if content != GridWorld.OBSTACLE]
        if open_directions:
            return random.choice(open_directions)
        return None
    
    agent.add_rule(obstacle_ahead, choose_open_direction)
    
    return agent

@app.route('/step', methods=['POST'])
def step_simulation():
    """Advance the simulation by one step"""
    global step_count, simulation_data
    
    if current_env is None or current_agent is None:
        return jsonify({"error": "Simulation not initialized"}), 400
    
    # Run one step of the simulation
    current_env.step()
    step_count += 1
    
    # Track performance over time for charts
    simulation_data['steps'].append(step_count)
    simulation_data['performance'].append(current_agent.performance_measure)
    
    # Update visit counts if available (for heat map)
    if hasattr(current_agent, 'visit_counts'):
        simulation_data['visit_counts'] = convert_dict_keys_to_str(current_agent.visit_counts)
    
    # Check if goal is reached
    goal_reached = False
    for goal_pos in current_env.goal_positions:
        if current_env.agent_positions[current_agent] == goal_pos:
            goal_reached = True
            break
    
    # Get the current state
    state = get_environment_state()
    state['step_count'] = step_count
    state['goal_reached'] = goal_reached
    state['simulation_data'] = simulation_data
    
    # Add agent-specific info
    agent_type = "unknown"
    agent_info = {}
    
    if isinstance(current_agent, SimpleReflexAgent):
        agent_type = "reflex"
    elif isinstance(current_agent, ModelBasedAgent):
        agent_type = "model"
        agent_info = {
            "model_size": len(current_agent.model),
            "goal_position": current_agent.goal_position,
            "plan": current_agent.plan
        }
    elif isinstance(current_agent, UtilityBasedAgent):
        agent_type = "utility"
        agent_info = {
            "model_size": len(current_agent.model),
            "exploration_rate": current_agent.exploration_rate,
            "utilities": convert_dict_keys_to_str(current_agent.utilities)
        }
    elif isinstance(current_agent, QLearningAgent):
        agent_type = "qlearning"
        
        # Convert q_values to use string keys
        q_values_dict = convert_dict_keys_to_str(current_agent.q_values)
        visit_counts_dict = convert_dict_keys_to_str(current_agent.visit_counts) if hasattr(current_agent, 'visit_counts') else {}
        
        agent_info = {
            "model_size": len(current_agent.model),
            "exploration_rate": current_agent.exploration_rate,
            "learning_rate": current_agent.learning_rate,
            "discount_factor": current_agent.discount_factor,
            "total_reward": current_agent.total_reward,
            "q_values": q_values_dict,
            "visit_counts": visit_counts_dict
        }
        
        # Generate q_value_grid if available
        if hasattr(current_agent, 'get_q_value_grid'):
            agent_info["q_value_grid"] = current_agent.get_q_value_grid(current_env.width, current_env.height)
    
    state['agent_type'] = agent_type
    state['agent_info'] = agent_info
    
    return jsonify(state)

@app.route('/state', methods=['GET'])
def get_state():
    """Get the current state of the simulation"""
    if current_env is None or current_agent is None:
        return jsonify({"error": "Simulation not initialized"}), 400
    
    state = get_environment_state()
    state['step_count'] = step_count
    state['simulation_data'] = simulation_data
    
    return jsonify(state)

@app.route('/compare', methods=['POST'])
def compare_agents():
    """Run simulations with different agents and compare results"""
    # This would run multiple simulations and return comparative data
    # Simplified implementation for demonstration purposes
    results = {
        'reflex': {'steps_to_goal': 28, 'success_rate': 0.7},
        'model': {'steps_to_goal': 16, 'success_rate': 0.9},
        'utility': {'steps_to_goal': 19, 'success_rate': 0.85},
        'qlearning': {'steps_to_goal': 22, 'success_rate': 0.95}
    }
    
    return jsonify(results)

def get_environment_state():
    """Extract the current environment state as JSON"""
    if current_env is None:
        return {}
    
    # Convert grid to a list of lists for JSON
    grid = []
    for y in range(current_env.height):
        row = []
        for x in range(current_env.width):
            cell_type = "empty"
            if current_env.grid[y][x] == GridWorld.OBSTACLE:
                cell_type = "obstacle"
            elif current_env.grid[y][x] == GridWorld.GOAL:
                cell_type = "goal"
            row.append(cell_type)
        grid.append(row)
    
    # Add agent positions
    agents = []
    for agent, position in current_env.agent_positions.items():
        agents.append({
            "name": agent.name,
            "position": position,
            "performance": agent.performance_measure
        })
    
    return {
        "grid": grid,
        "width": current_env.width,
        "height": current_env.height,
        "agents": agents,
        "time_step": current_env.time_step
    }

if __name__ == '__main__':
    # Use environment variable for port if available (Render.com sets this)
    import os
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)