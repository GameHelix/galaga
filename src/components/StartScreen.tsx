/**
 * Title screen overlay component for Galaga.
 * Shows the GALAGA title, animated enemies, difficulty selector, and controls.
 */

'use client';

import { useState, useEffect } from 'react';
import type { Difficulty } from '@/lib/types';

interface StartScreenProps {
  highScore: number;
  onStart: (difficulty: Difficulty) => void;
  soundEnabled: boolean;
  musicEnabled: boolean;
  onToggleSound: () => void;
  onToggleMusic: () => void;
}

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'EASY',
  medium: 'MEDIUM',
  hard: 'HARD',
};

const DIFFICULTY_DESC: Record<Difficulty, string> = {
  easy: '4 lives  •  Slow',
  medium: '3 lives  •  Normal',
  hard: '3 lives  •  Fast',
};

/**
 * Title screen with difficulty selection and high score display.
 */
export default function StartScreen({
  highScore,
  onStart,
  soundEnabled,
  musicEnabled,
  onToggleSound,
  onToggleMusic,
}: StartScreenProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [blink, setBlink] = useState(true);
  const [enemyFrame, setEnemyFrame] = useState(0);

  // Blinking "press enter" text
  useEffect(() => {
    const interval = setInterval(() => setBlink(b => !b), 600);
    return () => clearInterval(interval);
  }, []);

  // Enemy animation
  useEffect(() => {
    const interval = setInterval(() => setEnemyFrame(f => f + 1), 200);
    return () => clearInterval(interval);
  }, []);

  // Keyboard enter to start
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter') {
        onStart(difficulty);
      }
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        setDifficulty(d => d === 'hard' ? 'medium' : d === 'medium' ? 'easy' : 'easy');
      }
      if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        setDifficulty(d => d === 'easy' ? 'medium' : d === 'medium' ? 'hard' : 'hard');
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [difficulty, onStart]);

  const enemies = ['🟡', '🟣', '🔴'];

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: '32px',
        background: 'transparent',
        color: '#ffffff',
        fontFamily: 'monospace',
        userSelect: 'none',
      }}
    >
      {/* GALAGA Title */}
      <div
        style={{
          fontSize: 'clamp(42px, 10vw, 72px)',
          fontWeight: 'bold',
          letterSpacing: '8px',
          color: '#00d4ff',
          textShadow: '0 0 20px #00d4ff, 0 0 40px #0088aa, 0 0 60px #004466',
          marginBottom: '8px',
        }}
      >
        GALAGA
      </div>

      {/* Scanline subtitle */}
      <div
        style={{
          fontSize: '12px',
          letterSpacing: '4px',
          color: '#ff44aa',
          textShadow: '0 0 8px #ff44aa',
          marginBottom: '24px',
        }}
      >
        © 1981 NAMCO  •  NEON EDITION
      </div>

      {/* Animated enemy preview row */}
      <div
        style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '20px',
          fontSize: '24px',
        }}
      >
        {Array.from({ length: 8 }, (_, i) => (
          <span
            key={i}
            style={{
              transform: `translateY(${Math.sin((enemyFrame * 0.15) + i * 0.7) * 6}px)`,
              display: 'inline-block',
              filter: `drop-shadow(0 0 6px ${i % 2 === 0 ? '#ffcc00' : '#ff44aa'})`,
              transition: 'transform 0.1s',
            }}
          >
            {i % 3 === 0 ? '★' : i % 3 === 1 ? '◆' : '●'}
          </span>
        ))}
      </div>

      {/* Enemy legend */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '6px 24px',
          marginBottom: '20px',
          fontSize: '13px',
          lineHeight: '1.6',
        }}
      >
        <div style={{ color: '#ffcc00', textShadow: '0 0 6px #ff9900' }}>★ BEE          50 pts</div>
        <div style={{ color: '#ffcc00', textShadow: '0 0 6px #ff9900' }}>★ BEE dive   100 pts</div>
        <div style={{ color: '#ff44aa', textShadow: '0 0 6px #cc2288' }}>◆ BUTTERFLY  80 pts</div>
        <div style={{ color: '#ff44aa', textShadow: '0 0 6px #cc2288' }}>◆ BFLY dive 160 pts</div>
        <div style={{ color: '#ff2244', textShadow: '0 0 6px #aa1133' }}>● BOSS      150 pts</div>
        <div style={{ color: '#ff2244', textShadow: '0 0 6px #aa1133' }}>● BOSS dive 400 pts</div>
      </div>

      {/* High Score */}
      <div
        style={{
          marginBottom: '20px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '12px', color: '#888888', letterSpacing: '2px' }}>HIGH SCORE</div>
        <div
          style={{
            fontSize: '28px',
            fontWeight: 'bold',
            color: '#ffcc00',
            textShadow: '0 0 12px #ffcc00',
          }}
        >
          {highScore.toString().padStart(6, '0')}
        </div>
      </div>

      {/* Difficulty selector */}
      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '12px', letterSpacing: '3px', color: '#888888', marginBottom: '10px' }}>
          DIFFICULTY
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
          {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              style={{
                padding: '8px 16px',
                background: difficulty === d ? 'rgba(0, 212, 255, 0.2)' : 'rgba(255,255,255,0.05)',
                border: `2px solid ${difficulty === d ? '#00d4ff' : '#334455'}`,
                color: difficulty === d ? '#00d4ff' : '#666677',
                fontFamily: 'monospace',
                fontSize: '13px',
                fontWeight: 'bold',
                letterSpacing: '1px',
                cursor: 'pointer',
                borderRadius: '4px',
                textShadow: difficulty === d ? '0 0 8px #00d4ff' : 'none',
                boxShadow: difficulty === d ? '0 0 10px rgba(0,212,255,0.3)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {DIFFICULTY_LABELS[d]}
            </button>
          ))}
        </div>
        <div
          style={{
            fontSize: '12px',
            color: '#aaaaaa',
            marginTop: '6px',
          }}
        >
          {DIFFICULTY_DESC[difficulty]}
        </div>
      </div>

      {/* Start button */}
      <button
        onClick={() => onStart(difficulty)}
        style={{
          padding: '14px 40px',
          background: 'rgba(0, 255, 136, 0.12)',
          border: '2px solid #00ff88',
          color: blink ? '#00ff88' : '#007744',
          fontFamily: 'monospace',
          fontSize: '18px',
          fontWeight: 'bold',
          letterSpacing: '4px',
          cursor: 'pointer',
          borderRadius: '4px',
          textShadow: blink ? '0 0 12px #00ff88' : 'none',
          boxShadow: blink ? '0 0 16px rgba(0,255,136,0.4)' : 'none',
          marginBottom: '12px',
          transition: 'all 0.1s',
        }}
      >
        PRESS ENTER
      </button>

      {/* Controls reference */}
      <div
        style={{
          fontSize: '11px',
          color: '#556677',
          textAlign: 'center',
          lineHeight: '1.8',
          marginBottom: '12px',
        }}
      >
        <div>← → / A D : MOVE &nbsp;&nbsp; SPACE / Z : SHOOT</div>
        <div>P / ESC : PAUSE &nbsp;&nbsp; ENTER : START</div>
      </div>

      {/* Sound/Music toggles */}
      <div style={{ display: 'flex', gap: '16px' }}>
        <button
          onClick={onToggleSound}
          style={{
            background: 'transparent',
            border: `1px solid ${soundEnabled ? '#00d4ff' : '#334455'}`,
            color: soundEnabled ? '#00d4ff' : '#446677',
            fontFamily: 'monospace',
            fontSize: '11px',
            padding: '4px 10px',
            cursor: 'pointer',
            borderRadius: '3px',
          }}
        >
          SFX {soundEnabled ? 'ON' : 'OFF'}
        </button>
        <button
          onClick={onToggleMusic}
          style={{
            background: 'transparent',
            border: `1px solid ${musicEnabled ? '#ff44aa' : '#334455'}`,
            color: musicEnabled ? '#ff44aa' : '#446677',
            fontFamily: 'monospace',
            fontSize: '11px',
            padding: '4px 10px',
            cursor: 'pointer',
            borderRadius: '3px',
          }}
        >
          MUSIC {musicEnabled ? 'ON' : 'OFF'}
        </button>
      </div>
    </div>
  );
}
