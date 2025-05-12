"""
Grid Environment - a 2D grid world for agents to navigate
"""
from typing import Any, Dict, List, Tuple
import random

from environment import Environment


class GridWorld(Environment):
    """
    A simple 2D grid environment where agents can move around.
    The grid contains obstacles, goals, and other elements.
    """
    
    # Constants for grid elements
    EMPTY = 0
    OBSTACLE = 1
    GOAL = 2
    
    # Actions
    UP = "up"
    DOWN = "down"
    LEFT = "left"
    RIGHT = "right"
    
    def __init__(self, width: int = 10, height: int = 10, name: str = "GridWorld"):
        """
        Initialize the environment.
        
        Args:
            width: The width of the grid
            height: The height of the grid
            name: A name for the environment
        """
        super().__init__(name)
        self.width = width
        self.height = height
        self.grid = [[self.EMPTY for _ in range(width)] for _ in range(height)]
        self.agent_positions = {}  # Maps agents to their positions
        self.goal_positions = []
        
    def add_agent(self, agent: Any, position: Tuple[int, int] = None) -> None:
        """
        Add an agent to the environment at a specified position.
        
        Args:
            agent: The agent to add
            position: The (x, y) position to place the agent, or None for random placement
        """
        super().add_agent(agent)
        
        # Place the agent at a random empty position if none specified
        if position is None:
            empty_positions = [(x, y) for x in range(self.width) for y in range(self.height) 
                              if self.grid[y][x] == self.EMPTY]
            position = random.choice(empty_positions)
            
        self.agent_positions[agent] = position
        
    def add_obstacle(self, position: Tuple[int, int]) -> None:
        """
        Add an obstacle to the grid.
        
        Args:
            position: The (x, y) position to place the obstacle
        """
        x, y = position
        if 0 <= x < self.width and 0 <= y < self.height:
            self.grid[y][x] = self.OBSTACLE
            
    def add_goal(self, position: Tuple[int, int]) -> None:
        """
        Add a goal to the grid.
        
        Args:
            position: The (x, y) position to place the goal
        """
        x, y = position
        if 0 <= x < self.width and 0 <= y < self.height:
            self.grid[y][x] = self.GOAL
            self.goal_positions.append(position)
            
    def get_percept(self, agent: Any) -> Dict:
        """
        Generate a percept for an agent.
        
        The percept includes:
        - The agent's current position
        - What's in the adjacent cells (up, down, left, right)
        - Whether a goal is visible
        
        Args:
            agent: The agent for which to generate a percept
            
        Returns:
            A dictionary containing the percept
        """
        if agent not in self.agent_positions:
            return None
            
        x, y = self.agent_positions[agent]
        
        # Get contents of adjacent cells
        adjacents = {
            self.UP: self.OBSTACLE if y == 0 else self.grid[y-1][x],
            self.DOWN: self.OBSTACLE if y == self.height-1 else self.grid[y+1][x],
            self.LEFT: self.OBSTACLE if x == 0 else self.grid[y][x-1],
            self.RIGHT: self.OBSTACLE if x == self.width-1 else self.grid[y][x+1]
        }
        
        # Check if a goal is visible
        goal_visible = False
        goal_direction = None
        
        for goal_x, goal_y in self.goal_positions:
            # Simple check: if the goal is in the same row or column
            if goal_x == x or goal_y == y:
                goal_visible = True
                
                if goal_x == x:
                    goal_direction = self.UP if goal_y < y else self.DOWN
                else:  # goal_y == y
                    goal_direction = self.LEFT if goal_x < x else self.RIGHT
                    
                break
                
        return {
            "position": (x, y),
            "adjacents": adjacents,
            "goal_visible": goal_visible,
            "goal_direction": goal_direction,
            "cell_content": self.grid[y][x]
        }
        
    def apply_action(self, agent: Any, action: str) -> None:
        """
        Apply an agent's action to update its position.
        
        Args:
            agent: The agent performing the action
            action: The action to perform (one of UP, DOWN, LEFT, RIGHT)
        """
        if agent not in self.agent_positions or action not in [self.UP, self.DOWN, self.LEFT, self.RIGHT]:
            return
            
        x, y = self.agent_positions[agent]
        new_x, new_y = x, y
        
        # Calculate new position based on action
        if action == self.UP and y > 0:
            new_y = y - 1
        elif action == self.DOWN and y < self.height - 1:
            new_y = y + 1
        elif action == self.LEFT and x > 0:
            new_x = x - 1
        elif action == self.RIGHT and x < self.width - 1:
            new_x = x + 1
            
        # Check if new position is valid (not an obstacle)
        if self.grid[new_y][new_x] != self.OBSTACLE:
            self.agent_positions[agent] = (new_x, new_y)
            
            # Update performance if agent reached a goal
            if self.grid[new_y][new_x] == self.GOAL:
                agent.update_performance(10)  # Reward for reaching goal
                
    def update(self) -> None:
        """
        Update the environment's state.
        
        This could include things like moving dynamic obstacles, 
        changing goal locations, etc.
        """
        # For now, the environment is static
        pass
        
    def display(self) -> None:
        """
        Display the current state of the grid.
        """
        grid_display = [['·' for _ in range(self.width)] for _ in range(self.height)]
        
        # Place grid elements
        for y in range(self.height):
            for x in range(self.width):
                if self.grid[y][x] == self.OBSTACLE:
                    grid_display[y][x] = '▓'
                elif self.grid[y][x] == self.GOAL:
                    grid_display[y][x] = 'G'
                    
        # Place agents
        for i, (agent, (x, y)) in enumerate(self.agent_positions.items()):
            grid_display[y][x] = f'A{i}'
            
        # Print the grid
        print(f"\n{self.name} - Time step: {self.time_step}")
        print('┌' + '─' * (self.width * 2 - 1) + '┐')
        for row in grid_display:
            print('│' + ' '.join(row) + '│')
        print('└' + '─' * (self.width * 2 - 1) + '┘')
        
        # Print agent information
        for i, agent in enumerate(self.agents):
            print(f"Agent {i}: {agent.name} at {self.agent_positions[agent]} - Performance: {agent.performance_measure}")