// ============================================================
// RL Agent Simulation Engine — TypeScript port of Python agents
// Runs fully client-side (no server needed)
// ============================================================

export const EMPTY = 0;
export const OBSTACLE = 1;
export const GOAL = 2;

export type Action = 'up' | 'down' | 'left' | 'right';
export type AgentType = 'reflex' | 'model' | 'utility' | 'qlearning';
export type VisualizationMode = 'normal' | 'heatmap' | 'value' | 'policy';

export interface Percept {
  position: [number, number];
  adjacents: Record<string, number>;
  goalVisible: boolean;
  goalDirection: string | null;
  cellContent: number;
}

export interface SimState {
  grid: number[][];
  width: number;
  height: number;
  agentPos: [number, number];
  goalPos: [number, number];
  stepCount: number;
  performance: number;
  goalReached: boolean;
  agentType: AgentType;
  visitCounts: Record<string, number>;
  agentInfo: Record<string, unknown>;
  performanceHistory: number[];
  stepHistory: number[];
  logEntry: string;
}

// ─────────────────────────────────────────────
// Utility helpers
// ─────────────────────────────────────────────

function isPathValid(
  grid: number[][],
  start: [number, number],
  goal: [number, number],
  width: number,
  height: number
): boolean {
  const visited = new Set<string>();
  const queue: [number, number][] = [start];
  while (queue.length > 0) {
    const [x, y] = queue.shift()!;
    const key = `${x},${y}`;
    if (x === goal[0] && y === goal[1]) return true;
    if (visited.has(key)) continue;
    visited.add(key);
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height && grid[ny][nx] !== OBSTACLE) {
        queue.push([nx, ny]);
      }
    }
  }
  return false;
}

function createMaze(
  grid: number[][],
  width: number,
  height: number,
  startPos: [number, number],
  goalPos: [number, number]
): void {
  // Outer walls
  for (let x = 0; x < width; x++) {
    grid[0][x] = OBSTACLE;
    grid[height - 1][x] = OBSTACLE;
  }
  for (let y = 0; y < height; y++) {
    grid[y][0] = OBSTACLE;
    grid[y][width - 1] = OBSTACLE;
  }

  const [sx, sy] = startPos;
  const safeZone = new Set<string>();
  safeZone.add(`${sx},${sy}`);
  for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
    const nx = sx + dx, ny = sy + dy;
    if (nx > 0 && nx < width - 1 && ny > 0 && ny < height - 1) {
      safeZone.add(`${nx},${ny}`);
    }
  }

  const yGaps = [Math.floor(height / 3), Math.floor(2 * height / 3)];
  const xGaps = [Math.floor(width / 4), Math.floor(width / 2), Math.floor(3 * width / 4)];

  // Vertical walls
  const wallSpacingX = Math.max(2, Math.floor(width / 5));
  for (let x = wallSpacingX; x < width - wallSpacingX; x += wallSpacingX) {
    const gapY = yGaps[Math.floor(Math.random() * yGaps.length)];
    for (let y = 1; y < height - 1; y++) {
      if (safeZone.has(`${x},${y}`)) continue;
      if (y === gapY) continue;
      const prev = grid[y][x];
      grid[y][x] = OBSTACLE;
      if (!isPathValid(grid, startPos, goalPos, width, height)) {
        grid[y][x] = prev;
      }
    }
  }

  // Horizontal walls
  const wallSpacingY = Math.max(2, Math.floor(height / 4));
  for (let y = wallSpacingY; y < height - wallSpacingY; y += wallSpacingY) {
    const gapX = xGaps[Math.floor(Math.random() * xGaps.length)];
    for (let x = 1; x < width - 1; x++) {
      if (safeZone.has(`${x},${y}`)) continue;
      if (x === gapX) continue;
      const prev = grid[y][x];
      grid[y][x] = OBSTACLE;
      if (!isPathValid(grid, startPos, goalPos, width, height)) {
        grid[y][x] = prev;
      }
    }
  }

  // Final safety: ensure path exists
  if (!isPathValid(grid, startPos, goalPos, width, height)) {
    const [gx, gy] = goalPos;
    for (let x = Math.min(sx, gx); x <= Math.max(sx, gx); x++) grid[sy][x] = EMPTY;
    for (let y = Math.min(sy, gy); y <= Math.max(sy, gy); y++) grid[y][gx] = EMPTY;
  }
}

