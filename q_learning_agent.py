"""
Q-Learning Agent implementation
"""
from typing import Any, Dict, List, Tuple
import random
import math

from agent import Agent


class QLearningAgent(Agent):
    """
    A reinforcement learning agent that uses Q-learning to make decisions.
    """
    
    def __init__(self, name: str = "QLearningAgent", learning_rate: float = 0.2, 
                 discount_factor: float = 0.9, exploration_rate: float = 0.3):
        """
        Initialize the agent.
        
        Args:
            name: A name for the agent
            learning_rate: Alpha - how quickly the agent incorporates new information
            discount_factor: Gamma - how much the agent values future rewards
            exploration_rate: Epsilon - probability of choosing a random action
        """
        super().__init__(name)
        self.percept = None
        self.position = None
        self.last_position = None
        self.last_action = None
        self.model = {}  # Maps positions to cell contents
        self.q_values = {}  # Maps (state, action) pairs to values
        self.visit_counts = {}  # For visualization: track how often each cell is visited
        
        # Learning parameters
        self.learning_rate = learning_rate
        self.discount_factor = discount_factor
        self.exploration_rate = exploration_rate
        self.initial_exploration_rate = exploration_rate
        self.min_exploration_rate = 0.05
        self.exploration_decay = 0.995  # Slower decay for better exploration
        
        self.current_action = None
        self.steps_taken = 0
        self.total_reward = 0
        self.goal_reached = False
        
    def perceive(self, percept: Any) -> None:
        """
        Process a percept from the environment and update the internal model.
        
        Args:
            percept: The percept received from the environment
        """
        self.percept = percept
        self.last_position = self.position
        
        # Update position
        if "position" in percept:
            self.position = percept["position"]
            
            # Track visit count for this position (for visualization)
            self.visit_counts[self.position] = self.visit_counts.get(self.position, 0) + 1
            
        # Update the model with cell content
        if "cell_content" in percept and self.position:
            self.model[self.position] = percept["cell_content"]
            
        # Update the model with information about adjacent cells
        if "adjacents" in percept and self.position:
            x, y = self.position
            for direction, content in percept["adjacents"].items():
                if direction == "up":
                    self.model[(x, y-1)] = content
                elif direction == "down":
                    self.model[(x, y+1)] = content
                elif direction == "left":
                    self.model[(x-1, y)] = content
                elif direction == "right":
                    self.model[(x+1, y)] = content
                
        # Update Q-values if we've taken an action before
        if self.last_position and self.last_action:
            # Calculate reward
            reward = -0.1  # Small negative reward for each step (encourages efficiency)
            
            if percept["cell_content"] == 2:  # GOAL
                reward = 20.0  # Higher reward for reaching goal
                self.goal_reached = True
            elif self.position == self.last_position:  # Hit obstacle
                reward = -10.0  # Stronger penalty for hitting obstacles
                
            self.total_reward += reward
                
            # Update Q-value using the Q-learning update rule
            self.update_q_value(self.last_position, self.last_action, reward, self.position)
            
        # Decay exploration rate over time
        self.steps_taken += 1
        self.exploration_rate = max(
            self.min_exploration_rate,
            self.initial_exploration_rate * (0.95 ** (self.steps_taken / 20))
        )
            
    def update_q_value(self, state: Tuple[int, int], action: str, reward: float, next_state: Tuple[int, int]) -> None:
        """
        Update the Q-value for a state-action pair using the Q-learning algorithm.
        
        Args:
            state: The previous state (position)
            action: The action taken
            reward: The reward received
            next_state: The resulting state
        """
        # Get current Q-value (or 0 if not set)
        current_q = self.q_values.get((state, action), 0.0)
        
        # Find maximum Q-value for next state
        next_actions = ["up", "down", "left", "right"]
        next_q_values = [self.q_values.get((next_state, a), 0.0) for a in next_actions]
        max_next_q = max(next_q_values) if next_q_values else 0.0
        
        # Q-learning update formula with higher learning rate
        new_q = current_q + self.learning_rate * (
            reward + self.discount_factor * max_next_q - current_q
        )
        
        # Update Q-value
        self.q_values[(state, action)] = new_q
        
    def get_next_state(self, state: Tuple[int, int], action: str) -> Tuple[int, int]:
        """
        Predict the next state given current state and action.
        
        Args:
            state: The current state (position)
            action: The action to take
            
        Returns:
            The predicted next state
        """
        x, y = state
        
        if action == "up":
            next_state = (x, y-1)
        elif action == "down":
            next_state = (x, y+1)
        elif action == "left":
            next_state = (x-1, y)
        elif action == "right":
            next_state = (x+1, y)
        else:
            next_state = state
            
        # Check if next state is valid
        if next_state in self.model and self.model[next_state] == 1:  # Obstacle
            next_state = state  # Stay in place if obstacle
            
        return next_state
        
    def choose_best_action(self) -> str:
        """
        Choose the action with the highest Q-value for the current state.
        
        Returns:
            The best action according to current Q-values
        """
        actions = ["up", "down", "left", "right"]
        q_values = []
        
        for action in actions:
            # Get Q-value for this action
            q_value = self.q_values.get((self.position, action), 0.0)
            
            # Penalize actions leading to obstacles
            next_pos = self.get_next_state(self.position, action)
            if next_pos in self.model and self.model[next_pos] == 1:  # Obstacle
                q_value -= 5.0  # Add strong penalty for obstacle
                
            q_values.append(q_value)
        
        # Find action with highest modified Q-value
        max_q = max(q_values)
        best_actions = [a for a, q in zip(actions, q_values) if q == max_q]
        
        # If multiple actions have the same value, choose randomly among them
        return random.choice(best_actions)
        
    def decide(self) -> Any:
        """
        Decide on an action using epsilon-greedy policy.
        
        Returns:
            An action to be performed
        """
        # If at the goal, stay there
        if self.percept and self.percept.get("cell_content") == 2:  # GOAL
            self.current_action = None
            return None
            
        # Dynamic exploration rate based on steps taken
        current_exploration = max(
            self.min_exploration_rate, 
            self.exploration_rate * (0.9 ** (self.steps_taken / 10))
        )
            
        # Exploration: with probability epsilon, choose a random action
        if random.random() < current_exploration:
            # Choose a random valid action (avoid known obstacles)
            valid_actions = []
            x, y = self.position
            
            for action, pos in [
                ("up", (x, y-1)),
                ("down", (x, y+1)),
                ("left", (x-1, y)),
                ("right", (x+1, y))
            ]:
                if pos not in self.model or self.model[pos] != 1:  # Not an obstacle
                    valid_actions.append(action)
                    
            if valid_actions:
                self.current_action = random.choice(valid_actions)
            else:
                # If all directions are obstacles, choose randomly
                self.current_action = random.choice(["up", "down", "left", "right"])
        else:
            # Exploitation: choose the action with the highest Q-value
            self.current_action = self.choose_best_action()
            
        # Remember last action for learning
        self.last_action = self.current_action
        return self.current_action
        
    def act(self) -> Any:
        """
        Execute the decided action.
        
        Returns:
            The action performed
        """
        return self.current_action
        
    def get_q_value_grid(self, width: int, height: int) -> List[List[float]]:
        """
        Return a grid of the maximum Q-values for each position.
        Useful for visualization.
        
        Args:
            width: Width of the grid
            height: Height of the grid
            
        Returns:
            A 2D grid of maximum Q-values
        """
        q_grid = [[0.0 for _ in range(width)] for _ in range(height)]
        
        for x in range(width):
            for y in range(height):
                pos = (x, y)
                if pos in self.model:
                    if self.model[pos] == 1:  # Obstacle
                        q_grid[y][x] = -10.0
                    elif self.model[pos] == 2:  # Goal
                        q_grid[y][x] = 10.0
                    else:
                        # Find max Q-value for this position
                        actions = ["up", "down", "left", "right"]
                        q_values = [self.q_values.get((pos, a), 0.0) for a in actions]
                        q_grid[y][x] = max(q_values) if q_values else 0.0
                        
        return q_grid