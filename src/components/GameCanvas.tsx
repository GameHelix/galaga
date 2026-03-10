/**
 * The main game canvas component.
 * Handles canvas sizing, aspect ratio, and renders the game frame.
 */

'use client';

import { useEffect, type RefObject } from 'react';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/lib/constants';

interface GameCanvasProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
}

/**
 * GameCanvas renders the HTML5 canvas element sized for the game.
 * On desktop it centers the canvas with a neon border.
 * On mobile it scales to fill screen width while maintaining aspect ratio.
 */
export default function GameCanvas({ canvasRef }: GameCanvasProps) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set actual pixel dimensions
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
  }, [canvasRef]);

  return (
    <div className="game-canvas-wrapper">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="game-canvas"
        style={{
          display: 'block',
          imageRendering: 'pixelated',
        }}
      />
    </div>
  );
}
