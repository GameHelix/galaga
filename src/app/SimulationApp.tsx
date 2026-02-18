'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';
import { SimulationEngine, SimState, AgentType, VisualizationMode, OBSTACLE } from '@/lib/simulation';

// ─── Agent meta ───────────────────────────────────────────────
const AGENT_META: Record<AgentType, { label: string; icon: string; tagClass: string; desc: string; color: string }> = {
  reflex:    { label: 'Simple Reflex',   icon: '⚡', tagClass: 'badge-reflex',    desc: 'Condition-action rules, no memory', color: '#ef4444' },
  model:     { label: 'Model-Based',     icon: '🗺',  tagClass: 'badge-model',     desc: 'A* pathfinding with world model',  color: '#00d4ff' },
  utility:   { label: 'Utility-Based',   icon: '📊', tagClass: 'badge-utility',   desc: 'Value iteration, ε-greedy policy', color: '#a78bfa' },
  qlearning: { label: 'Q-Learning',      icon: '🧠', tagClass: 'badge-qlearning', desc: 'Temporal-difference reinforcement learning', color: '#00ff88' },
};

const ALL_AGENT_TYPES: AgentType[] = ['reflex', 'model', 'utility', 'qlearning'];

const SPEED_OPTIONS = [
  { label: '1×',   value: 1  },
  { label: '3×',   value: 3  },
  { label: '5×',   value: 5  },
  { label: '10×',  value: 10 },
  { label: '20×',  value: 20 },
  { label: '50×',  value: 50 },
];

const VIZ_MODES: { key: VisualizationMode; label: string }[] = [
  { key: 'normal',  label: 'Normal'  },
  { key: 'heatmap', label: 'Heatmap' },
  { key: 'value',   label: 'Values'  },
];

