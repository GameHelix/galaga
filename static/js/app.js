// Global variables
let simulationRunning = false;
let autoRunInterval = null;
let currentState = null;
let performanceChart = null;
let comparisonChart = null;
let simulationSpeed = 500; // ms between steps
let currentVisualization = 'normal';

// DOM elements
const gridContainer = document.getElementById('grid-container');
const overlayContainer = document.getElementById('overlay-container');
const agentTypeSelect = document.getElementById('agent-type');
const initializeBtn = document.getElementById('initialize-btn');
const stepBtn = document.getElementById('step-btn');
const autorunBtn = document.getElementById('autorun-btn');
const resetBtn = document.getElementById('reset-btn');
const speedControl = document.getElementById('speed-control');
const clearLogBtn = document.getElementById('clear-log-btn');
const agentInfoDiv = document.getElementById('agent-info');
const simulationLogDiv = document.getElementById('simulation-log');
const stepCounter = document.getElementById('step-counter');
const runComparisonBtn = document.getElementById('run-comparison-btn');

// Visualization radio buttons
const vizNormal = document.getElementById('viz-normal');
const vizHeatmap = document.getElementById('viz-heatmap');
const vizValues = document.getElementById('viz-values');
const vizPolicy = document.getElementById('viz-policy');

// Event listeners
document.addEventListener('DOMContentLoaded', initializeCharts);
initializeBtn.addEventListener('click', initializeSimulation);
stepBtn.addEventListener('click', stepSimulation);
autorunBtn.addEventListener('click', toggleAutoRun);
resetBtn.addEventListener('click', resetSimulation);
clearLogBtn.addEventListener('click', clearLog);
speedControl.addEventListener('input', updateSimulationSpeed);
runComparisonBtn.addEventListener('click', runAgentComparison);

// Visualization radio buttons
vizNormal.addEventListener('change', () => updateVisualization('normal'));
vizHeatmap.addEventListener('change', () => updateVisualization('heatmap'));
vizValues.addEventListener('change', () => updateVisualization('values'));
vizPolicy.addEventListener('change', () => updateVisualization('policy'));

// Initialize charts
function initializeCharts() {
    // Performance chart
    const perfCtx = document.getElementById('performance-chart').getContext('2d');
    performanceChart = new Chart(perfCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Performance',
                data: [],
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                tension: 0.1,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Agent Performance Over Time'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Performance Score'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Step'
                    }
                }
            }
        }
    });
    
    // Comparison chart
    const compCtx = document.getElementById('comparison-chart').getContext('2d');
    comparisonChart = new Chart(compCtx, {
        type: 'bar',
        data: {
            labels: ['Simple Reflex', 'Model-Based', 'Utility-Based', 'Q-Learning'],
            datasets: [
                {
                    label: 'Steps to Goal (Avg)',
                    data: [28, 16, 19, 22],
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgb(54, 162, 235)',
                    borderWidth: 1
                },
                {
                    label: 'Success Rate (%)',
                    data: [70, 90, 85, 95],
                    backgroundColor: 'rgba(75, 192, 192, 0.5)',
                    borderColor: 'rgb(75, 192, 192)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Agent Performance Comparison'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Value'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Agent Type'
                    }
                }
            }
        }
    });
}

// Initialize the simulation
async function initializeSimulation() {
    // Get the selected agent type
    const agentType = agentTypeSelect.value;
    
    // Disable the initialization button while loading
    initializeBtn.disabled = true;
    initializeBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Initializing...';
    
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
        
        // Reset charts
        performanceChart.data.labels = [];
        performanceChart.data.datasets[0].data = [];
        performanceChart.update();
        
        // Enable step, autorun, and reset buttons
        stepBtn.disabled = false;
        autorunBtn.disabled = false;
        resetBtn.disabled = false;
        
        // Update the UI
        updateGrid(currentState);
        updateAgentInfo(currentState);
        updateStepCounter(0);
        
        // Add log entry
        addLogEntry('Simulation initialized with ' + getAgentTypeName(agentType) + ' agent', 'init');
        
        // Set simulation status
        simulationRunning = true;
    } catch (error) {
        console.error('Error:', error);
        addLogEntry('Error: ' + error.message, 'error');
    } finally {
        // Re-enable the initialization button
        initializeBtn.disabled = false;
        initializeBtn.innerHTML = '<i class="bi bi-arrow-clockwise me-2"></i>Initialize';
    }
}

