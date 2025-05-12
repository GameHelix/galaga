"""
Model-Based Agent implementation
"""
from typing import Any, Dict, List, Tuple

from agent import Agent


class ModelBasedAgent(Agent):
    """
    A model-based agent that maintains an internal representation 
    of the environment and plans actions based on this model.
    """
    
    def __init__(self, name: str = "ModelBasedAgent"):
        """
        Initialize the agent.
        
        Args:
            name: A name for the agent
        """
        super().__init__(name)
        self.percept = None
        self.model = {}  # Internal model of the world
        self.position = None
        self.goal_position = None
        self.plan = []  # Sequence of actions to execute
        self.current_action = None
        
    def perceive(self, percept: Any) -> None:
        """
        Process a percept from the environment and update the internal model.
        
        Args:
            percept: The percept received from the environment
        """
        self.percept = percept
        
        # Update the model with new information
        if "position" in percept:
            self.position = percept["position"]
            
        if "cell_content" in percept and percept["cell_content"] == 2:  # GOAL
            self.goal_position = self.position
            
        # Update the model with information about adjacent cells
        if "adjacents" in percept and self.position:
            x, y = self.position
            if "up" in percept["adjacents"]:
                self.model[(x, y-1)] = percept["adjacents"]["up"]
            if "down" in percept["adjacents"]:
                self.model[(x, y+1)] = percept["adjacents"]["down"]
            if "left" in percept["adjacents"]:
                self.model[(x-1, y)] = percept["adjacents"]["left"]
            if "right" in percept["adjacents"]:
                self.model[(x+1, y)] = percept["adjacents"]["right"]
        
        # If we see a goal direction, update our knowledge
        if percept.get("goal_visible") and percept.get("goal_direction"):
            x, y = self.position
            if percept["goal_direction"] == "up":
                # The goal is somewhere above us
                for py in range(0, y):
                    self.model.setdefault((x, py), 0)  # Mark as potentially empty
            elif percept["goal_direction"] == "down":
                # The goal is somewhere below us
                for py in range(y+1, 100):  # Assuming the grid isn't infinite
                    self.model.setdefault((x, py), 0)
            elif percept["goal_direction"] == "left":
                # The goal is somewhere to the left
                for px in range(0, x):
                    self.model.setdefault((px, y), 0)
            elif percept["goal_direction"] == "right":
                # The goal is somewhere to the right
                for px in range(x+1, 100):
                    self.model.setdefault((px, y), 0)
                    
    def plan_path(self) -> List[str]:
        """
        Plan a path to the goal using A* algorithm.
        
        Returns:
            A list of actions (directions) to reach the goal
        """
        # If we don't know where we are or where the goal is, can't plan
        if not self.position or not self.goal_position:
            return []
            
        # A* search
        open_set = set([self.position])
        closed_set = set()
        
        g_score = {self.position: 0}  # Cost from start to current node
        f_score = {self.position: self._heuristic(self.position, self.goal_position)}  # Estimated total cost
        
        came_from = {}
        
        while open_set:
            # Find node with lowest f_score
            current = min(open_set, key=lambda pos: f_score.get(pos, float('inf')))
            
            if current == self.goal_position:
                # Reconstruct the path
                path = []
                while current in came_from:
                    prev = came_from[current]
                    # Determine direction from prev to current
                    if current[0] > prev[0]:
                        path.append("right")
                    elif current[0] < prev[0]:
                        path.append("left")
                    elif current[1] > prev[1]:
                        path.append("down")
                    elif current[1] < prev[1]:
                        path.append("up")
                    current = prev
                path.reverse()
                return path
                
            open_set.remove(current)
            closed_set.add(current)
            
            # Check each neighbor
            x, y = current
            neighbors = [(x, y-1), (x, y+1), (x-1, y), (x+1, y)]
            
            for neighbor in neighbors:
                # Skip if obstacle or unknown or already evaluated
                if neighbor in closed_set or self.model.get(neighbor, -1) == 1:  # OBSTACLE
                    continue
                    
                # Tentative g_score
                tentative_g = g_score[current] + 1
                
                if neighbor not in open_set:
                    open_set.add(neighbor)
                elif tentative_g >= g_score.get(neighbor, float('inf')):
                    continue
                    
                # This path is better
                came_from[neighbor] = current
                g_score[neighbor] = tentative_g
                f_score[neighbor] = tentative_g + self._heuristic(neighbor, self.goal_position)
                        
        # If we get here, no path was found
        return []
        
    def _heuristic(self, a: Tuple[int, int], b: Tuple[int, int]) -> float:
        """
        Calculate Manhattan distance between two points.
        
        Args:
            a: First point (x, y)
            b: Second point (x, y)
            
        Returns:
            The Manhattan distance between the points
        """
        return abs(a[0] - b[0]) + abs(a[1] - b[1])
        
    def decide(self) -> Any:
        """
        Decide on an action based on the current model and plan.
        
        Returns:
            An action to be performed
        """
        # If we're at the goal, no action needed
        if self.position == self.goal_position:
            self.current_action = None
            return None
            
        # If we don't have a plan or our current plan is empty, create a new one
        if not self.plan:
            self.plan = self.plan_path()
            
        # If we still don't have a plan, move randomly to explore
        if not self.plan:
            # Look for any non-obstacle direction
            x, y = self.position
            for direction, pos in [
                ("up", (x, y-1)),
                ("down", (x, y+1)),
                ("left", (x-1, y)),
                ("right", (x+1, y))
            ]:
                if self.model.get(pos, -1) != 1:  # Not an obstacle
                    self.current_action = direction
                    return direction
                    
            # If all directions are obstacles or unknown, just try up
            self.current_action = "up"
            return "up"
            
        # Execute the next step in the plan
        self.current_action = self.plan.pop(0)
        return self.current_action
        
    def act(self) -> Any:
        """
        Execute the decided action.
        
        Returns:
            The action performed
        """
        return self.current_action