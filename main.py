"""
Main example demonstrating different agent types in a grid environment
"""
import random
import time
from collections import deque

from reflex_agent import SimpleReflexAgent
from model_agent import ModelBasedAgent
from utility_agent import UtilityBasedAgent
from grid_world import GridWorld


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


def create_solvable_random_maze(env, obstacle_count=10):
    """
    Create a randomly generated maze that's guaranteed to be solvable.
    
    Args:
        env: The GridWorld environment
        obstacle_count: Number of obstacles to try to place
    """
    start_pos = (1, 1)
    goal_pos = (env.width - 2, env.height - 2)
    
    # Add the goal
    env.add_goal(goal_pos)
    
    # Make a copy of the grid for validation
    temp_grid = [[env.EMPTY for _ in range(env.width)] for _ in range(env.height)]
    
    # Try adding obstacles
    obstacles_added = 0
    max_attempts = obstacle_count * 10  # Allow multiple attempts per obstacle
    attempts = 0
    
    while obstacles_added < obstacle_count and attempts < max_attempts:
        x = random.randint(0, env.width - 1)
        y = random.randint(0, env.height - 1)
        
        # Skip if trying to place on start or goal
        if (x, y) == start_pos or (x, y) == goal_pos:
            attempts += 1
            continue
            
        # Skip if already an obstacle
        if temp_grid[y][x] == env.OBSTACLE:
            attempts += 1
            continue
            
        # Temporarily add the obstacle
        temp_grid[y][x] = env.OBSTACLE
        
        # Check if path still valid
        if is_path_valid(temp_grid, start_pos, goal_pos):
            # Path is valid, permanently add the obstacle
            env.add_obstacle((x, y))
            obstacles_added += 1
        else:
            # Path would be blocked, remove the obstacle
            temp_grid[y][x] = env.EMPTY
            
        attempts += 1
    
    if obstacles_added < obstacle_count:
        print(f"Note: Could only add {obstacles_added}/{obstacle_count} obstacles while keeping maze solvable")


