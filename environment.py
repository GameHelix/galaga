"""
Environment for agents to operate within
"""
from abc import ABC, abstractmethod
from typing import Any, List


class Environment(ABC):
    """
    Abstract base class for all environments.
    
    An environment provides percepts to agents and accepts actions from them.
    """
    
    def __init__(self, name: str = "Environment"):
        """
        Initialize the environment.
        
        Args:
            name: A name for the environment
        """
        self.name = name
        self.agents: List[Any] = []
        self.time_step = 0
        
    def add_agent(self, agent: Any) -> None:
        """
        Add an agent to the environment.
        
        Args:
            agent: The agent to add
        """
        self.agents.append(agent)
        
    @abstractmethod
    def get_percept(self, agent: Any) -> Any:
        """
        Generate a percept for an agent.
        
        Args:
            agent: The agent for which to generate a percept
            
        Returns:
            A percept for the agent
        """
        pass
    
    @abstractmethod
    def apply_action(self, agent: Any, action: Any) -> None:
        """
        Apply an action from an agent to the environment.
        
        Args:
            agent: The agent performing the action
            action: The action to perform
        """
        pass
    
    @abstractmethod
    def update(self) -> None:
        """
        Update the environment's state.
        """
        pass
    
    def step(self) -> None:
        """
        Run one time step of the environment.
        """
        # First, agents perceive the environment
        for agent in self.agents:
            percept = self.get_percept(agent)
            agent.perceive(percept)
        
        # Then, agents decide and act
        for agent in self.agents:
            action = agent.decide()
            agent.act()
            self.apply_action(agent, action)
        
        # Update the environment
        self.update()
        self.time_step += 1
        
    def run(self, steps: int) -> None:
        """
        Run the environment for a specified number of steps.
        
        Args:
            steps: The number of steps to run
        """
        for _ in range(steps):
            self.step()
            
    def __str__(self) -> str:
        return f"{self.name} (Time step: {self.time_step}, Agents: {len(self.agents)})"