// ─────────────────────────────────────────────
// Base Agent
// ─────────────────────────────────────────────

abstract class Agent {
  name: string;
  performance: number = 0;

  constructor(name: string) {
    this.name = name;
  }

  abstract perceive(percept: Percept): void;
  abstract decide(): string | null;

  updatePerformance(value: number): void {
    this.performance += value;
  }

  abstract getInfo(): Record<string, unknown>;
  abstract getVisitCounts(): Record<string, number>;
}

// ─────────────────────────────────────────────
// 1. Simple Reflex Agent
// ─────────────────────────────────────────────

class ReflexAgent extends Agent {
  private percept: Percept | null = null;
  private visitCounts: Record<string, number> = {};

  constructor(name = 'Explorer') {
    super(name);
  }

  perceive(percept: Percept): void {
    this.percept = percept;
    const key = `${percept.position[0]},${percept.position[1]}`;
    this.visitCounts[key] = (this.visitCounts[key] ?? 0) + 1;
  }

  decide(): string | null {
    if (!this.percept) return null;
    const p = this.percept;

    // Rule 1: At goal → stay
    if (p.cellContent === GOAL) return null;

    // Rule 2: Goal visible → move toward it
    if (p.goalVisible && p.goalDirection) return p.goalDirection;

    // Rule 3: Choose any open direction
    const actions: Action[] = ['up', 'down', 'left', 'right'];
    const open = actions.filter(d => p.adjacents[d] !== OBSTACLE);
    if (open.length > 0) return open[Math.floor(Math.random() * open.length)];

    return actions[Math.floor(Math.random() * actions.length)];
  }

  getInfo(): Record<string, unknown> {
    return { strategy: 'Condition-Action Rules', memory: 'None' };
  }

  getVisitCounts(): Record<string, number> {
    return this.visitCounts;
  }
}

// ─────────────────────────────────────────────
// 2. Model-Based Agent
// ─────────────────────────────────────────────

class ModelAgent extends Agent {
  private percept: Percept | null = null;
  position: [number, number] | null = null;
  goalPosition: [number, number] | null = null;
  model: Map<string, number> = new Map();
  plan: string[] = [];
  visitCounts: Record<string, number> = {};

  constructor(name = 'Explorer') {
    super(name);
  }

  perceive(percept: Percept): void {
    this.percept = percept;
    this.position = percept.position;
    const key = `${percept.position[0]},${percept.position[1]}`;
    this.visitCounts[key] = (this.visitCounts[key] ?? 0) + 1;

    if (percept.cellContent === GOAL) this.goalPosition = percept.position;

    this.model.set(key, percept.cellContent);

    const [x, y] = percept.position;
    const dirs: Record<string, [number, number]> = {
      up: [x, y - 1], down: [x, y + 1], left: [x - 1, y], right: [x + 1, y],
    };
    for (const [dir, [nx, ny]] of Object.entries(dirs)) {
      this.model.set(`${nx},${ny}`, percept.adjacents[dir] ?? EMPTY);
    }
  }

  private heuristic(a: [number, number], b: [number, number]): number {
    return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
  }

