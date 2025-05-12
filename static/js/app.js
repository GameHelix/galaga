// Global variables
let simulationRunning = false;
let autoRunInterval = null;
let currentState = null;

// DOM elements
const gridContainer = document.getElementById('grid-container');
const agentTypeSelect = document.getElementById('agent-type');
const initializeBtn = document.getElementById('initialize-btn');
const stepBtn = document.getElementById('step-btn');
const autorunBtn = document.getElementById('autorun-btn');
const agentInfoDiv = document.getElementById('agent-info');
const simulationLogDiv = document.getElementById('simulation-log');

// Event listeners
initializeBtn.addEventListener('click', initializeSimulation);
stepBtn.addEventListener('click', stepSimulation);
autorunBtn.addEventListener('click', toggleAutoRun);

// Initialize the simulation
async function initializeSimulation() {
    // Get the selected agent type
    const agentType = agentTypeSelect.value;
    
    // Disable the initialization button while loading
    initializeBtn.disabled = true;
    initializeBtn.textContent = 'Initializing...';
    
    try {
        // Call the init endpoint
        const response = await fetch('/init', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ agent_type: agentType }),
        });
        
        if (!response.ok) {
            throw new Error('Failed to initialize simulation');
        }
        
        // Get the initial state
        currentState = await response.json();
        
        // Enable step and autorun buttons
        stepBtn.disabled = false;
        autorunBtn.disabled = false;
        
        // Update the UI
        updateGrid(currentState);
        updateAgentInfo(currentState);
        
        // Add log entry
        addLogEntry('Simulation initialized with ' + getAgentTypeName(agentType) + ' agent');
        
        // Set simulation status
        simulationRunning = true;
    } catch (error) {
        console.error('Error:', error);
        addLogEntry('Error: ' + error.message, 'error');
    } finally {
        // Re-enable the initialization button
        initializeBtn.disabled = false;
        initializeBtn.textContent = 'Initialize';
    }
}