// Step the simulation forward
async function stepSimulation() {
    if (!simulationRunning) {
        return;
    }
    
    try {
        // Disable the step button during the step
        stepBtn.disabled = true;
        
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
        updateStepCounter(currentState.step_count);
        updateCharts(currentState);
        
        // Add log entry for the step
        const agent = currentState.agents[0];
        let actionText = '';
        if (currentState.agent_info && currentState.agent_info.plan) {
            const planText = Array.isArray(currentState.agent_info.plan) ? 
                currentState.agent_info.plan.join(' → ') : JSON.stringify(currentState.agent_info.plan);
            actionText = ` (Plan: ${planText})`;
        }
        
        addLogEntry(`Step ${currentState.step_count}: Agent at (${agent.position[0]}, ${agent.position[1]}) with performance ${agent.performance}${actionText}`);
        
        // Check if goal reached
        if (currentState.goal_reached) {
            addLogEntry(`Goal reached in ${currentState.step_count} steps!`, 'goal');
            stopAutoRun();
            simulationRunning = false;
            stepBtn.disabled = true;
            autorunBtn.disabled = true;
        } else {
            // Re-enable the step button
            stepBtn.disabled = false;
        }
    } catch (error) {
        console.error('Error:', error);
        addLogEntry('Error: ' + error.message, 'error');
        stopAutoRun();
        stepBtn.disabled = false;
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
    autorunBtn.innerHTML = '<i class="bi bi-stop-fill me-2"></i>Stop Auto Run';
    autorunBtn.classList.remove('btn-warning');
    autorunBtn.classList.add('btn-danger');
    
    // Run step at the specified speed
    autoRunInterval = setInterval(stepSimulation, simulationSpeed);
    addLogEntry('Auto run started');
}

// Stop auto run
function stopAutoRun() {
    if (autoRunInterval) {
        clearInterval(autoRunInterval);
        autoRunInterval = null;
        
        autorunBtn.innerHTML = '<i class="bi bi-play-fill me-2"></i>Auto Run';
        autorunBtn.classList.remove('btn-danger');
        autorunBtn.classList.add('btn-warning');
        
        addLogEntry('Auto run stopped');
    }
}

// Reset simulation
function resetSimulation() {
    stopAutoRun();
    simulationRunning = false;
    
    // Disable buttons
    stepBtn.disabled = true;
    autorunBtn.disabled = true;
    resetBtn.disabled = true;
    
    // Clear grid and info
    gridContainer.innerHTML = '';
    overlayContainer.innerHTML = '';
    agentInfoDiv.innerHTML = '<p>No simulation running</p>';
    updateStepCounter(0);
    
    // Reset charts
    performanceChart.data.labels = [];
    performanceChart.data.datasets[0].data = [];
    performanceChart.update();
    
    addLogEntry('Simulation reset');
}

// Clear the log
function clearLog() {
    simulationLogDiv.innerHTML = '';
    addLogEntry('Log cleared');
}

// Update simulation speed
function updateSimulationSpeed() {
    simulationSpeed = parseInt(speedControl.value);
    
    // If auto run is active, restart it with the new speed
    if (autoRunInterval) {
        stopAutoRun();
        startAutoRun();
    }
}

// Update the grid visualization
function updateGrid(state) {
    // Clear the grid and overlay
    gridContainer.innerHTML = '';
    overlayContainer.innerHTML = '';
    
    if (!state || !state.grid) return;
    
    // Set grid dimensions
    gridContainer.style.gridTemplateColumns = `repeat(${state.width}, var(--cell-size))`;
    gridContainer.style.gridTemplateRows = `repeat(${state.height}, var(--cell-size))`;
    
    // Create cells
    for (let y = 0; y < state.height; y++) {
        for (let x = 0; x < state.width; x++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.dataset.x = x;
            cell.dataset.y = y;
            
            // Set cell type
            const cellType = state.grid[y][x];
            if (cellType === 'obstacle') {
                cell.classList.add('cell-obstacle');
            } else if (cellType === 'goal') {
                cell.classList.add('cell-goal');
                cell.innerHTML = '<i class="bi bi-flag-fill"></i>';
            } else {
                cell.classList.add('cell-empty');
            }
            
            // Add visit counts (for trails)
            if (state.simulation_data && state.simulation_data.visit_counts) {
                const posKey = `(${x}, ${y})`;
                if (state.simulation_data.visit_counts[posKey] && cellType === 'empty') {
                    cell.classList.add('cell-visited');
                }
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
        agentMarker.innerHTML = '<i class="bi bi-robot"></i>';
        cell.appendChild(agentMarker);
    }
    
    // Apply visualization overlay based on the current mode
    updateVisualization(currentVisualization);
}

// Update the agent information display
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
    } else if (state.agent_type === 'qlearning') {
        agentTypeText = "Q-Learning Agent";
    }
    
    let html = `
        <div class="agent-info-section">
            <h5>Basic Information</h5>
            <table class="table table-sm">
                <tr><td><strong>Agent Type:</strong></td><td>${agentTypeText}</td></tr>
                <tr><td><strong>Name:</strong></td><td>${agent.name}</td></tr>
                <tr><td><strong>Position:</strong></td><td>(${agent.position[0]}, ${agent.position[1]})</td></tr>
                <tr><td><strong>Performance:</strong></td><td>${agent.performance}</td></tr>
                <tr><td><strong>Time Step:</strong></td><td>${state.time_step}</td></tr>
            </table>
        </div>
    `;
    
    // Add agent-specific information
    if (state.agent_info) {
        if (state.agent_type === 'model') {
            html += `
                <div class="agent-info-section">
                    <h5>Model Information</h5>
                    <table class="table table-sm">
                        <tr><td><strong>Model Size:</strong></td><td>${state.agent_info.model_size || 0} cells</td></tr>
                        <tr><td><strong>Goal Known:</strong></td><td>${state.agent_info.goal_position ? 'Yes' : 'No'}</td></tr>
                    </table>
                    
                    <h5>Current Plan</h5>
                    <div class="d-flex flex-wrap">
                        ${state.agent_info.plan && state.agent_info.plan.length > 0 ? 
                            state.agent_info.plan.map(step => `<span class="info-badge">${step}</span>`).join('') : 
                            'No plan'}
                    </div>
                </div>
            `;
        } else if (state.agent_type === 'utility') {
            html += `
                <div class="agent-info-section">
                    <h5>Utility Information</h5>
                    <table class="table table-sm">
                        <tr><td><strong>Model Size:</strong></td><td>${state.agent_info.model_size || 0} cells</td></tr>
                        <tr><td><strong>Exploration Rate:</strong></td><td>${state.agent_info.exploration_rate || 0}</td></tr>
                    </table>
                    
                    <div class="small text-muted mb-2">Top utility values:</div>
                    <div class="d-flex flex-wrap">
                        ${getTopUtilities(state.agent_info.utilities)}
                    </div>
                </div>
            `;
        } else if (state.agent_type === 'qlearning') {
            html += `
                <div class="agent-info-section">
                    <h5>Learning Parameters</h5>
                    <table class="table table-sm">
                        <tr><td><strong>Learning Rate (α):</strong></td><td>${state.agent_info.learning_rate || 0}</td></tr>
                        <tr><td><strong>Discount Factor (γ):</strong></td><td>${state.agent_info.discount_factor || 0}</td></tr>
                        <tr><td><strong>Exploration Rate (ε):</strong></td><td>${state.agent_info.exploration_rate || 0}</td></tr>
                        <tr><td><strong>Total Reward:</strong></td><td>${state.agent_info.total_reward || 0}</td></tr>
                    </table>
                    
                    <div class="small text-muted mb-2">Top Q-values:</div>
                    <div class="d-flex flex-wrap">
                        ${getTopQValues(state.agent_info.q_values)}
                    </div>
                </div>
            `;
        }
    }
    
    agentInfoDiv.innerHTML = html;
}

// Update charts with new data
function updateCharts(state) {
    if (!state || !state.simulation_data) return;
    
    // Update performance chart
    performanceChart.data.labels = state.simulation_data.steps;
    performanceChart.data.datasets[0].data = state.simulation_data.performance;
    performanceChart.update();
}

// Update the step counter
function updateStepCounter(steps) {
    stepCounter.textContent = `Steps: ${steps}`;
}

// Add an entry to the simulation log
function addLogEntry(message, type = 'info') {
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    
    if (type === 'error') {
        logEntry.style.color = '#dc3545';
    } else if (type === 'goal') {
        logEntry.className += ' log-goal';
    } else if (type === 'init') {
        logEntry.style.color = '#0d6efd';
        logEntry.style.fontWeight = 'bold';
    }
    
    const timestamp = new Date().toLocaleTimeString();
    logEntry.textContent = `[${timestamp}] ${message}`;
    
    simulationLogDiv.appendChild(logEntry);
    
    // Scroll to bottom
    simulationLogDiv.scrollTop = simulationLogDiv.scrollHeight;
}

// Update visualization mode
function updateVisualization(mode) {
    currentVisualization = mode;
    
    // Clear existing overlay
    overlayContainer.innerHTML = '';
    
    // If no current state, return
    if (!currentState || !currentState.grid) return;
    
    if (mode === 'heatmap') {
        // Create heat map based on visit counts
        if (currentState.simulation_data && currentState.simulation_data.visit_counts) {
            createHeatMap(currentState);
        } else {
            addLogEntry('No visit count data available for heat map', 'error');
        }
    } else if (mode === 'values') {
        // Show utility or Q-values
        if (currentState.agent_type === 'utility' && currentState.agent_info.utilities) {
            createValueMap(currentState.agent_info.utilities);
        } else if (currentState.agent_type === 'qlearning' && currentState.agent_info.q_value_grid) {
            createQValueGrid(currentState.agent_info.q_value_grid);
        } else {
            addLogEntry('No value data available for this agent type', 'error');
        }
    } else if (mode === 'policy') {
        // Show policy (best action at each position)
        if (currentState.agent_type === 'qlearning' && currentState.agent_info.q_values) {
            createPolicyMap(currentState.agent_info.q_values);
        } else if (currentState.agent_type === 'utility' && currentState.agent_info.utilities) {
            // Future implementation: derive policy from utilities
            addLogEntry('Policy visualization not implemented for this agent type', 'error');
        } else {
            addLogEntry('No policy data available for this agent type', 'error');
        }
    }
}

// Create a heat map based on visit counts
function createHeatMap(state) {
    const visitCounts = state.simulation_data.visit_counts;
    if (!visitCounts) return;
    
    // Find max visit count for normalization
    let maxCount = 0;
    for (const pos in visitCounts) {
        maxCount = Math.max(maxCount, visitCounts[pos]);
    }
    
    // Create heat map overlay
    for (let y = 0; y < state.height; y++) {
        for (let x = 0; x < state.width; x++) {
            const posKey = `(${x}, ${y})`;
            const count = visitCounts[posKey] || 0;
            
            if (count > 0 && state.grid[y][x] === 'empty') {
                // Calculate intensity (0-1) based on visit count
                const intensity = Math.min(1, count / maxCount);
                
                // Create overlay element
                const overlay = document.createElement('div');
                overlay.className = 'heatmap-overlay';
                overlay.style.backgroundColor = `rgba(255, 0, 0, ${intensity * 0.7})`;
                
                // Position overlay
                overlay.style.left = `${x * (42 + 2)}px`; // cell size + gap
                overlay.style.top = `${y * (42 + 2)}px`;
                overlay.style.width = '42px';
                overlay.style.height = '42px';
                
                // Add count text
                overlay.textContent = count;
                
                // Add to overlay container
                overlayContainer.appendChild(overlay);
            }
        }
    }
}

// Create a value map visualization from utilities
function createValueMap(utilities) {
    if (!utilities || !currentState) return;
    
    // Create value overlay for each cell
    for (const posStr in utilities) {
        try {
            // Parse position string "(x, y)" to get coordinates
            const match = posStr.match(/\((\d+),\s*(\d+)\)/);
            if (!match) continue;
            
            const x = parseInt(match[1]);
            const y = parseInt(match[2]);
            
            // Skip obstacles and goals
            if (currentState.grid[y][x] !== 'empty') continue;
            
            const value = utilities[posStr];
            
            // Create overlay element
            const overlay = document.createElement('div');
            overlay.className = 'cell-value';
            
            // Set text to show value
            overlay.textContent = value.toFixed(1);
            
            // Set color based on value
            let valueClass = '';
            if (value > 5) valueClass = 'value-high';
            else if (value > 0) valueClass = 'value-medium';
            else if (value < 0) valueClass = 'value-low';
            
            if (valueClass) overlay.classList.add(valueClass);
            
            // Position overlay
            overlay.style.left = `${x * (42 + 2)}px`; // cell size + gap
            overlay.style.top = `${y * (42 + 2)}px`;
            
            // Add to overlay container
            overlayContainer.appendChild(overlay);
        } catch (e) {
            console.error("Error processing utility value:", e);
        }
    }
}

// Create a visualization from Q-value grid
function createQValueGrid(qValueGrid) {
    if (!qValueGrid || !currentState) return;
    
    for (let y = 0; y < qValueGrid.length; y++) {
        for (let x = 0; x < qValueGrid[y].length; x++) {
            // Skip obstacles and goals
            if (currentState.grid[y][x] !== 'empty') continue;
            
            const value = qValueGrid[y][x];
            
            // Create overlay element
            const overlay = document.createElement('div');
            overlay.className = 'cell-value';
            
            // Set text to show value
            overlay.textContent = value.toFixed(1);
            
            // Set color based on value
            let valueClass = '';
            if (value > 5) valueClass = 'value-high';
            else if (value > 0) valueClass = 'value-medium';
            else if (value < 0) valueClass = 'value-low';
            
            if (valueClass) overlay.classList.add(valueClass);
            
            // Position overlay
            overlay.style.left = `${x * (42 + 2)}px`; // cell size + gap
            overlay.style.top = `${y * (42 + 2)}px`;
            
            // Add to overlay container
            overlayContainer.appendChild(overlay);
        }
    }
}

// Create a policy map visualization from Q-values
function createPolicyMap(qValues) {
    if (!qValues || !currentState) return;
    
    // For each position with Q-values, determine the best action
    for (const posStr in qValues) {
        try {
            // Parse position string "(x, y)" to get coordinates
            const match = posStr.match(/\((\d+),\s*(\d+)\)/);
            if (!match) continue;
            
            const x = parseInt(match[1]);
            const y = parseInt(match[2]);
            
            // Skip obstacles and goals
            if (currentState.grid[y][x] !== 'empty') continue;
            
            const actionValues = qValues[posStr];
            
            // Find best action
            let bestAction = null;
            let bestValue = -Infinity;
            
            for (const action in actionValues) {
                if (actionValues[action] > bestValue) {
                    bestValue = actionValues[action];
                    bestAction = action;
                }
            }
            
            if (bestAction && bestValue > 0) {
                // Create arrow element
                const arrow = document.createElement('div');
                arrow.className = 'policy-arrow';
                
                // Set arrow based on action
                let arrowChar = '';
                let rotation = 0;
                
                if (bestAction === 'up') {
                    arrowChar = '↑';
                    rotation = 0;
                } else if (bestAction === 'right') {
                    arrowChar = '↑';
                    rotation = 90;
                } else if (bestAction === 'down') {
                    arrowChar = '↑';
                    rotation = 180;
                } else if (bestAction === 'left') {
                    arrowChar = '↑';
                    rotation = 270;
                }
                
                arrow.textContent = arrowChar;
                arrow.style.transform = `rotate(${rotation}deg)`;
                
                // Position arrow
                arrow.style.left = `${x * (42 + 2) + 21}px`; // center in cell
                arrow.style.top = `${y * (42 + 2) + 21}px`;
                
                // Add to overlay container
                overlayContainer.appendChild(arrow);
            }
        } catch (e) {
            console.error("Error creating policy arrow:", e);
        }
    }
}

// Run a comparison of all agent types
async function runAgentComparison() {
    try {
        runComparisonBtn.disabled = true;
        runComparisonBtn.textContent = 'Running...';
        
        const response = await fetch('/compare', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to run comparison');
        }
        
        const results = await response.json();
        
        // Update comparison chart
        comparisonChart.data.datasets[0].data = [
            results.reflex.steps_to_goal,
            results.model.steps_to_goal,
            results.utility.steps_to_goal,
            results.qlearning.steps_to_goal
        ];
        
        comparisonChart.data.datasets[1].data = [
            results.reflex.success_rate * 100,
            results.model.success_rate * 100,
            results.utility.success_rate * 100,
            results.qlearning.success_rate * 100
        ];
        
        comparisonChart.update();
        
        addLogEntry('Agent comparison completed');
    } catch (error) {
        console.error('Error:', error);
        addLogEntry('Error: ' + error.message, 'error');
    } finally {
        runComparisonBtn.disabled = false;
        runComparisonBtn.textContent = 'Run Comparison';
    }
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
        case 'qlearning':
            return 'Q-Learning';
        default:
            return 'Unknown';
    }
}