  private planPath(): string[] {
    if (!this.position || !this.goalPosition) return [];
    const start = this.position;
    const goal = this.goalPosition;

    const openSet = new Set<string>([`${start[0]},${start[1]}`]);
    const cameFrom = new Map<string, string>();
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();
    gScore.set(`${start[0]},${start[1]}`, 0);
    fScore.set(`${start[0]},${start[1]}`, this.heuristic(start, goal));

    while (openSet.size > 0) {
      let current = '';
      let minF = Infinity;
      for (const node of openSet) {
        const f = fScore.get(node) ?? Infinity;
        if (f < minF) { minF = f; current = node; }
      }

      const [cx, cy] = current.split(',').map(Number) as [number, number];
      if (cx === goal[0] && cy === goal[1]) {
        const path: string[] = [];
        let cur = current;
        while (cameFrom.has(cur)) {
          const prev = cameFrom.get(cur)!;
          const [px, py] = prev.split(',').map(Number);
          const [curx, cury] = cur.split(',').map(Number);
          if (curx > px) path.unshift('right');
          else if (curx < px) path.unshift('left');
          else if (cury > py) path.unshift('down');
          else path.unshift('up');
          cur = prev;
        }
        return path;
      }

      openSet.delete(current);
      const neighbors: [number, number, string][] = [
        [cx, cy - 1, 'up'], [cx, cy + 1, 'down'], [cx - 1, cy, 'left'], [cx + 1, cy, 'right'],
      ];
      for (const [nx, ny, dir] of neighbors) {
        const nk = `${nx},${ny}`;
        if (!this.model.has(nk) || this.model.get(nk) === OBSTACLE) continue;
        const tentG = (gScore.get(current) ?? Infinity) + 1;
        if (tentG < (gScore.get(nk) ?? Infinity)) {
          cameFrom.set(nk, current);
          gScore.set(nk, tentG);
          fScore.set(nk, tentG + this.heuristic([nx, ny], goal));
          openSet.add(nk);
        }
        void dir;
      }
    }
    return [];
  }

  decide(): string | null {
    if (!this.position || (this.goalPosition && this.position[0] === this.goalPosition[0] && this.position[1] === this.goalPosition[1])) return null;

    if (this.plan.length === 0) this.plan = this.planPath();

    if (this.plan.length > 0) return this.plan.shift()!;

    // Explore
    const [x, y] = this.position;
    const dirs: [string, [number, number]][] = [
      ['up', [x, y - 1]], ['down', [x, y + 1]], ['left', [x - 1, y]], ['right', [x + 1, y]],
    ];
    for (const [dir, [nx, ny]] of dirs) {
      const k = `${nx},${ny}`;
      if (!this.model.has(k) || this.model.get(k) !== OBSTACLE) return dir;
    }
    return ['up', 'down', 'left', 'right'][Math.floor(Math.random() * 4)];
  }

  getInfo(): Record<string, unknown> {
    return {
      modelSize: this.model.size,
      goalPosition: this.goalPosition,
      planLength: this.plan.length,
    };
  }

  getVisitCounts(): Record<string, number> {
    return this.visitCounts;
  }
}

// ─────────────────────────────────────────────
// 3. Utility-Based Agent
// ─────────────────────────────────────────────

class UtilityAgent extends Agent {
  private percept: Percept | null = null;
  position: [number, number] | null = null;
  model: Map<string, number> = new Map();
  utilities: Map<string, number> = new Map();
  goalPositions: [number, number][] = [];
  explorationRate: number;
  discountFactor = 0.9;
  visitCounts: Record<string, number> = {};

  constructor(name = 'Explorer', explorationRate = 0.2) {
    super(name);
    this.explorationRate = explorationRate;
  }

  perceive(percept: Percept): void {
    this.percept = percept;
    this.position = percept.position;
    const key = `${percept.position[0]},${percept.position[1]}`;
    this.visitCounts[key] = (this.visitCounts[key] ?? 0) + 1;
    this.model.set(key, percept.cellContent);

    if (percept.cellContent === GOAL) {
      if (!this.goalPositions.find(p => p[0] === percept.position[0] && p[1] === percept.position[1])) {
        this.goalPositions.push(percept.position);
      }
    }

    const [x, y] = percept.position;
    for (const [dir, [nx, ny]] of [['up', [x, y-1]], ['down', [x, y+1]], ['left', [x-1, y]], ['right', [x+1, y]]] as [string, number[]][]) {
      this.model.set(`${nx},${ny}`, percept.adjacents[dir] ?? EMPTY);
    }

    this.updateUtilities();
  }

