"""
Simple Reflex Agent implementation
"""
from typing import Any, Dict, Callable

from agent import Agent


class SimpleReflexAgent(Agent):
    """
    A simple reflex agent that maps percepts directly to actions 
    using condition-action rules.
    """
    
    def __init__(self, name: str = "SimpleReflexAgent"):
        """
        Initialize the agent.
        
        Args:
            name: A name for the agent
        """
        super().__init__(name)
        self.percept = None
        self.action_rules = {}
        self.current_action = None
        
    def add_rule(self, condition: Callable[[Any], bool], action: Any) -> None:
        """
        Add a condition-action rule to the agent.
        
        Args:
            condition: A function that takes a percept and returns a boolean
            action: The action to perform when the condition is true
        """
        self.action_rules[condition] = action
        
    def perceive(self, percept: Any) -> None:
        """
        Process a percept from the environment.
        
        Args:
            percept: The percept received from the environment
        """
        self.percept = percept
        
    def decide(self) -> Any:
        """
        Decide on an action based on the current percept.
        
        Returns:
            An action to be performed
        """
        # Check each condition-action rule
        for condition, action in self.action_rules.items():
            if condition(self.percept):
                if callable(action):
                    self.current_action = action(self.percept)
                else:
                    self.current_action = action
                return self.current_action
                
        # Default action if no rule applies
        self.current_action = None
        return None
        
    def act(self) -> Any:
        """
        Execute the decided action.
        
        Returns:
            The action performed
        """
        return self.current_action