// Step the simulation forward
async function stepSimulation() {
    if (!simulationRunning) {
        return;
    }
    
    try {
        // Call the step endpoint
        const response = await fetch('/step', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        
        if (!response.ok) {
            throw new Error('Failed to step simulation');
        }
        
        // Get the updated state
        const newState = await response.json();
        currentState = newState;
        
        // Update the UI
        updateGrid(currentState);
        updateAgentInfo(currentState);
        
        // Add log entry for the step
        const agent = currentState.agents[0];
        let actionText = '';
        if (currentState.agent_info && currentState.agent_info.plan) {
            actionText = ` (Plan: ${JSON.stringify(currentState.agent_info.plan)})`;
        }
        
        addLogEntry(`Step ${currentState.step_count}: Agent at ${JSON.stringify(agent.position)} with performance ${agent.performance}${actionText}`);
        
        // Check if goal reached
        if (currentState.goal_reached) {
            addLogEntry(`Goal reached in ${currentState.step_count} steps!`, 'goal');
            stopAutoRun();
            simulationRunning = false;
            stepBtn.disabled = true;
            autorunBtn.disabled = true;
        }
    } catch (error) {
        console.error('Error:', error);
        addLogEntry('Error: ' + error.message, 'error');
        stopAutoRun();
    }
}

// Toggle auto run mode
function toggleAutoRun() {
    if (autoRunInterval) {
        stopAutoRun();
    } else {
        startAutoRun();
    }
}

// Start auto run
function startAutoRun() {
    autorunBtn.textContent = 'Stop Auto Run';
    autorunBtn.classList.remove('btn-warning');
    autorunBtn.classList.add('btn-danger');
    
    // Run step every 500ms
    autoRunInterval = setInterval(stepSimulation, 500);
    addLogEntry('Auto run started');
}

// Stop auto run
function stopAutoRun() {
    if (autoRunInterval) {
        clearInterval(autoRunInterval);
        autoRunInterval = null;
        
        autorunBtn.textContent = 'Auto Run';
        autorunBtn.classList.remove('btn-danger');
        autorunBtn.classList.add('btn-warning');
        
        addLogEntry('Auto run stopped');
    }
}

// Update the grid visualization
function updateGrid(state) {
    // Clear the grid
    gridContainer.innerHTML = '';
    
    // Set grid dimensions
    gridContainer.style.gridTemplateColumns = `repeat(${state.width}, 40px)`;
    gridContainer.style.gridTemplateRows = `repeat(${state.height}, 40px)`;
    
    // Create cells
    for (let y = 0; y < state.height; y++) {
        for (let x = 0; x < state.width; x++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            
            // Set cell type
            const cellType = state.grid[y][x];
            if (cellType === 'obstacle') {
                cell.classList.add('cell-obstacle');
            } else if (cellType === 'goal') {
                cell.classList.add('cell-goal');
                cell.textContent = 'G';
            } else {
                cell.classList.add('cell-empty');
            }
            
            // Add cell to grid
            gridContainer.appendChild(cell);
        }
    }
    
    // Add agents to grid
    for (const agent of state.agents) {
        const [x, y] = agent.position;
        const index = y * state.width + x;
        const cell = gridContainer.children[index];
        
        // Add agent marker
        cell.classList.add('cell-agent');
        const agentMarker = document.createElement('div');
        agentMarker.className = 'agent-marker';
        agentMarker.textContent = 'A';
        cell.appendChild(agentMarker);
    }
}

// Update agent information
function updateAgentInfo(state) {
    if (!state || !state.agents || state.agents.length === 0) {
        agentInfoDiv.innerHTML = '<p>No agent information available</p>';
        return;
    }
    
    const agent = state.agents[0];
    let agentTypeText = "Unknown Agent";
    
    if (state.agent_type === 'reflex') {
        agentTypeText = "Simple Reflex Agent";
    } else if (state.agent_type === 'model') {
        agentTypeText = "Model-Based Agent";
    } else if (state.agent_type === 'utility') {
        agentTypeText = "Utility-Based Agent";
    }
    
    let html = `
        <p><strong>Agent Type:</strong> ${agentTypeText}</p>
        <p><strong>Name:</strong> ${agent.name}</p>
        <p><strong>Position:</strong> (${agent.position[0]}, ${agent.position[1]})</p>
        <p><strong>Performance:</strong> ${agent.performance}</p>
        <p><strong>Time Step:</strong> ${state.time_step}</p>
    `;
    
    // Add agent-specific information
    if (state.agent_info) {
        if (state.agent_type === 'model') {
            html += `
                <p><strong>Model Size:</strong> ${state.agent_info.model_size || 0} cells</p>
                <p><strong>Goal Known:</strong> ${state.agent_info.goal_position ? 'Yes' : 'No'}</p>
                <p><strong>Plan:</strong> ${state.agent_info.plan && state.agent_info.plan.length > 0 ? 
                    state.agent_info.plan.join(' → ') : 'No plan'}</p>
            `;
        } else if (state.agent_type === 'utility') {
            html += `
                <p><strong>Model Size:</strong> ${state.agent_info.model_size || 0} cells</p>
                <p><strong>Exploration Rate:</strong> ${state.agent_info.exploration_rate || 0}</p>
            `;
        }
    }
    
    agentInfoDiv.innerHTML = html;
}

// Add an entry to the simulation log
function addLogEntry(message, type = 'info') {
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    
    if (type === 'error') {
        logEntry.style.color = '#dc3545';
    } else if (type === 'goal') {
        logEntry.className += ' log-goal';
    }
    
    const timestamp = new Date().toLocaleTimeString();
    logEntry.textContent = `[${timestamp}] ${message}`;
    
    simulationLogDiv.appendChild(logEntry);
    
    // Scroll to bottom
    simulationLogDiv.scrollTop = simulationLogDiv.scrollHeight;
}

// Get the full name of an agent type
function getAgentTypeName(type) {
    switch (type) {
        case 'reflex':
            return 'Simple Reflex';
        case 'model':
            return 'Model-Based';
        case 'utility':
            return 'Utility-Based';
        default:
            return 'Unknown';
    }
}