  private updateUtilities(): void {
    for (const [pos, content] of this.model.entries()) {
      if (!this.utilities.has(pos)) {
        if (content === OBSTACLE) this.utilities.set(pos, -10);
        else if (content === GOAL) this.utilities.set(pos, 10);
        else this.utilities.set(pos, 0);
      }
    }

    if (this.goalPositions.length === 0) return;

    for (let iter = 0; iter < 5; iter++) {
      const newUtils = new Map(this.utilities);
      for (const [pos, content] of this.model.entries()) {
        if (content === OBSTACLE) continue;
        const [px, py] = pos.split(',').map(Number);
        const isGoal = this.goalPositions.some(g => g[0] === px && g[1] === py);
        if (isGoal) continue;

        let maxUtil = -Infinity;
        for (const [nx, ny] of [[px, py-1], [px, py+1], [px-1, py], [px+1, py]]) {
          const nk = `${nx},${ny}`;
          if (!this.model.has(nk) || this.model.get(nk) === OBSTACLE) continue;
          const nIsGoal = this.goalPositions.some(g => g[0] === nx && g[1] === ny);
          const reward = nIsGoal ? 10 : -0.1;
          const u = reward + this.discountFactor * (this.utilities.get(nk) ?? 0);
          if (u > maxUtil) maxUtil = u;
        }
        if (maxUtil !== -Infinity) newUtils.set(pos, maxUtil);
      }
      this.utilities = newUtils;
    }
  }

  private getActionUtility(action: string): number {
    if (!this.position) return 0;
    const [x, y] = this.position;
    const next: Record<string, [number, number]> = {
      up: [x, y-1], down: [x, y+1], left: [x-1, y], right: [x+1, y],
    };
    const [nx, ny] = next[action];
    const k = `${nx},${ny}`;
    if (!this.model.has(k)) return -1;
    if (this.model.get(k) === OBSTACLE) return -5;
    return this.utilities.get(k) ?? 0;
  }

  decide(): string | null {
    if (!this.position) return null;
    if (this.goalPositions.some(g => g[0] === this.position![0] && g[1] === this.position![1])) return null;

    const actions: Action[] = ['up', 'down', 'left', 'right'];

    if (Math.random() < this.explorationRate) {
      const valid = actions.filter(a => {
        const [x, y] = this.position!;
        const next: Record<string, [number, number]> = {
          up: [x, y-1], down: [x, y+1], left: [x-1, y], right: [x+1, y],
        };
        const [nx, ny] = next[a];
        const k = `${nx},${ny}`;
        return !this.model.has(k) || this.model.get(k) !== OBSTACLE;
      });
      return valid.length > 0 ? valid[Math.floor(Math.random() * valid.length)] : actions[Math.floor(Math.random() * 4)];
    }

    const utils = actions.map(a => this.getActionUtility(a));
    const maxU = Math.max(...utils);
    const best = actions.filter((_, i) => utils[i] === maxU);
    return best[Math.floor(Math.random() * best.length)];
  }

  getInfo(): Record<string, unknown> {
    const topUtils: [string, number][] = [...this.utilities.entries()]
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    return {
      modelSize: this.model.size,
      explorationRate: this.explorationRate.toFixed(3),
      topUtilities: topUtils,
    };
  }

  getVisitCounts(): Record<string, number> {
    return this.visitCounts;
  }
}

// ─────────────────────────────────────────────
// 4. Q-Learning Agent
// ─────────────────────────────────────────────

class QLearningAgent extends Agent {
  private percept: Percept | null = null;
  position: [number, number] | null = null;
  lastPosition: [number, number] | null = null;
  lastAction: string | null = null;
  model: Map<string, number> = new Map();
  qValues: Map<string, number> = new Map();
  visitCounts: Record<string, number> = {};
  learningRate: number;
  discountFactor: number;
  explorationRate: number;
  minExploration = 0.05;
  totalReward = 0;
  stepsCount = 0;

  constructor(name = 'Q-Learner', lr = 0.2, gamma = 0.9, epsilon = 0.3) {
    super(name);
    this.learningRate = lr;
    this.discountFactor = gamma;
    this.explorationRate = epsilon;
  }

  private qKey(pos: [number, number], action: string): string {
    return `${pos[0]},${pos[1]},${action}`;
  }

