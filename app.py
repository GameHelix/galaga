"""
Flask web server for agent visualization
"""
from flask import Flask, render_template, jsonify, request
import json
import random
import time

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
    
    # Set up the maze structure
    # Add outer walls
    for x in range(current_env.width):
        current_env.add_obstacle((x, 0))
        current_env.add_obstacle((x, current_env.height-1))
    for y in range(current_env.height):
        current_env.add_obstacle((0, y))
        current_env.add_obstacle((current_env.width-1, y))
    
    # Add some internal walls to create a maze
    for x in range(3, 12, 4):
        for y in range(1, current_env.height-1):
            if y != 3:
                current_env.add_obstacle((x, y))
                
    for y in range(3, 7, 3):
        for x in range(1, current_env.width-1):
            if x != 5 and x != 9:
                current_env.add_obstacle((x, y))
    
    # Add a goal
    goal_pos = (current_env.width - 2, current_env.height - 2)
    current_env.add_goal(goal_pos)
    
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
    current_env.add_agent(current_agent, (1, 1))
    
    # Return initial state
    return jsonify(get_environment_state())

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