// ─── Grid Canvas ──────────────────────────────────────────────
function GridCanvas({
  state,
  vizMode,
  compact = false,
}: {
  state: SimState | null;
  vizMode: VisualizationMode;
  compact?: boolean;
}) {
  if (!state) {
    return (
      <div className="flex items-center justify-center rounded-xl glass text-slate-500 text-sm"
        style={{ height: compact ? 120 : 200 }}>
        Not initialized
      </div>
    );
  }

  const { grid, width, height, agentPos, goalPos, visitCounts } = state;
  const maxVisit = Math.max(1, ...Object.values(visitCounts));
  const maxCellPx = compact ? 18 : 38;
  const cellPx = Math.min(maxCellPx, Math.floor(
    (compact ? 260 : (typeof window !== 'undefined' ? Math.min(window.innerWidth * 0.55, 700) : 600)) / width
  ));

  function getCellStyle(x: number, y: number): React.CSSProperties {
    const isAgent = agentPos[0] === x && agentPos[1] === y;
    const isGoal  = goalPos[0] === x  && goalPos[1] === y;
    const cell    = grid[y][x];
    const key     = `${x},${y}`;

    if (cell === OBSTACLE) return { background: '#0a0d16', border: '1px solid #1e2537' };

    if (isAgent) {
      return {
        background: '#00d4ff',
        boxShadow: compact ? 'none' : '0 0 12px rgba(0,212,255,0.8)',
        border: '1px solid rgba(0,212,255,0.6)',
        borderRadius: '50%',
        transform: 'scale(0.75)',
      };
    }

    if (isGoal) {
      return {
        background: '#00ff88',
        boxShadow: compact ? 'none' : '0 0 12px rgba(0,255,136,0.8)',
        border: '1px solid rgba(0,255,136,0.6)',
        borderRadius: '3px',
      };
    }

    if (vizMode === 'heatmap') {
      const visits = visitCounts[key] ?? 0;
      const intensity = visits / maxVisit;
      const r = Math.round(255 * intensity);
      const g = Math.round(40 * (1 - intensity));
      const b = Math.round(40 * (1 - intensity));
      return {
        background: visits > 0 ? `rgba(${r},${g},${b},${0.2 + intensity * 0.7})` : '#111827',
        border: '1px solid rgba(255,255,255,0.04)',
      };
    }

    return { background: '#111827', border: '1px solid rgba(255,255,255,0.04)' };
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${width}, ${cellPx}px)`,
        gridTemplateRows: `repeat(${height}, ${cellPx}px)`,
        gap: '1px',
        background: '#060a12',
        padding: compact ? '3px' : '5px',
        borderRadius: 8,
      }}
    >
      {Array.from({ length: height }, (_, y) =>
        Array.from({ length: width }, (_, x) => (
          <div
            key={`${x}-${y}`}
            style={{
              ...getCellStyle(x, y),
              width: cellPx,
              height: cellPx,
              borderRadius: 2,
              transition: compact ? 'none' : 'background 0.1s ease',
            }}
          />
        ))
      )}
    </div>
  );
}

// ─── Performance chart (single agent) ────────────────────────
function PerformanceChart({ history }: { history: Array<{ step: number; perf: number }> }) {
  if (history.length < 2) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-600 text-sm">
        Performance data will appear here
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={history} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="step" stroke="#475569" tick={{ fontSize: 10 }} />
        <YAxis stroke="#475569" tick={{ fontSize: 10 }} />
        <Tooltip
          contentStyle={{ background: '#0d1424', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: '#94a3b8' }}
          itemStyle={{ color: '#00d4ff' }}
        />
        <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
        <Line type="monotone" dataKey="perf" stroke="#00d4ff" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#00d4ff' }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── Race chart (all 4 agents) ────────────────────────────────
function RaceChart({ data }: { data: Array<Record<string, number>> }) {
  if (data.length < 2) {
    return <div className="flex items-center justify-center h-48 text-slate-600 text-sm">Performance data will appear here…</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 4, right: 16, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="step" stroke="#475569" tick={{ fontSize: 10 }} />
        <YAxis stroke="#475569" tick={{ fontSize: 10 }} />
        <Tooltip
          contentStyle={{ background: '#0d1424', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: '#94a3b8' }}
        />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
        <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
        {ALL_AGENT_TYPES.map(a => (
          <Line
            key={a}
            type="monotone"
            dataKey={a}
            name={AGENT_META[a].label}
            stroke={AGENT_META[a].color}
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── Agent info panel ─────────────────────────────────────────
function AgentInfoPanel({ state }: { state: SimState | null }) {
  if (!state) return null;
  const meta = AGENT_META[state.agentType];
  const info = state.agentInfo as Record<string, unknown>;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-xs px-2 py-1 rounded-full border font-mono ${meta.tagClass}`}>
          {meta.icon} {meta.label}
        </span>
        <span className="text-xs text-slate-500">{meta.desc}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-2">
        {[
          ['Steps', state.stepCount],
          ['Performance', state.performance.toFixed(1)],
          ['Position', `(${state.agentPos[0]}, ${state.agentPos[1]})`],
          ['Goal', state.goalReached ? '✓ Reached!' : 'Not reached'],
        ].map(([k, v]) => (
          <div key={String(k)} className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <div className="text-xs text-slate-500 font-mono">{k}</div>
            <div className={`text-sm font-semibold font-mono mt-0.5 ${k === 'Goal' && state.goalReached ? 'text-[var(--neon-green)]' : 'text-slate-200'}`}>
              {String(v)}
            </div>
          </div>
        ))}
      </div>
      {Object.keys(info).length > 0 && (
        <div className="mt-2 space-y-1">
          {Object.entries(info).filter(([, v]) => typeof v !== 'object').map(([k, v]) => (
            <div key={k} className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-mono">{k}</span>
              <span className="text-slate-300 font-mono">{String(v)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Log panel ────────────────────────────────────────────────
function LogPanel({ entries }: { entries: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [entries]);
  return (
    <div ref={ref} className="log-container overflow-y-auto rounded-lg text-xs font-mono space-y-0.5"
      style={{ maxHeight: 180, background: 'rgba(0,0,0,0.3)', padding: '8px' }}>
      {entries.length === 0 && <p className="text-slate-600 italic">Simulation log will appear here…</p>}
      {entries.map((entry, i) => (
        <div key={i} className="text-slate-400 leading-5"
          style={{ color: entry.includes('Goal') ? 'var(--neon-green)' : undefined, fontWeight: entry.includes('Goal') ? 600 : undefined }}>
          <span className="text-slate-600 mr-2">{String(i + 1).padStart(3, '0')}</span>
          {entry}
        </div>
      ))}
    </div>
  );
}

// ─── Agent comparison table ───────────────────────────────────
const COMPARISON_DATA = [
  { label: 'Algorithm',    reflex: 'Condition Rules', model: 'A* Search',      utility: 'Value Iteration', qlearning: 'Q-Learning'  },
  { label: 'Memory',       reflex: 'None',            model: 'Full model',     utility: 'Utility map',     qlearning: 'Q-table'     },
  { label: 'Learning',     reflex: '✗',               model: '~',              utility: '✓ Partial',       qlearning: '✓ Full RL'   },
  { label: 'Avg steps',    reflex: '~28',             model: '~16',            utility: '~19',             qlearning: '~22'         },
  { label: 'Success rate', reflex: '70%',             model: '90%',            utility: '85%',             qlearning: '95%'         },
];

function ComparisonTable() {
  return (
    <div className="overflow-x-auto rounded-xl glass mt-2">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
            <th className="text-left px-4 py-3 text-slate-400 font-medium w-28">Attribute</th>
            {ALL_AGENT_TYPES.map(a => (
              <th key={a} className="text-center px-3 py-3">
                <span className={`text-xs px-2 py-1 rounded-full border ${AGENT_META[a].tagClass}`}>
                  {AGENT_META[a].icon} {AGENT_META[a].label}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COMPARISON_DATA.map((row, i) => (
            <tr key={row.label} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
              <td className="px-4 py-2.5 text-slate-400 font-mono text-xs">{row.label}</td>
              {ALL_AGENT_TYPES.map(a => (
                <td key={a} className="px-3 py-2.5 text-center text-slate-300 font-mono text-xs">
                  {(row as Record<string, string>)[a]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Race Mode (4 agents simultaneously) ─────────────────────
interface RaceState {
  engines: Record<AgentType, SimulationEngine>;
  states: Record<AgentType, SimState>;
}

function useRaceMode() {
  const [raceState, setRaceState] = useState<RaceState | null>(null);
  const [raceRunning, setRaceRunning] = useState(false);
  const rafRef = useRef<number | null>(null);
  const stepsRef = useRef(1);
  const [chartData, setChartData] = useState<Array<Record<string, number>>>([]);
  const [log, setLog] = useState<string[]>([]);

  const initRace = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setRaceRunning(false);
    const engines = {} as Record<AgentType, SimulationEngine>;
    const states  = {} as Record<AgentType, SimState>;
    for (const type of ALL_AGENT_TYPES) {
      engines[type] = new SimulationEngine(type);
      states[type]  = engines[type].getInitialState();
    }
    setRaceState({ engines, states });
    setChartData([]);
    setLog(['Race initialized — all 4 agents on same maze topology']);
  }, []);

  const stopRace = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setRaceRunning(false);
  }, []);

  const runRaceLoop = useCallback(() => {
    setRaceState(prev => {
      if (!prev) return prev;
      const newStates = { ...prev.states };
      const newChartPoint: Record<string, number> = {};
      const newLogs: string[] = [];
      let anyRunning = false;

      for (const type of ALL_AGENT_TYPES) {
        if (newStates[type].goalReached) {
          newChartPoint[type] = newStates[type].performance;
          continue;
        }
        anyRunning = true;
        let lastState = newStates[type];
        for (let i = 0; i < stepsRef.current; i++) {
          lastState = prev.engines[type].step();
          if (lastState.goalReached) {
            newLogs.push(`${AGENT_META[type].icon} ${AGENT_META[type].label} reached goal in ${lastState.stepCount} steps!`);
            break;
          }
        }
        newStates[type] = lastState;
        newChartPoint[type] = lastState.performance;
      }

      // sample chart every few steps to avoid too many points
      const step = Math.max(...ALL_AGENT_TYPES.map(t => newStates[t].stepCount));
      newChartPoint.step = step;
      setChartData(d => {
        if (d.length === 0 || step - (d[d.length - 1]?.step ?? 0) >= stepsRef.current) {
          return [...d, newChartPoint];
        }
        return d;
      });
      if (newLogs.length) setLog(l => [...l, ...newLogs]);

      if (!anyRunning) {
        setRaceRunning(false);
        return { ...prev, states: newStates };
      }
      return { ...prev, states: newStates };
    });
    rafRef.current = requestAnimationFrame(runRaceLoop);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleRace = useCallback(() => {
    if (raceRunning) {
      stopRace();
    } else {
      setRaceRunning(true);
      rafRef.current = requestAnimationFrame(runRaceLoop);
    }
  }, [raceRunning, stopRace, runRaceLoop]);

  const resetRace = useCallback(() => {
    stopRace();
    setRaceState(null);
    setChartData([]);
    setLog([]);
  }, [stopRace]);

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  return { raceState, raceRunning, initRace, toggleRace, resetRace, chartData, log, stepsRef };
}

// ─── Main App ─────────────────────────────────────────────────
export default function SimulationApp() {
  const [mode, setMode] = useState<'single' | 'race'>('single');

  // ── Single agent state ──────────────────────────────────────
  const [selectedAgent, setSelectedAgent] = useState<AgentType>('qlearning');
  const [simState, setSimState] = useState<SimState | null>(null);
  const [running, setRunning] = useState(false);
  const [stepsPerFrame, setStepsPerFrame] = useState(1);
  const [vizMode, setVizMode] = useState<VisualizationMode>('normal');
  const [log, setLog] = useState<string[]>([]);
  const [chartData, setChartData] = useState<Array<{ step: number; perf: number }>>([]);
  const [activeTab, setActiveTab] = useState<'info' | 'log' | 'compare'>('info');
  const [stepCount, setStepCount] = useState(0);

  const engineRef    = useRef<SimulationEngine | null>(null);
  const rafRef       = useRef<number | null>(null);
  const spfRef       = useRef(1);   // steps-per-frame ref, readable inside RAF closure
  const runningRef   = useRef(false);
  const initialized  = simState !== null;

  // ── Race state ──────────────────────────────────────────────
  const { raceState, raceRunning, initRace, toggleRace, resetRace,
          chartData: raceChartData, log: raceLog, stepsRef: raceStepsRef } = useRaceMode();

  // keep ref in sync
  useEffect(() => { spfRef.current = stepsPerFrame; }, [stepsPerFrame]);

  const addLog = useCallback((msg: string) => {
    if (!msg) return;
    setLog(prev => [...prev.slice(-299), msg]);
  }, []);

  // ── RAF loop for single agent ───────────────────────────────
  const stopAuto = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    runningRef.current = false;
    setRunning(false);
  }, []);

  const rafLoop = useCallback(() => {
    if (!engineRef.current || !runningRef.current) return;
    let lastState: SimState | null = null;
    const n = spfRef.current;

    for (let i = 0; i < n; i++) {
      lastState = engineRef.current.step();
      if (lastState.goalReached) break;
    }

    if (!lastState) return;

    setSimState(lastState);
    setStepCount(lastState.stepCount);
    if (lastState.logEntry) addLog(lastState.logEntry);

    // sample chart: keep max 500 points
    setChartData(prev => {
      const point = { step: lastState!.stepCount, perf: lastState!.performance };
      if (prev.length < 500) return [...prev, point];
      // downsample: keep every other point
      return [...prev.filter((_, i) => i % 2 === 0), point];
    });

    if (lastState.goalReached) {
      addLog(`✓ Goal reached in ${lastState.stepCount} steps! Perf: ${lastState.performance.toFixed(1)}`);
      stopAuto();
      return;
    }

    rafRef.current = requestAnimationFrame(rafLoop);
  }, [addLog, stopAuto]);

  const initialize = useCallback(() => {
    stopAuto();
    const engine = new SimulationEngine(selectedAgent);
    engineRef.current = engine;
    const initState = engine.getInitialState();
    setSimState(initState);
    setChartData([]);
    setLog([`Initialized ${AGENT_META[selectedAgent].label} on ${engine.width}×${engine.height} grid`]);
    setStepCount(0);
    setActiveTab('info');
  }, [selectedAgent, stopAuto]);

  const stepOnce = useCallback(() => {
    if (!engineRef.current) return;
    const state = engineRef.current.step();
    setSimState(state);
    setStepCount(state.stepCount);
    if (state.logEntry) addLog(state.logEntry);
    setChartData(prev => [...prev, { step: state.stepCount, perf: state.performance }]);
    if (state.goalReached) addLog(`✓ Goal reached in ${state.stepCount} steps!`);
  }, [addLog]);

  const toggleAuto = useCallback(() => {
    if (running) {
      stopAuto();
    } else {
      if (!engineRef.current) return;
      runningRef.current = true;
      setRunning(true);
      rafRef.current = requestAnimationFrame(rafLoop);
    }
  }, [running, stopAuto, rafLoop]);

  const reset = useCallback(() => {
    stopAuto();
    setSimState(null);
    engineRef.current = null;
    setLog([]);
    setChartData([]);
    setStepCount(0);
  }, [stopAuto]);

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  const meta = AGENT_META[selectedAgent];

  // ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen relative z-10" style={{ background: 'var(--bg)' }}>

      {/* ── Header ── */}
      <header style={{ borderBottom: '1px solid var(--border)', background: 'rgba(8,12,20,0.95)', backdropFilter: 'blur(16px)' }} className="sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
              style={{ background: 'linear-gradient(135deg, #00d4ff22, #7c3aed22)', border: '1px solid rgba(0,212,255,0.3)' }}>
              🤖
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight" style={{ color: 'var(--neon-blue)' }}>AI Agent Simulation</h1>
              <p className="text-xs text-slate-500 hidden sm:block">Reinforcement Learning Visualizer</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode toggle */}
            <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              {(['single', 'race'] as const).map(m => (
                <button key={m} onClick={() => setMode(m)}
                  className="px-3 py-1.5 text-xs font-medium transition-all"
                  style={{
                    background: mode === m ? 'rgba(0,212,255,0.15)' : 'transparent',
                    color: mode === m ? 'var(--neon-blue)' : '#64748b',
                  }}>
                  {m === 'single' ? '⬛ Single' : '⊞ Race All'}
                </button>
              ))}
            </div>
            {mode === 'single' && (
              <div className="hidden sm:flex items-center gap-2">
                <div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                  Step <span style={{ color: 'var(--neon-blue)' }}>{stepCount}</span>
                </div>
                {simState?.goalReached && (
                  <span className="text-xs px-2 py-1 rounded-full font-mono animate-pulse"
                    style={{ background: 'rgba(0,255,136,0.15)', color: 'var(--neon-green)', border: '1px solid rgba(0,255,136,0.3)' }}>
                    ✓ Goal!
                  </span>
                )}
              </div>
            )}
            {mode === 'race' && raceState && (
              <div className="hidden sm:flex gap-2">
                {ALL_AGENT_TYPES.map(a => {
                  const s = raceState.states[a];
                  return s.goalReached ? (
                    <span key={a} className="text-xs px-2 py-1 rounded-full font-mono"
                      style={{ background: `${AGENT_META[a].color}20`, color: AGENT_META[a].color, border: `1px solid ${AGENT_META[a].color}40` }}>
                      {AGENT_META[a].icon} {s.stepCount}
                    </span>
                  ) : null;
                })}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

        {/* ══════════════ SINGLE AGENT MODE ══════════════ */}
        {mode === 'single' && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">

            {/* Left */}
            <div className="space-y-6">

              {/* Agent selector */}
              <div className="glass rounded-2xl p-4">
                <p className="text-xs text-slate-500 font-mono mb-3 uppercase tracking-widest">Select Agent Type</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ALL_AGENT_TYPES.map(type => {
                    const m = AGENT_META[type];
                    const active = selectedAgent === type;
                    return (
                      <button key={type} onClick={() => setSelectedAgent(type)}
                        className="rounded-xl p-3 text-left transition-all duration-200"
                        style={{
                          background: active ? `${m.color}15` : 'rgba(255,255,255,0.03)',
                          border: active ? `1px solid ${m.color}50` : '1px solid rgba(255,255,255,0.06)',
                          boxShadow: active ? `0 0 16px ${m.color}20` : 'none',
                        }}>
                        <div className="text-xl mb-1">{m.icon}</div>
                        <div className="text-xs font-semibold" style={{ color: active ? m.color : '#94a3b8' }}>{m.label}</div>
                        <div className="text-xs text-slate-600 mt-0.5 leading-4 hidden sm:block">{m.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Grid */}
              <div className="glass rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-slate-300">Grid World</h2>
                    {simState && <span className="text-xs font-mono text-slate-500">{simState.width}×{simState.height}</span>}
                  </div>
                  <div className="flex gap-1">
                    {VIZ_MODES.map(m => (
                      <button key={m.key} onClick={() => setVizMode(m.key)}
                        className="text-xs px-2 py-1 rounded-lg transition-all"
                        style={{
                          background: vizMode === m.key ? 'rgba(0,212,255,0.15)' : 'rgba(255,255,255,0.04)',
                          color: vizMode === m.key ? 'var(--neon-blue)' : '#64748b',
                          border: vizMode === m.key ? '1px solid rgba(0,212,255,0.3)' : '1px solid transparent',
                        }}>
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  {!simState ? (
                    <div className="flex items-center justify-center h-48 rounded-xl text-slate-500 text-sm"
                      style={{ background: 'rgba(0,0,0,0.2)' }}>
                      Select an agent and click <strong className="mx-1 text-[var(--neon-blue)]">Initialize</strong>
                    </div>
                  ) : (
                    <GridCanvas state={simState} vizMode={vizMode} />
                  )}
                </div>
                <div className="flex gap-4 mt-3 flex-wrap">
                  {[{ color: '#00d4ff', label: 'Agent' }, { color: '#00ff88', label: 'Goal' }, { color: '#0a0d16', label: 'Wall' }, { color: '#111827', label: 'Empty' }].map(({ color, label }) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm" style={{ background: color }} />
                      <span className="text-xs text-slate-500">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Performance chart */}
              <div className="glass rounded-2xl p-4">
                <h2 className="text-sm font-semibold text-slate-300 mb-3">Performance Over Time</h2>
                <PerformanceChart history={chartData} />
              </div>

              {/* Comparison table desktop */}
              <div className="hidden lg:block">
                <h2 className="text-sm font-semibold text-slate-400 mb-2">Agent Comparison</h2>
                <ComparisonTable />
              </div>
            </div>

            {/* Right */}
            <div className="space-y-4">

              {/* Controls */}
              <div className="glass rounded-2xl p-4 space-y-3">
                <h2 className="text-sm font-semibold text-slate-300">Controls</h2>

                <button onClick={initialize}
                  className="btn-primary w-full py-2.5 rounded-xl text-sm font-semibold text-white">
                  {initialized ? '↺ Re-initialize' : '▶ Initialize'}
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button onClick={stepOnce}
                    disabled={!initialized || running || (simState?.goalReached ?? false)}
                    className="btn-secondary py-2 rounded-xl text-sm font-medium text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed">
                    Step →
                  </button>
                  <button onClick={toggleAuto}
                    disabled={!initialized || (simState?.goalReached ?? false)}
                    className={`py-2 rounded-xl text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed ${running ? 'btn-danger text-white' : 'btn-success text-white'}`}>
                    {running ? '⏸ Pause' : '▶ Auto'}
                  </button>
                </div>

                <button onClick={reset}
                  className="btn-secondary w-full py-2 rounded-xl text-sm text-slate-400">
                  Reset
                </button>

                {/* Speed selector */}
                <div>
                  <div className="text-xs text-slate-500 mb-2">Speed (steps / frame @ 60fps)</div>
                  <div className="grid grid-cols-6 gap-1">
                    {SPEED_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => { setStepsPerFrame(opt.value); spfRef.current = opt.value; }}
                        className="py-1 rounded-lg text-xs font-mono transition-all"
                        style={{
                          background: stepsPerFrame === opt.value ? 'rgba(0,212,255,0.2)' : 'rgba(255,255,255,0.04)',
                          color: stepsPerFrame === opt.value ? 'var(--neon-blue)' : '#64748b',
                          border: stepsPerFrame === opt.value ? '1px solid rgba(0,212,255,0.4)' : '1px solid transparent',
                        }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <div className="text-xs text-slate-600 mt-1 text-center font-mono">
                    ≈ {(stepsPerFrame * 60).toLocaleString()} steps/sec
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="glass rounded-2xl p-4">
                <div className="flex gap-1 mb-3">
                  {(['info', 'log', 'compare'] as const).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                      className="flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition-all"
                      style={{
                        background: activeTab === tab ? 'rgba(0,212,255,0.12)' : 'rgba(255,255,255,0.03)',
                        color: activeTab === tab ? 'var(--neon-blue)' : '#64748b',
                        border: activeTab === tab ? '1px solid rgba(0,212,255,0.25)' : '1px solid transparent',
                      }}>
                      {tab === 'info' ? '📊 Info' : tab === 'log' ? '📋 Log' : '⚖ Compare'}
                    </button>
                  ))}
                </div>
                {activeTab === 'info'    && <AgentInfoPanel state={simState} />}
                {activeTab === 'log'     && <LogPanel entries={log} />}
                {activeTab === 'compare' && (
                  <div className="text-xs text-slate-500 space-y-2">
                    {COMPARISON_DATA.map(row => (
                      <div key={row.label} className="space-y-1">
                        <div className="text-slate-400 font-semibold">{row.label}</div>
                        <div className="grid grid-cols-2 gap-1">
                          {ALL_AGENT_TYPES.map(a => (
                            <div key={a} className="flex justify-between rounded px-2 py-1" style={{ background: 'rgba(255,255,255,0.04)' }}>
                              <span style={{ color: AGENT_META[a].color }}>{AGENT_META[a].icon}</span>
                              <span className="font-mono">{(row as Record<string, string>)[a]}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Agent highlight */}
              <div className="rounded-2xl p-4" style={{ background: `${meta.color}08`, border: `1px solid ${meta.color}20` }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{meta.icon}</span>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: meta.color }}>{meta.label}</div>
                    <div className="text-xs text-slate-500">{meta.desc}</div>
                  </div>
                </div>
                {selectedAgent === 'qlearning' && (
                  <div className="text-xs text-slate-500 space-y-1 font-mono">
                    <div>α = 0.2  (learning rate)</div>
                    <div>γ = 0.9  (discount factor)</div>
                    <div>ε = 0.3→0.05 (decay)</div>
                    <div className="mt-1 text-slate-600">Q(s,a) ← Q + α[R + γ max Q&apos; - Q]</div>
                  </div>
                )}
                {selectedAgent === 'utility' && (
                  <div className="text-xs text-slate-500 font-mono">
                    <div>γ = 0.9 · ε = 0.2</div>
                    <div className="mt-1 text-slate-600">U(s) = max_a [R + γΣ P·U(s&apos;)]</div>
                  </div>
                )}
                {selectedAgent === 'model' && (
                  <div className="text-xs text-slate-500 font-mono">
                    <div>A* · Manhattan heuristic</div>
                    <div>f(n) = g(n) + h(n)</div>
                  </div>
                )}
                {selectedAgent === 'reflex' && (
                  <div className="text-xs text-slate-500 font-mono">
                    <div>1. At goal → stop</div>
                    <div>2. Goal visible → move toward</div>
                    <div>3. Open cell → explore</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════ RACE MODE ══════════════ */}
        {mode === 'race' && (
          <div className="space-y-6">

            {/* Race controls */}
            <div className="glass rounded-2xl p-4 flex flex-wrap items-center gap-3">
              <h2 className="text-sm font-semibold text-slate-300 mr-2">Race Controls</h2>
              <button onClick={initRace}
                className="btn-primary px-4 py-2 rounded-xl text-sm font-semibold text-white">
                {raceState ? '↺ Re-race' : '▶ Start Race'}
              </button>
              <button onClick={toggleRace}
                disabled={!raceState}
                className={`px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-40 ${raceRunning ? 'btn-danger text-white' : 'btn-success text-white'}`}>
                {raceRunning ? '⏸ Pause' : '▶ Run'}
              </button>
              <button onClick={resetRace}
                className="btn-secondary px-4 py-2 rounded-xl text-sm text-slate-400">
                Reset
              </button>

              {/* Speed */}
              <div className="flex items-center gap-2 ml-auto flex-wrap">
                <span className="text-xs text-slate-500">Speed:</span>
                <div className="flex gap-1">
                  {SPEED_OPTIONS.map(opt => (
                    <button key={opt.value}
                      onClick={() => { raceStepsRef.current = opt.value; }}
                      className="px-2 py-1 rounded-lg text-xs font-mono transition-all"
                      style={{
                        background: raceStepsRef.current === opt.value ? 'rgba(0,212,255,0.2)' : 'rgba(255,255,255,0.04)',
                        color: raceStepsRef.current === opt.value ? 'var(--neon-blue)' : '#64748b',
                        border: raceStepsRef.current === opt.value ? '1px solid rgba(0,212,255,0.4)' : '1px solid transparent',
                      }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 4-grid layout */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              {ALL_AGENT_TYPES.map(type => {
                const m = AGENT_META[type];
                const state = raceState?.states[type] ?? null;
                return (
                  <div key={type} className="glass rounded-2xl p-3 space-y-2"
                    style={{ border: state?.goalReached ? `1px solid ${m.color}60` : undefined,
                             boxShadow: state?.goalReached ? `0 0 20px ${m.color}20` : undefined }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">{m.icon}</span>
                        <span className="text-xs font-semibold" style={{ color: m.color }}>{m.label}</span>
                      </div>
                      {state && (
                        <div className="text-right">
                          {state.goalReached ? (
                            <span className="text-xs font-mono font-bold" style={{ color: m.color }}>✓ {state.stepCount}s</span>
                          ) : (
                            <span className="text-xs font-mono text-slate-500">step {state.stepCount}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="overflow-x-auto">
                      <GridCanvas state={state} vizMode="normal" compact />
                    </div>
                    {state && (
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-slate-500">perf</span>
                        <span className="text-slate-300">{state.performance.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Race chart */}
            <div className="glass rounded-2xl p-4">
              <h2 className="text-sm font-semibold text-slate-300 mb-3">Performance Race</h2>
              <RaceChart data={raceChartData} />
            </div>

            {/* Race log + results */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="glass rounded-2xl p-4">
                <h2 className="text-sm font-semibold text-slate-300 mb-2">Race Log</h2>
                <LogPanel entries={raceLog} />
              </div>
              <div className="glass rounded-2xl p-4">
                <h2 className="text-sm font-semibold text-slate-300 mb-2">Current Standings</h2>
                {raceState ? (
                  <div className="space-y-2">
                    {ALL_AGENT_TYPES
                      .map(a => ({ type: a, state: raceState.states[a] }))
                      .sort((x, y) => y.state.performance - x.state.performance)
                      .map(({ type, state }, rank) => {
                        const m = AGENT_META[type];
                        return (
                          <div key={type} className="flex items-center gap-3 rounded-lg px-3 py-2"
                            style={{ background: 'rgba(255,255,255,0.04)' }}>
                            <span className="text-xs text-slate-600 font-mono w-4">#{rank + 1}</span>
                            <span style={{ color: m.color }}>{m.icon}</span>
                            <span className="text-xs flex-1 text-slate-300">{m.label}</span>
                            <span className="text-xs font-mono text-slate-400">step {state.stepCount}</span>
                            <span className="text-xs font-mono font-semibold" style={{ color: m.color }}>
                              {state.performance.toFixed(1)}
                            </span>
                            {state.goalReached && (
                              <span className="text-xs font-mono" style={{ color: m.color }}>✓</span>
                            )}
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <p className="text-sm text-slate-600">Click <strong className="text-slate-400">Start Race</strong> to begin</p>
                )}
              </div>
            </div>

            {/* Comparison table */}
            <div>
              <h2 className="text-sm font-semibold text-slate-400 mb-2">Agent Comparison</h2>
              <ComparisonTable />
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-12 text-center text-xs text-slate-600 pb-8 space-y-1">
          <p>AI Agent Simulation · Reinforcement Learning Visualizer</p>
          <p>Reflex · Model-Based · Utility-Based · Q-Learning agents on a 15×8 grid world</p>
        </footer>
      </main>
    </div>
  );
}
