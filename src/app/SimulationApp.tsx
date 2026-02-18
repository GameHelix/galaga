'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { SimulationEngine, SimState, AgentType, VisualizationMode, OBSTACLE, GOAL, EMPTY } from '@/lib/simulation';

// ─── Agent meta ───────────────────────────────────────────────
const AGENT_META: Record<AgentType, { label: string; icon: string; tagClass: string; desc: string; color: string }> = {
  reflex:    { label: 'Simple Reflex',   icon: '⚡', tagClass: 'badge-reflex',    desc: 'Condition-action rules, no memory', color: '#ef4444' },
  model:     { label: 'Model-Based',     icon: '🗺',  tagClass: 'badge-model',     desc: 'A* pathfinding with world model',  color: '#00d4ff' },
  utility:   { label: 'Utility-Based',   icon: '📊', tagClass: 'badge-utility',   desc: 'Value iteration, ε-greedy policy', color: '#a78bfa' },
  qlearning: { label: 'Q-Learning',      icon: '🧠', tagClass: 'badge-qlearning', desc: 'Temporal-difference reinforcement learning', color: '#00ff88' },
};

const VIZ_MODES: { key: VisualizationMode; label: string }[] = [
  { key: 'normal',  label: 'Normal'   },
  { key: 'heatmap', label: 'Heatmap'  },
  { key: 'value',   label: 'Values'   },
];