  perceive(percept: Percept): void {
    this.percept = percept;
    this.lastPosition = this.position;
    this.position = percept.position;
    const key = `${percept.position[0]},${percept.position[1]}`;
    this.visitCounts[key] = (this.visitCounts[key] ?? 0) + 1;
    this.model.set(key, percept.cellContent);

    const [x, y] = percept.position;
    for (const [dir, [nx, ny]] of [['up', [x, y-1]], ['down', [x, y+1]], ['left', [x-1, y]], ['right', [x+1, y]]] as [string, number[]][]) {
      this.model.set(`${nx},${ny}`, percept.adjacents[dir] ?? EMPTY);
    }

    if (this.lastPosition && this.lastAction) {
      let reward = -0.1;
      if (percept.cellContent === GOAL) reward = 20;
      else if (this.position[0] === this.lastPosition[0] && this.position[1] === this.lastPosition[1]) reward = -5;

      this.totalReward += reward;
      this.updateQ(this.lastPosition, this.lastAction, reward, this.position);
    }

    this.stepsCount++;
    this.explorationRate = Math.max(this.minExploration, 0.3 * Math.pow(0.95, this.stepsCount / 20));
  }

  private updateQ(state: [number, number], action: string, reward: number, nextState: [number, number]): void {
    const curQ = this.qValues.get(this.qKey(state, action)) ?? 0;
    const nextActions: Action[] = ['up', 'down', 'left', 'right'];
    const maxNextQ = Math.max(...nextActions.map(a => this.qValues.get(this.qKey(nextState, a)) ?? 0));
    const newQ = curQ + this.learningRate * (reward + this.discountFactor * maxNextQ - curQ);
    this.qValues.set(this.qKey(state, action), newQ);
  }

  private getNextPos(pos: [number, number], action: string): [number, number] {
    const [x, y] = pos;
    const map: Record<string, [number, number]> = {
      up: [x, y-1], down: [x, y+1], left: [x-1, y], right: [x+1, y],
    };
    const next = map[action] ?? pos;
    const k = `${next[0]},${next[1]}`;
    return this.model.get(k) === OBSTACLE ? pos : next;
  }

  private bestAction(): string {
    const actions: Action[] = ['up', 'down', 'left', 'right'];
    if (!this.position) return actions[Math.floor(Math.random() * 4)];
    const qVals = actions.map(a => {
      let q = this.qValues.get(this.qKey(this.position!, a)) ?? 0;
      const next = this.getNextPos(this.position!, a);
      if (this.model.get(`${next[0]},${next[1]}`) === OBSTACLE) q -= 5;
      return q;
    });
    const maxQ = Math.max(...qVals);
    const best = actions.filter((_, i) => qVals[i] === maxQ);
    return best[Math.floor(Math.random() * best.length)];
  }

  decide(): string | null {
    if (!this.position || !this.percept) return null;
    if (this.percept.cellContent === GOAL) return null;

    const curEps = Math.max(this.minExploration, this.explorationRate * Math.pow(0.9, this.stepsCount / 10));
    let action: string;

    if (Math.random() < curEps) {
      const actions: Action[] = ['up', 'down', 'left', 'right'];
      const valid = actions.filter(a => {
        const next = this.getNextPos(this.position!, a);
        return this.model.get(`${next[0]},${next[1]}`) !== OBSTACLE;
      });
      action = valid.length > 0 ? valid[Math.floor(Math.random() * valid.length)] : actions[Math.floor(Math.random() * 4)];
    } else {
      action = this.bestAction();
    }

    this.lastAction = action;
    return action;
  }

  getQGrid(width: number, height: number): number[][] {
    const qGrid: number[][] = Array.from({ length: height }, () => Array(width).fill(0));
    const actions: Action[] = ['up', 'down', 'left', 'right'];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const k = `${x},${y}`;
        if (this.model.get(k) === OBSTACLE) { qGrid[y][x] = -10; continue; }
        if (this.model.get(k) === GOAL) { qGrid[y][x] = 10; continue; }
        const qs = actions.map(a => this.qValues.get(this.qKey([x, y], a)) ?? 0);
        qGrid[y][x] = Math.max(...qs);
      }
    }
    return qGrid;
  }

  getInfo(): Record<string, unknown> {
    return {
      modelSize: this.model.size,
      explorationRate: this.explorationRate.toFixed(3),
      learningRate: this.learningRate,
      discountFactor: this.discountFactor,
      totalReward: this.totalReward.toFixed(2),
      qValuesCount: this.qValues.size,
    };
  }

  getVisitCounts(): Record<string, number> {
    return this.visitCounts;
  }
}

// ─────────────────────────────────────────────
// Simulation Engine
// ─────────────────────────────────────────────

