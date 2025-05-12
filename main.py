"""
Main example demonstrating different agent types in a grid environment
"""
import random
import time

from reflex_agent import SimpleReflexAgent
from model_agent import ModelBasedAgent
from utility_agent import UtilityBasedAgent
from grid_world import GridWorld


def run_reflex_agent():
    """Run a demonstration with a simple reflex agent"""
    print("\n=== Simple Reflex Agent Demo ===\n")
    
    # Create a grid environment
    env = GridWorld(width=10, height=6, name="Reflex Agent World")
    
    # Add some obstacles
    for _ in range(10):
        x = random.randint(0, env.width - 1)
        y = random.randint(0, env.height - 1)
        env.add_obstacle((x, y))
    
    # Add a goal
    goal_pos = (env.width - 2, env.height - 2)
    env.add_goal(goal_pos)
    
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
        if env.agent_positions[agent] == goal_pos:
            print(f"Goal reached in {step+1} steps!")
            break
    
    print(f"Simulation ended. Agent performance: {agent.performance_measure}")


def run_model_agent():
    """Run a demonstration with a model-based agent"""
    print("\n=== Model-Based Agent Demo ===\n")
    
    # Create a grid environment
    env = GridWorld(width=15, height=8, name="Model Agent World")
    
    # Create a simple maze pattern with obstacles
    # Add outer walls
    for x in range(env.width):
        env.add_obstacle((x, 0))
        env.add_obstacle((x, env.height-1))
    for y in range(env.height):
        env.add_obstacle((0, y))
        env.add_obstacle((env.width-1, y))
    
    # Add some internal walls to create a maze
    for x in range(3, 12, 4):
        for y in range(1, env.height-1):
            if y != 3:
                env.add_obstacle((x, y))
                
    for y in range(3, 7, 3):
        for x in range(1, env.width-1):
            if x != 5 and x != 9:
                env.add_obstacle((x, y))
    
    # Add a goal
    goal_pos = (env.width - 2, env.height - 2)
    env.add_goal(goal_pos)
    
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
        if env.agent_positions[agent] == goal_pos:
            print(f"Goal reached in {step+1} steps!")
            break
    
    print(f"Simulation ended. Agent performance: {agent.performance_measure}")


def run_utility_agent():
    """Run a demonstration with a utility-based agent"""
    print("\n=== Utility-Based Agent Demo ===\n")
    
    # Create a grid environment with the same maze as the model agent
    env = GridWorld(width=15, height=8, name="Utility Agent World")
    
    # Add the same maze configuration
    for x in range(env.width):
        env.add_obstacle((x, 0))
        env.add_obstacle((x, env.height-1))
    for y in range(env.height):
        env.add_obstacle((0, y))
        env.add_obstacle((env.width-1, y))
    
    for x in range(3, 12, 4):
        for y in range(1, env.height-1):
            if y != 3:
                env.add_obstacle((x, y))
                
    for y in range(3, 7, 3):
        for x in range(1, env.width-1):
            if x != 5 and x != 9:
                env.add_obstacle((x, y))
    
    # Add a goal
    goal_pos = (env.width - 2, env.height - 2)
    env.add_goal(goal_pos)
    
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
        if env.agent_positions[agent] == goal_pos:
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