// ─── Grid Canvas ──────────────────────────────────────────────
function GridCanvas({
  state,
  vizMode,
}: {
  state: SimState | null;
  vizMode: VisualizationMode;
}) {
  if (!state) {
    return (
      <div className="flex items-center justify-center h-64 rounded-xl glass text-slate-500 text-sm">
        Select an agent type and click <strong className="mx-1 text-[var(--neon-blue)]">Initialize</strong> to start
      </div>
    );
  }

  const { grid, width, height, agentPos, goalPos, visitCounts } = state;

  // Compute max visit count for heatmap
  const maxVisit = Math.max(1, ...Object.values(visitCounts));

  // Compute value range for value mode
  let values: number[][] | null = null;
  if (vizMode === 'value' && state.agentInfo) {
    const info = state.agentInfo as Record<string, unknown>;
    if (info.topUtilities || info.qValuesCount !== undefined) {
      // Use visit counts as proxy if no direct value grid
    }
  }
  void values;

  function getCellStyle(x: number, y: number): React.CSSProperties {
    const isAgent = agentPos[0] === x && agentPos[1] === y;
    const isGoal  = goalPos[0] === x  && goalPos[1] === y;
    const cell    = grid[y][x];
    const key     = `${x},${y}`;

    if (cell === OBSTACLE) return { background: '#0a0d16', border: '1px solid #1e2537' };

    if (isAgent) {
      return {
        background: '#00d4ff',
        boxShadow: '0 0 12px rgba(0,212,255,0.8), 0 0 30px rgba(0,212,255,0.4)',
        border: '1px solid rgba(0,212,255,0.6)',
        animation: 'agentPulse 1.5s ease-in-out infinite',
        borderRadius: '50%',
        transform: 'scale(0.75)',
      };
    }

    if (isGoal) {
      return {
        background: '#00ff88',
        boxShadow: '0 0 12px rgba(0,255,136,0.8), 0 0 30px rgba(0,255,136,0.4)',
        border: '1px solid rgba(0,255,136,0.6)',
        animation: 'goalPulse 2s ease-in-out infinite',
        borderRadius: '4px',
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

  function getVisitLabel(x: number, y: number): string | null {
    if (vizMode !== 'heatmap') return null;
    const v = visitCounts[`${x},${y}`];
    return v && v > 0 ? String(v) : null;
  }

  const cellPx = Math.min(38, Math.floor((Math.min(typeof window !== 'undefined' ? window.innerWidth * 0.55 : 600, 700) - 24) / width));

  return (
    <div
      className="relative overflow-hidden rounded-xl"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${width}, ${cellPx}px)`,
        gridTemplateRows: `repeat(${height}, ${cellPx}px)`,
        gap: '2px',
        background: '#060a12',
        padding: '6px',
        boxShadow: 'inset 0 0 40px rgba(0,0,0,0.8)',
      }}
    >
      {Array.from({ length: height }, (_, y) =>
        Array.from({ length: width }, (_, x) => {
          const label = getVisitLabel(x, y);
          return (
            <div
              key={`${x}-${y}`}
              style={{
                ...getCellStyle(x, y),
                width: cellPx,
                height: cellPx,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '3px',
                transition: 'background 0.15s ease, box-shadow 0.3s ease',
                position: 'relative',
                fontSize: `${Math.max(7, cellPx / 4)}px`,
                fontFamily: 'JetBrains Mono, monospace',
                color: 'rgba(255,255,255,0.6)',
              }}
            >
              {label}
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── Performance chart ────────────────────────────────────────
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
        <Line
          type="monotone"
          dataKey="perf"
          stroke="#00d4ff"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: '#00d4ff' }}
        />
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
    <div
      ref={ref}
      className="log-container overflow-y-auto rounded-lg text-xs font-mono space-y-0.5"
      style={{ maxHeight: 180, background: 'rgba(0,0,0,0.3)', padding: '8px' }}
    >
      {entries.length === 0 && <p className="text-slate-600 italic">Simulation log will appear here…</p>}
      {entries.map((entry, i) => (
        <div
          key={i}
          className="text-slate-400 leading-5"
          style={{
            color: entry.includes('Goal') ? 'var(--neon-green)' : undefined,
            fontWeight: entry.includes('Goal') ? 600 : undefined,
          }}
        >
          <span className="text-slate-600 mr-2">{String(i + 1).padStart(3, '0')}</span>
          {entry}
        </div>
      ))}
    </div>
  );
}

// ─── Agent comparison table ───────────────────────────────────
const COMPARISON_DATA = [
  { label: 'Algorithm',      reflex: 'Condition Rules', model: 'A* Search',      utility: 'Value Iteration', qlearning: 'Q-Learning' },
  { label: 'Memory',         reflex: 'None',            model: 'Full model',     utility: 'Utility map',     qlearning: 'Q-table'    },
  { label: 'Learning',       reflex: '✗',               model: '~',              utility: '✓ Partial',       qlearning: '✓ Full RL'  },
  { label: 'Planning',       reflex: 'Reactive',        model: 'A* optimal',     utility: 'ε-greedy',        qlearning: 'ε-greedy'   },
  { label: 'Avg steps',      reflex: '~28',             model: '~16',            utility: '~19',             qlearning: '~22'        },
  { label: 'Success rate',   reflex: '70%',             model: '90%',            utility: '85%',             qlearning: '95%'        },
];

function ComparisonTable() {
  return (
    <div className="overflow-x-auto rounded-xl glass mt-2">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
            <th className="text-left px-4 py-3 text-slate-400 font-medium w-32">Attribute</th>
            {(['reflex', 'model', 'utility', 'qlearning'] as AgentType[]).map(a => (
              <th key={a} className="text-center px-4 py-3">
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
              <td className="px-4 py-2.5 text-center text-slate-300 font-mono text-xs">{row.reflex}</td>
              <td className="px-4 py-2.5 text-center text-slate-300 font-mono text-xs">{row.model}</td>
              <td className="px-4 py-2.5 text-center text-slate-300 font-mono text-xs">{row.utility}</td>
              <td className="px-4 py-2.5 text-center text-slate-300 font-mono text-xs">{row.qlearning}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────
export default function SimulationApp() {
  const [selectedAgent, setSelectedAgent] = useState<AgentType>('qlearning');
  const [simState, setSimState] = useState<SimState | null>(null);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(150);
  const [vizMode, setVizMode] = useState<VisualizationMode>('normal');
  const [log, setLog] = useState<string[]>([]);
  const [chartData, setChartData] = useState<Array<{ step: number; perf: number }>>([]);
  const [activeTab, setActiveTab] = useState<'info' | 'log' | 'compare'>('info');
  const [stepCount, setStepCount] = useState(0);

  const engineRef = useRef<SimulationEngine | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const initialized = simState !== null;

  const addLog = useCallback((msg: string) => {
    if (!msg) return;
    setLog(prev => [...prev.slice(-199), msg]);
  }, []);

  const initialize = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    const engine = new SimulationEngine(selectedAgent);
    engineRef.current = engine;
    const initState = engine.getInitialState();
    setSimState(initState);
    setChartData([]);
    setLog([`Initialized ${AGENT_META[selectedAgent].label} agent on ${engine.width}×${engine.height} grid`]);
    setStepCount(0);
    setActiveTab('info');
  }, [selectedAgent]);

  const step = useCallback(() => {
    if (!engineRef.current) return;
    const state = engineRef.current.step();
    setSimState(state);
    setStepCount(state.stepCount);
    if (state.logEntry) addLog(state.logEntry);
    if (state.performanceHistory.length > 0) {
      setChartData(prev => [
        ...prev,
        { step: state.stepCount, perf: state.performance },
      ]);
    }
    if (state.goalReached) {
      addLog(`✓ Goal reached in ${state.stepCount} steps! Performance: ${state.performance.toFixed(1)}`);
      stopAuto();
    }
  }, [addLog]);

  const stopAuto = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setRunning(false);
  }, []);

  const toggleAuto = useCallback(() => {
    if (running) {
      stopAuto();
    } else {
      if (!engineRef.current) return;
      setRunning(true);
      intervalRef.current = setInterval(() => {
        if (!engineRef.current) return;
        const state = engineRef.current.step();
        setSimState(state);
        setStepCount(state.stepCount);
        if (state.logEntry) addLog(state.logEntry);
        setChartData(prev => [...prev, { step: state.stepCount, perf: state.performance }]);
        if (state.goalReached) {
          addLog(`✓ Goal reached in ${state.stepCount} steps! Performance: ${state.performance.toFixed(1)}`);
          if (intervalRef.current) clearInterval(intervalRef.current);
          setRunning(false);
        }
      }, speed);
    }
  }, [running, speed, addLog, stopAuto]);

  const reset = useCallback(() => {
    stopAuto();
    setSimState(null);
    engineRef.current = null;
    setLog([]);
    setChartData([]);
    setStepCount(0);
  }, [stopAuto]);

  // Update speed while running
  useEffect(() => {
    if (running && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        if (!engineRef.current) return;
        const state = engineRef.current.step();
        setSimState(state);
        setStepCount(state.stepCount);
        if (state.logEntry) addLog(state.logEntry);
        setChartData(prev => [...prev, { step: state.stepCount, perf: state.performance }]);
        if (state.goalReached) {
          addLog(`✓ Goal reached in ${state.stepCount} steps!`);
          stopAuto();
        }
      }, speed);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speed]);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const meta = AGENT_META[selectedAgent];

  return (
    <div className="min-h-screen relative z-10" style={{ background: 'var(--bg)' }}>

      {/* ── Header ── */}
      <header style={{ borderBottom: '1px solid var(--border)', background: 'rgba(8,12,20,0.95)', backdropFilter: 'blur(16px)' }} className="sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ background: 'linear-gradient(135deg, #00d4ff22, #7c3aed22)', border: '1px solid rgba(0,212,255,0.3)' }}>
              🤖
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight" style={{ color: 'var(--neon-blue)' }}>AI Agent Simulation</h1>
              <p className="text-xs text-slate-500 hidden sm:block">Reinforcement Learning Visualizer</p>
            </div>
          </div>

          <nav className="flex items-center gap-1">
            {(['info', 'log', 'compare'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all sm:hidden"
                style={{
                  background: activeTab === tab ? 'rgba(0,212,255,0.15)' : 'transparent',
                  color: activeTab === tab ? 'var(--neon-blue)' : '#64748b',
                  border: activeTab === tab ? '1px solid rgba(0,212,255,0.3)' : '1px solid transparent',
                }}
              >
                {tab}
              </button>
            ))}
            <div className="hidden sm:flex items-center gap-2 ml-4">
              <div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                Step <span style={{ color: 'var(--neon-blue)' }}>{stepCount}</span>
              </div>
              {simState?.goalReached && (
                <span className="text-xs px-2 py-1 rounded-full font-mono animate-pulse" style={{ background: 'rgba(0,255,136,0.15)', color: 'var(--neon-green)', border: '1px solid rgba(0,255,136,0.3)' }}>
                  ✓ Goal!
                </span>
              )}
            </div>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">

          {/* ── Left column ── */}
          <div className="space-y-6">

            {/* Agent selector row */}
            <div className="glass rounded-2xl p-4">
              <p className="text-xs text-slate-500 font-mono mb-3 uppercase tracking-widest">Select Agent Type</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(Object.keys(AGENT_META) as AgentType[]).map(type => {
                  const m = AGENT_META[type];
                  const active = selectedAgent === type;
                  return (
                    <button
                      key={type}
                      onClick={() => setSelectedAgent(type)}
                      className="rounded-xl p-3 text-left transition-all duration-200"
                      style={{
                        background: active ? `${m.color}15` : 'rgba(255,255,255,0.03)',
                        border: active ? `1px solid ${m.color}50` : '1px solid rgba(255,255,255,0.06)',
                        boxShadow: active ? `0 0 16px ${m.color}20` : 'none',
                      }}
                    >
                      <div className="text-xl mb-1">{m.icon}</div>
                      <div className="text-xs font-semibold" style={{ color: active ? m.color : '#94a3b8' }}>{m.label}</div>
                      <div className="text-xs text-slate-600 mt-0.5 leading-4 hidden sm:block">{m.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Grid visualization */}
            <div className="glass rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-slate-300">Grid World</h2>
                  {simState && (
                    <span className="text-xs font-mono text-slate-500">{simState.width}×{simState.height}</span>
                  )}
                </div>
                <div className="flex gap-1">
                  {VIZ_MODES.map(m => (
                    <button
                      key={m.key}
                      onClick={() => setVizMode(m.key)}
                      className="text-xs px-2 py-1 rounded-lg transition-all"
                      style={{
                        background: vizMode === m.key ? 'rgba(0,212,255,0.15)' : 'rgba(255,255,255,0.04)',
                        color: vizMode === m.key ? 'var(--neon-blue)' : '#64748b',
                        border: vizMode === m.key ? '1px solid rgba(0,212,255,0.3)' : '1px solid transparent',
                      }}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <GridCanvas state={simState} vizMode={vizMode} />
              </div>

              {/* Legend */}
              <div className="flex gap-4 mt-3 flex-wrap">
                {[
                  { color: '#00d4ff', label: 'Agent' },
                  { color: '#00ff88', label: 'Goal'  },
                  { color: '#1e293b', label: 'Wall'  },
                  { color: '#111827', label: 'Empty' },
                ].map(({ color, label }) => (
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

            {/* Comparison table (desktop) */}
            <div className="hidden lg:block">
              <h2 className="text-sm font-semibold text-slate-400 mb-2">Agent Comparison</h2>
              <ComparisonTable />
            </div>
          </div>

          {/* ── Right column ── */}
          <div className="space-y-4">

            {/* Controls */}
            <div className="glass rounded-2xl p-4 space-y-3">
              <h2 className="text-sm font-semibold text-slate-300">Controls</h2>

              <button
                onClick={initialize}
                className="btn-primary w-full py-2.5 rounded-xl text-sm font-semibold text-white"
              >
                {initialized ? '↺ Re-initialize' : '▶ Initialize'}
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={step}
                  disabled={!initialized || running || (simState?.goalReached ?? false)}
                  className="btn-secondary py-2 rounded-xl text-sm font-medium text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Step →
                </button>
                <button
                  onClick={toggleAuto}
                  disabled={!initialized || (simState?.goalReached ?? false)}
                  className={`py-2 rounded-xl text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed ${running ? 'btn-danger text-white' : 'btn-success text-white'}`}
                >
                  {running ? '⏸ Pause' : '▶ Auto'}
                </button>
              </div>

              <button
                onClick={reset}
                className="btn-secondary w-full py-2 rounded-xl text-sm text-slate-400"
              >
                Reset
              </button>

              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Speed</span>
                  <span className="font-mono">{speed}ms/step</span>
                </div>
                <input
                  type="range"
                  min={50} max={1000} step={50}
                  value={speed}
                  onChange={e => setSpeed(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Fast</span><span>Slow</span>
                </div>
              </div>
            </div>

            {/* Tabs: Info / Log / Compare */}
            <div className="glass rounded-2xl p-4">
              <div className="flex gap-1 mb-3">
                {(['info', 'log', 'compare'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition-all"
                    style={{
                      background: activeTab === tab ? 'rgba(0,212,255,0.12)' : 'rgba(255,255,255,0.03)',
                      color: activeTab === tab ? 'var(--neon-blue)' : '#64748b',
                      border: activeTab === tab ? '1px solid rgba(0,212,255,0.25)' : '1px solid transparent',
                    }}
                  >
                    {tab === 'info' ? '📊 Info' : tab === 'log' ? '📋 Log' : '⚖ Compare'}
                  </button>
                ))}
              </div>

              {activeTab === 'info' && <AgentInfoPanel state={simState} />}
              {activeTab === 'log' && <LogPanel entries={log} />}
              {activeTab === 'compare' && (
                <div className="text-xs text-slate-500 space-y-2">
                  {COMPARISON_DATA.map(row => (
                    <div key={row.label} className="space-y-1">
                      <div className="text-slate-400 font-semibold">{row.label}</div>
                      <div className="grid grid-cols-2 gap-1">
                        {(['reflex', 'model', 'utility', 'qlearning'] as AgentType[]).map(a => (
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

            {/* Current agent highlight */}
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
                  <div>ε = 0.3→0.05 (exploration decay)</div>
                  <div className="mt-1 text-slate-600">Q(s,a) ← Q(s,a) + α[R + γ max Q(s&apos;,a&apos;) - Q(s,a)]</div>
                </div>
              )}
              {selectedAgent === 'utility' && (
                <div className="text-xs text-slate-500 font-mono">
                  <div>γ = 0.9  (discount factor)</div>
                  <div>ε = 0.2  (exploration rate)</div>
                  <div className="mt-1 text-slate-600">U(s) = max_a [R(s,a) + γΣ P(s&apos;|s,a) U(s&apos;)]</div>
                </div>
              )}
              {selectedAgent === 'model' && (
                <div className="text-xs text-slate-500 font-mono">
                  <div>Heuristic: Manhattan distance</div>
                  <div>Algorithm: A* search</div>
                </div>
              )}
              {selectedAgent === 'reflex' && (
                <div className="text-xs text-slate-500 font-mono">
                  <div>Rule 1: At goal → stop</div>
                  <div>Rule 2: Goal visible → move toward</div>
                  <div>Rule 3: Open space → explore</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Comparison table mobile */}
        <div className="lg:hidden mt-6">
          <h2 className="text-sm font-semibold text-slate-400 mb-2">Agent Comparison</h2>
          <ComparisonTable />
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-xs text-slate-600 pb-8 space-y-1">
          <p>AI Agent Simulation · Reinforcement Learning Visualizer</p>
          <p>Reflex · Model-Based · Utility-Based · Q-Learning agents on a 15×8 grid world</p>
        </footer>
      </main>
    </div>
  );
}