export class SimulationEngine {
  grid: number[][];
  width: number;
  height: number;
  agentPos: [number, number];
  goalPos: [number, number];
  stepCount = 0;
  goalReached = false;
  agentType: AgentType;
  private agent: Agent;
  performanceHistory: number[] = [];
  stepHistory: number[] = [];

  constructor(agentType: AgentType, width = 15, height = 8) {
    this.agentType = agentType;
    this.width = width;
    this.height = height;

    this.agentPos = [1, 1];
    this.goalPos = [width - 2, height - 2];

    // Build empty grid
    this.grid = Array.from({ length: height }, () => Array(width).fill(EMPTY));
    this.grid[this.goalPos[1]][this.goalPos[0]] = GOAL;

    // Generate maze
    createMaze(this.grid, width, height, this.agentPos, this.goalPos);

    // Create agent
    switch (agentType) {
      case 'reflex':   this.agent = new ReflexAgent('Explorer'); break;
      case 'model':    this.agent = new ModelAgent('Explorer'); break;
      case 'utility':  this.agent = new UtilityAgent('Explorer', 0.2); break;
      case 'qlearning': this.agent = new QLearningAgent('Q-Learner', 0.2, 0.9, 0.3); break;
    }
  }

  private getPercept(): Percept {
    const [x, y] = this.agentPos;
    const adjacents: Record<string, number> = {
      up:    y === 0             ? OBSTACLE : this.grid[y - 1][x],
      down:  y === this.height-1 ? OBSTACLE : this.grid[y + 1][x],
      left:  x === 0             ? OBSTACLE : this.grid[y][x - 1],
      right: x === this.width-1  ? OBSTACLE : this.grid[y][x + 1],
    };

    // Goal visibility (same row or column, unobstructed)
    let goalVisible = false;
    let goalDirection: string | null = null;
    const [gx, gy] = this.goalPos;

    if (gx === x || gy === y) {
      goalVisible = true;
      if (gx === x) goalDirection = gy < y ? 'up' : 'down';
      else           goalDirection = gx < x ? 'left' : 'right';
    }

    return {
      position: [x, y],
      adjacents,
      goalVisible,
      goalDirection,
      cellContent: this.grid[y][x],
    };
  }

  private applyAction(action: string): void {
    const [x, y] = this.agentPos;
    const deltas: Record<string, [number, number]> = {
      up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0],
    };
    const [dx, dy] = deltas[action] ?? [0, 0];
    const nx = x + dx, ny = y + dy;

    if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height && this.grid[ny][nx] !== OBSTACLE) {
      this.agentPos = [nx, ny];
      if (this.grid[ny][nx] === GOAL) {
        this.agent.updatePerformance(10);
        this.goalReached = true;
      }
    }
  }

  step(): SimState {
    const percept = this.getPercept();
    this.agent.perceive(percept);
    const action = this.agent.decide();
    if (action) this.applyAction(action);
    this.stepCount++;

    // Check goal
    const [ax, ay] = this.agentPos;
    this.goalReached = this.grid[ay][ax] === GOAL;

    this.performanceHistory.push(this.agent.performance);
    this.stepHistory.push(this.stepCount);

    return this.getState(action);
  }

  private getState(lastAction: string | null = null): SimState {
    let logEntry = '';
    if (this.goalReached) {
      logEntry = `Goal reached in ${this.stepCount} steps!`;
    } else if (lastAction) {
      logEntry = `Step ${this.stepCount}: moved ${lastAction} → (${this.agentPos[0]}, ${this.agentPos[1]})`;
    }

    return {
      grid: this.grid.map(row => [...row]),
      width: this.width,
      height: this.height,
      agentPos: [...this.agentPos] as [number, number],
      goalPos: [...this.goalPos] as [number, number],
      stepCount: this.stepCount,
      performance: this.agent.performance,
      goalReached: this.goalReached,
      agentType: this.agentType,
      visitCounts: this.agent.getVisitCounts(),
      agentInfo: this.agent.getInfo(),
      performanceHistory: [...this.performanceHistory],
      stepHistory: [...this.stepHistory],
      logEntry,
    };
  }

  getInitialState(): SimState {
    return this.getState();
  }
}
