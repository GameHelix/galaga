# agent_implementation
Artificial Intelligence Introduction. Intelligent Agents
# Agent Implementation

A Python framework for implementing and experimenting with different types of intelligent agents in AI.

This project provides a flexible architecture for defining agents, environments, and their interactions. It includes implementations of several classic agent types from AI theory:

- Simple Reflex Agents
- Model-Based Agents
- Utility-Based Agents

## Project Overview

This implementation allows you to explore how different types of agents behave in a grid-world environment. The agents must navigate through obstacles to reach a goal, with each agent type using different decision-making strategies:

1. **Simple Reflex Agent**: Makes decisions based only on the current perception using condition-action rules
2. **Model-Based Agent**: Maintains an internal model of the world and plans paths to goals
3. **Utility-Based Agent**: Makes decisions based on utility calculations to maximize expected value

## Files in the Project

- `agent.py` - Base Agent abstract class
- `environment.py` - Base Environment abstract class
- `reflex_agent.py` - Simple Reflex Agent implementation
- `model_agent.py` - Model-Based Agent implementation
- `utility_agent.py` - Utility-Based Agent implementation
- `grid_world.py` - Grid World environment implementation
- `main.py` - Main script with example simulations

## How to Run

1. Clone the repository
2. Make sure you have Python 3.6+ installed
3. Run the main script:

```bash
python main.py
```

This will present a menu to choose which agent type to run in the simulation.

## Agent Types

### Simple Reflex Agent

These agents select actions based only on the current percept, ignoring history. They use condition-action rules to map directly from percepts to actions.

```python
# Example of creating a Simple Reflex Agent
agent = SimpleReflexAgent("Explorer")

# Add a condition-action rule
def see_obstacle(percept):
    return percept["front"] == "obstacle"

agent.add_rule(see_obstacle, "turn_right")
```

### Model-Based Agent

These agents maintain an internal model of the world, which helps them track the state of the environment and make better decisions.

```python
# Example of creating a Model-Based Agent
agent = ModelBasedAgent("Explorer")

# The agent will automatically update its internal model
# based on percepts and use it for planning
```

### Utility-Based Agent

These agents choose actions based on a utility function that measures the desirability of different states.

```python
# Example of creating a Utility-Based Agent
agent = UtilityBasedAgent("Explorer", exploration_rate=0.1)

# The agent will learn utility values for different states
# and choose actions that maximize expected utility
```

## Creating Custom Agents

You can create your own agents by subclassing the `Agent` class and implementing the required methods:

```python
class MyCustomAgent(Agent):
    def perceive(self, percept):
        # Process the percept
        pass
        
    def decide(self):
        # Make a decision
        return "some_action"
        
    def act(self):
        # Execute the action
        return self.current_action
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.