// Helper function to display top utility values
function getTopUtilities(utilities) {
    if (!utilities) return 'No utility data available';
    
    // Convert the utilities object to an array of [position, value] pairs
    const utilitiesArray = Object.entries(utilities);
    
    // Sort by value (highest first)
    utilitiesArray.sort((a, b) => b[1] - a[1]);
    
    // Take top 5
    const topUtilities = utilitiesArray.slice(0, 5);
    
    // Format as badges
    return topUtilities.map(([pos, value]) => {
        let valueClass = '';
        if (value > 5) valueClass = 'value-high';
        else if (value > 0) valueClass = 'value-medium';
        else if (value < 0) valueClass = 'value-low';
        
        return `<span class="info-badge ${valueClass}">${pos}: ${value.toFixed(1)}</span>`;
    }).join('');
}

// Helper function to display top Q-values
function getTopQValues(qValues) {
    if (!qValues) return 'No Q-value data available';
    
    // Flatten Q-values into [position+action, value] pairs
    const qValuesArray = [];
    for (const pos in qValues) {
        for (const action in qValues[pos]) {
            qValuesArray.push([`${pos}:${action}`, qValues[pos][action]]);
        }
    }
    
    // Sort by value (highest first)
    qValuesArray.sort((a, b) => b[1] - a[1]);
    
    // Take top 5
    const topQValues = qValuesArray.slice(0, 5);
    
    // Format as badges
    return topQValues.map(([key, value]) => {
        let valueClass = '';
        if (value > 5) valueClass = 'value-high';
        else if (value > 0) valueClass = 'value-medium';
        else if (value < 0) valueClass = 'value-low';
        
        return `<span class="info-badge ${valueClass}">${key}: ${value.toFixed(1)}</span>`;
    }).join('');
}