def create_structured_maze(env):
    """
    Create a structured maze with guaranteed path to goal.
    
    Args:
        env: The GridWorld environment
    """
    start_pos = (1, 1)
    goal_pos = (env.width - 2, env.height - 2)
    
    # Add outer walls
    for x in range(env.width):
        env.add_obstacle((x, 0))
        env.add_obstacle((x, env.height-1))
    for y in range(env.height):
        env.add_obstacle((0, y))
        env.add_obstacle((env.width-1, y))
    
    # Add the goal first
    env.add_goal(goal_pos)
    
    # Create a temporary grid to validate paths
    temp_grid = [[env.EMPTY for _ in range(env.width)] for _ in range(env.height)]
    
    # Add outer walls to the temporary grid
    for x in range(env.width):
        temp_grid[0][x] = env.OBSTACLE
        temp_grid[env.height-1][x] = env.OBSTACLE
    for y in range(env.height):
        temp_grid[y][0] = env.OBSTACLE
        temp_grid[y][env.width-1] = env.OBSTACLE
    
    # Calculate evenly distributed gap positions
    x_gaps = [env.width // 4, env.width // 2, 3 * env.width // 4]
    y_gaps = [env.height // 3, 2 * env.height // 3]
    
    # Add vertical walls with gaps
    wall_spacing = max(2, env.width // 5)
    for x in range(wall_spacing, env.width-wall_spacing, wall_spacing):
        # Choose a random gap from y_gaps to place in this wall
        gap_y = random.choice(y_gaps)
        
        for y in range(1, env.height-1):
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
            
    if not is_path_valid(grid_copy, start_pos, goal_pos):
        print("ERROR: Generated maze has no valid path! This should not happen.")


def run_reflex_agent():
    """Run a demonstration with a simple reflex agent"""
    print("\n=== Simple Reflex Agent Demo ===\n")
    
    # Create a grid environment
    env = GridWorld(width=10, height=6, name="Reflex Agent World")
    
    # Create a maze with random obstacles, guaranteed to be solvable
    create_solvable_random_maze(env, obstacle_count=10)
    
    # Create a simple reflex agent
    agent = SimpleReflexAgent("Explorer")
    
    # Define condition-action rules for the agent
    
    # Rule 1: If at the goal, stay there
    def at_goal(percept):
        return percept["cell_content"] == GridWorld.GOAL
    agent.add_rule(at_goal, None)  # No movement needed
    
    # Rule 2: If a goal is visible, move toward it
    def goal_visible(percept):
        return percept["goal_visible"]
    agent.add_rule(goal_visible, lambda percept: percept["goal_direction"])
    
    # Rule 3: If obstacle ahead, try to go around it
    def obstacle_ahead(percept):
        pos_x, pos_y = percept["position"]
        # Look for open directions, prioritizing the one that moves toward goal
        open_directions = [d for d, content in percept["adjacents"].items() 
                          if content != GridWorld.OBSTACLE]
        if open_directions:
            return True
        return False
    
    # This is a more complex rule that chooses a random open direction
    def choose_open_direction(percept):
        open_directions = [d for d, content in percept["adjacents"].items() 
                         if content != GridWorld.OBSTACLE]
        if open_directions:
            return random.choice(open_directions)
        return None  # No open directions (shouldn't happen in our grid)
    
    agent.add_rule(obstacle_ahead, choose_open_direction)
    
    # Add the agent to the environment
    env.add_agent(agent, (1, 1))
    
    # Run the simulation
    print("Starting simulation...")
    env.display()
    
    for step in range(20):  # Run for 20 steps
        print(f"\nStep {step+1}")
        env.step()
        env.display()
        time.sleep(0.5)  # Pause to make it easier to follow
        
        # Check if agent reached the goal
        if env.agent_positions[agent] == (env.width - 2, env.height - 2):
            print(f"Goal reached in {step+1} steps!")
            break
    
    print(f"Simulation ended. Agent performance: {agent.performance_measure}")


def run_model_agent():
    """Run a demonstration with a model-based agent"""
    print("\n=== Model-Based Agent Demo ===\n")
    
    # Create a grid environment
    env = GridWorld(width=15, height=8, name="Model Agent World")
    
    # Create a structured maze with guaranteed path
    create_structured_maze(env)
    
    # Create a model-based agent
    agent = ModelBasedAgent("Explorer")
    
    # Add the agent to the environment
    env.add_agent(agent, (1, 1))
    
    # Run the simulation
    print("Starting simulation with model-based agent...")
    env.display()
    
    for step in range(50):  # Run for 50 steps
        print(f"\nStep {step+1}")
        env.step()
        env.display()
        
        # Print agent's internal model
        print(f"Agent's current model contains {len(agent.model)} known cells")
        if agent.goal_position:
            print(f"Agent knows goal is at: {agent.goal_position}")
        if agent.plan:
            print(f"Agent's plan: {agent.plan}")
        
        time.sleep(0.5)  # Pause to make it easier to follow
        
        # Check if agent reached the goal
        if env.agent_positions[agent] == (env.width - 2, env.height - 2):
            print(f"Goal reached in {step+1} steps!")
            break
    
    print(f"Simulation ended. Agent performance: {agent.performance_measure}")


def run_utility_agent():
    """Run a demonstration with a utility-based agent"""
    print("\n=== Utility-Based Agent Demo ===\n")
    
    # Create a grid environment with the same maze as the model agent
    env = GridWorld(width=15, height=8, name="Utility Agent World")
    
    # Create a structured maze with guaranteed path
    create_structured_maze(env)
    
    # Create a utility-based agent with a higher exploration rate
    agent = UtilityBasedAgent("Explorer", exploration_rate=0.2)
    
    # Add the agent to the environment
    env.add_agent(agent, (1, 1))
    
    # Run the simulation
    print("Starting simulation with utility-based agent...")
    env.display()
    
    for step in range(50):  # Run for 50 steps
        print(f"\nStep {step+1}")
        env.step()
        env.display()
        
        # Print agent's internal state
        print(f"Agent's current model contains {len(agent.model)} known cells")
        print(f"Agent's exploration rate: {agent.exploration_rate}")
        
        time.sleep(0.5)  # Pause to make it easier to follow
        
        # Check if agent reached the goal
        if env.agent_positions[agent] == (env.width - 2, env.height - 2):
            print(f"Goal reached in {step+1} steps!")
            break
    
    print(f"Simulation ended. Agent performance: {agent.performance_measure}")


def main():
    """Main function to run demonstrations of different agent types"""
    while True:
        print("\n=== Agent Implementation Demo ===")
        print("1. Run Simple Reflex Agent")
        print("2. Run Model-Based Agent")
        print("3. Run Utility-Based Agent")
        print("4. Exit")
        
        choice = input("\nEnter your choice (1-4): ")
        
        if choice == "1":
            run_reflex_agent()
        elif choice == "2":
            run_model_agent()
        elif choice == "3":
            run_utility_agent()
        elif choice == "4":
            print("Exiting...")
            break
        else:
            print("Invalid choice. Please try again.")


if __name__ == "__main__":
    main()