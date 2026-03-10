/**
 * Pause screen overlay.
 * Semi-transparent dark overlay with PAUSED text and resume/quit options.
 */

'use client';

interface PauseScreenProps {
  onResume: () => void;
  onQuit: () => void;
}

/**
 * Pause screen with semi-transparent overlay and action buttons.
 */
export default function PauseScreen({ onResume, onQuit }: PauseScreenProps) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0, 0, 17, 0.75)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'monospace',
        userSelect: 'none',
      }}
    >
      {/* PAUSED Title */}
      <div
        style={{
          fontSize: '52px',
          fontWeight: 'bold',
          letterSpacing: '8px',
          color: '#00d4ff',
          textShadow: '0 0 20px #00d4ff, 0 0 40px #0088aa',
          marginBottom: '40px',
        }}
      >
        PAUSED
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
        <button
          onClick={onResume}
          style={{
            padding: '12px 48px',
            background: 'rgba(0, 212, 255, 0.12)',
            border: '2px solid #00d4ff',
            color: '#00d4ff',
            fontFamily: 'monospace',
            fontSize: '16px',
            fontWeight: 'bold',
            letterSpacing: '3px',
            cursor: 'pointer',
            borderRadius: '4px',
            textShadow: '0 0 8px #00d4ff',
            boxShadow: '0 0 12px rgba(0,212,255,0.3)',
          }}
        >
          RESUME
        </button>

        <button
          onClick={onQuit}
          style={{
            padding: '12px 48px',
            background: 'rgba(255, 34, 68, 0.1)',
            border: '2px solid rgba(255, 34, 68, 0.6)',
            color: 'rgba(255, 100, 120, 0.9)',
            fontFamily: 'monospace',
            fontSize: '16px',
            fontWeight: 'bold',
            letterSpacing: '3px',
            cursor: 'pointer',
            borderRadius: '4px',
          }}
        >
          QUIT
        </button>
      </div>

      {/* Hint */}
      <div
        style={{
          marginTop: '32px',
          fontSize: '12px',
          color: '#445566',
          letterSpacing: '2px',
        }}
      >
        P / ESC to resume
      </div>
    </div>
  );
}
