/**
 * Level complete screen overlay.
 * Displays "STAGE CLEAR" with the level number and a brief countdown before next level.
 */

'use client';

import { useEffect, useState } from 'react';

interface LevelCompleteScreenProps {
  level: number;
  score: number;
}

/**
 * Brief level complete overlay that auto-dismisses.
 */
export default function LevelCompleteScreen({ level, score }: LevelCompleteScreenProps) {
  const [scale, setScale] = useState(0.5);
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    // Animate in
    const t1 = setTimeout(() => {
      setScale(1.05);
      setOpacity(1);
    }, 30);
    const t2 = setTimeout(() => {
      setScale(1);
    }, 200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0, 0, 17, 0.7)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'monospace',
        userSelect: 'none',
        opacity,
        transition: 'opacity 0.3s ease',
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
          textAlign: 'center',
        }}
      >
        {/* Stage Clear */}
        <div
          style={{
            fontSize: 'clamp(28px, 7vw, 48px)',
            fontWeight: 'bold',
            letterSpacing: '6px',
            color: '#ffcc00',
            textShadow: '0 0 20px #ffcc00, 0 0 40px #ff9900',
            marginBottom: '16px',
          }}
        >
          STAGE CLEAR
        </div>

        {/* Stage number */}
        <div
          style={{
            fontSize: '22px',
            color: '#00d4ff',
            textShadow: '0 0 10px #00d4ff',
            letterSpacing: '3px',
            marginBottom: '24px',
          }}
        >
          STAGE {level} COMPLETE
        </div>

        {/* Score */}
        <div
          style={{
            fontSize: '14px',
            color: '#aaaaaa',
            letterSpacing: '2px',
            marginBottom: '8px',
          }}
        >
          SCORE
        </div>
        <div
          style={{
            fontSize: '32px',
            fontWeight: 'bold',
            color: '#00d4ff',
            textShadow: '0 0 12px #00d4ff',
            marginBottom: '32px',
          }}
        >
          {score.toString().padStart(6, '0')}
        </div>

        {/* Next stage indicator */}
        <div
          style={{
            fontSize: '14px',
            color: '#556677',
            letterSpacing: '3px',
          }}
        >
          NEXT STAGE: {level + 1}
        </div>
      </div>
    </div>
  );
}
