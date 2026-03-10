/**
 * Main game page component.
 * Orchestrates all game screens and renders the canvas with overlays.
 */

'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import GameCanvas from '@/components/GameCanvas';
import MobileControls from '@/components/MobileControls';
import StartScreen from '@/components/StartScreen';
import PauseScreen from '@/components/PauseScreen';
import GameOverScreen from '@/components/GameOverScreen';
import LevelCompleteScreen from '@/components/LevelCompleteScreen';
import { useGalagaGame } from '@/hooks/useGalagaGame';
import type { Difficulty } from '@/lib/types';

/**
 * Main game page. Renders the canvas and conditionally shows overlays
 * based on game status.
 */
export default function GalagaPage() {
  const {
    canvasRef,
    uiState,
    startGame,
    pauseGame,
    resumeGame,
    restartGame,
    setDifficulty,
    toggleSound,
    toggleMusic,
    onMobileLeft,
    onMobileRight,
    onMobileShoot,
  } = useGalagaGame();

  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Detect mobile
  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth <= 540 || 'ontouchstart' in window);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleStart = useCallback((difficulty: Difficulty) => {
    startGame(difficulty);
  }, [startGame]);

  const handleQuit = useCallback(() => {
    // Return to title screen by reloading state
    window.location.reload();
  }, []);

  const handleChangeDifficulty = useCallback(() => {
    // Return to title: just reset status via reload
    window.location.reload();
  }, []);

  return (
    <main
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100vw',
        height: '100vh',
        background: '#000011',
        overflow: 'hidden',
      }}
    >
      {/* Outer glow effect */}
      <div
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        ref={containerRef}
      >
        {/* Canvas */}
        <GameCanvas canvasRef={canvasRef} />

        {/* Overlay container - sized to match canvas */}
        <div
          className="game-overlay"
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: uiState.status === 'playing' || uiState.status === 'challenging' ? 'none' : 'auto',
          }}
        >
          {/* Title / Start screen */}
          {uiState.status === 'title' && (
            <div style={{ pointerEvents: 'auto', width: '100%', height: '100%', position: 'relative' }}>
              <StartScreen
                highScore={uiState.highScore}
                onStart={handleStart}
                soundEnabled={uiState.soundEnabled}
                musicEnabled={uiState.musicEnabled}
                onToggleSound={toggleSound}
                onToggleMusic={toggleMusic}
              />
            </div>
          )}

          {/* Pause screen */}
          {uiState.status === 'paused' && (
            <div style={{ pointerEvents: 'auto', width: '100%', height: '100%', position: 'relative' }}>
              <PauseScreen
                onResume={resumeGame}
                onQuit={handleQuit}
              />
            </div>
          )}

          {/* Game over screen */}
          {uiState.status === 'gameover' && (
            <div style={{ pointerEvents: 'auto', width: '100%', height: '100%', position: 'relative' }}>
              <GameOverScreen
                score={uiState.score}
                highScore={uiState.highScore}
                newHighScore={uiState.newHighScore}
                difficulty={uiState.difficulty}
                onRestart={restartGame}
                onChangeDifficulty={handleChangeDifficulty}
              />
            </div>
          )}

          {/* Level complete screen */}
          {uiState.status === 'levelcomplete' && (
            <div style={{ pointerEvents: 'none', width: '100%', height: '100%', position: 'relative' }}>
              <LevelCompleteScreen
                level={uiState.level}
                score={uiState.score}
              />
            </div>
          )}
        </div>

        {/* Mobile controls - shown during gameplay */}
        {isMobile && (uiState.status === 'playing' || uiState.status === 'challenging') && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
            }}
          >
            <MobileControls
              onLeft={onMobileLeft}
              onRight={onMobileRight}
              onShoot={onMobileShoot}
            />
          </div>
        )}

        {/* HUD icons during play - sound/pause buttons */}
        {(uiState.status === 'playing' || uiState.status === 'challenging') && (
          <div
            style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              display: 'flex',
              gap: '4px',
              zIndex: 20,
              pointerEvents: 'auto',
            }}
          >
            <button
              onClick={pauseGame}
              title="Pause (P)"
              style={{
                background: 'rgba(0,0,17,0.6)',
                border: '1px solid rgba(0,212,255,0.3)',
                color: 'rgba(0,212,255,0.7)',
                fontFamily: 'monospace',
                fontSize: '11px',
                padding: '3px 6px',
                cursor: 'pointer',
                borderRadius: '2px',
              }}
            >
              ⏸
            </button>
            <button
              onClick={toggleSound}
              title="Toggle Sound"
              style={{
                background: 'rgba(0,0,17,0.6)',
                border: '1px solid rgba(0,212,255,0.3)',
                color: uiState.soundEnabled ? 'rgba(0,212,255,0.7)' : 'rgba(80,80,100,0.6)',
                fontFamily: 'monospace',
                fontSize: '11px',
                padding: '3px 6px',
                cursor: 'pointer',
                borderRadius: '2px',
              }}
            >
              {uiState.soundEnabled ? '🔊' : '🔇'}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
