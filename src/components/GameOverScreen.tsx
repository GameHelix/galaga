/**
 * Game over screen component.
 * Shows animated "GAME OVER", final score, high score, and options to restart or change difficulty.
 */

'use client';

import { useState, useEffect } from 'react';
import type { Difficulty } from '@/lib/types';

interface GameOverScreenProps {
  score: number;
  highScore: number;
  newHighScore: boolean;
  difficulty: Difficulty;
  onRestart: () => void;
  onChangeDifficulty: () => void;
}

/**
 * Game over screen with pulsing red GAME OVER title and score display.
 */
export default function GameOverScreen({
  score,
  highScore,
  newHighScore,
  difficulty,
  onRestart,
  onChangeDifficulty,
}: GameOverScreenProps) {
  const [pulse, setPulse] = useState(true);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Fade in
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setPulse(p => !p), 500);
    return () => clearInterval(interval);
  }, []);

  // Enter key to restart
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter') onRestart();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onRestart]);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0, 0, 17, 0.88)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'monospace',
        userSelect: 'none',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.4s ease',
      }}
    >
      {/* GAME OVER Title */}
      <div
        style={{
          fontSize: 'clamp(36px, 8vw, 58px)',
          fontWeight: 'bold',
          letterSpacing: '6px',
          color: pulse ? '#ff2244' : '#aa1133',
          textShadow: pulse
            ? '0 0 20px #ff2244, 0 0 40px #880011'
            : '0 0 8px #660011',
          marginBottom: '36px',
          transition: 'all 0.3s',
        }}
      >
        GAME OVER
      </div>

      {/* New high score celebration */}
      {newHighScore && (
        <div
          style={{
            fontSize: '18px',
            color: '#ffcc00',
            textShadow: '0 0 12px #ffcc00',
            marginBottom: '16px',
            letterSpacing: '3px',
            animation: 'none',
          }}
        >
          ★ NEW HIGH SCORE! ★
        </div>
      )}

      {/* Score display */}
      <div style={{ textAlign: 'center', marginBottom: '36px' }}>
        <div style={{ fontSize: '13px', color: '#556677', letterSpacing: '3px', marginBottom: '4px' }}>
          FINAL SCORE
        </div>
        <div
          style={{
            fontSize: '40px',
            fontWeight: 'bold',
            color: '#00d4ff',
            textShadow: '0 0 16px #00d4ff',
          }}
        >
          {score.toString().padStart(6, '0')}
        </div>

        <div
          style={{
            marginTop: '12px',
            fontSize: '13px',
            color: '#556677',
            letterSpacing: '3px',
          }}
        >
          HIGH SCORE
        </div>
        <div
          style={{
            fontSize: '26px',
            fontWeight: 'bold',
            color: '#ffcc00',
            textShadow: '0 0 10px #ffcc00',
          }}
        >
          {highScore.toString().padStart(6, '0')}
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center' }}>
        <button
          onClick={onRestart}
          style={{
            padding: '12px 44px',
            background: 'rgba(0, 255, 136, 0.12)',
            border: '2px solid #00ff88',
            color: '#00ff88',
            fontFamily: 'monospace',
            fontSize: '16px',
            fontWeight: 'bold',
            letterSpacing: '3px',
            cursor: 'pointer',
            borderRadius: '4px',
            textShadow: '0 0 8px #00ff88',
            boxShadow: '0 0 12px rgba(0,255,136,0.3)',
          }}
        >
          PLAY AGAIN
        </button>

        <button
          onClick={onChangeDifficulty}
          style={{
            padding: '10px 44px',
            background: 'transparent',
            border: '2px solid rgba(0, 212, 255, 0.5)',
            color: 'rgba(0, 212, 255, 0.8)',
            fontFamily: 'monospace',
            fontSize: '14px',
            fontWeight: 'bold',
            letterSpacing: '2px',
            cursor: 'pointer',
            borderRadius: '4px',
          }}
        >
          CHANGE DIFFICULTY
        </button>
      </div>

      {/* Difficulty reminder */}
      <div
        style={{
          marginTop: '20px',
          fontSize: '12px',
          color: '#445566',
          letterSpacing: '2px',
        }}
      >
        difficulty: {difficulty.toUpperCase()}
      </div>

      {/* Enter hint */}
      <div
        style={{
          marginTop: '8px',
          fontSize: '11px',
          color: '#334455',
          letterSpacing: '1px',
        }}
      >
        ENTER to play again
      </div>
    </div>
  );
}
