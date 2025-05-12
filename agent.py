"""
Base Agent implementation - defines the core agent architecture
"""
from abc import ABC, abstractmethod
from typing import Any


class Agent(ABC):
    """
    Abstract base class for all agents.
    
    An agent perceives its environment through sensors and acts upon it through actuators.
    """
    
    def __init__(self, name: str = "Agent"):
        """
        Initialize the agent.
        
        Args:
            name: A name for the agent
        """
        self.name = name
        self.performance_measure = 0
        
    @abstractmethod
    def perceive(self, percept: Any) -> None:
        """
        Process a percept from the environment.
        
        Args:
            percept: The percept received from the environment
        """
        pass
    
    @abstractmethod
    def decide(self) -> Any:
        """
        Decide on an action based on percepts and internal state.
        
        Returns:
            An action to be performed
        """
        pass
    
    @abstractmethod
    def act(self) -> Any:
        """
        Execute an action in the environment.
        
        Returns:
            The action performed
        """
        pass
    
    def update_performance(self, value: int) -> None:
        """
        Update the agent's performance measure.
        
        Args:
            value: The value to add to the performance measure
        """
        self.performance_measure += value
        
    def __str__(self) -> str:
        return f"{self.name} (Performance: {self.performance_measure})"