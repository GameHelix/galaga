/**
 * On-screen mobile touch controls for Galaga.
 * Left/right movement buttons at bottom corners, shoot button in center.
 */

'use client';

import { useCallback, type TouchEvent } from 'react';

interface MobileControlsProps {
  onLeft: (pressed: boolean) => void;
  onRight: (pressed: boolean) => void;
  onShoot: () => void;
}

/**
 * Mobile controls overlay with touch-friendly buttons.
 * Uses pointer events for reliable multi-touch handling.
 */
export default function MobileControls({ onLeft, onRight, onShoot }: MobileControlsProps) {
  const handleLeftStart = useCallback((e: TouchEvent | React.PointerEvent) => {
    e.preventDefault();
    onLeft(true);
  }, [onLeft]);

  const handleLeftEnd = useCallback((e: TouchEvent | React.PointerEvent) => {
    e.preventDefault();
    onLeft(false);
  }, [onLeft]);

  const handleRightStart = useCallback((e: TouchEvent | React.PointerEvent) => {
    e.preventDefault();
    onRight(true);
  }, [onRight]);

  const handleRightEnd = useCallback((e: TouchEvent | React.PointerEvent) => {
    e.preventDefault();
    onRight(false);
  }, [onRight]);

  const handleShoot = useCallback((e: TouchEvent | React.PointerEvent) => {
    e.preventDefault();
    onShoot();
  }, [onShoot]);

  return (
    <div
      className="mobile-controls"
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '120px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        pointerEvents: 'none',
        userSelect: 'none',
        zIndex: 10,
      }}
    >
      {/* Left button */}
      <button
        onPointerDown={handleLeftStart}
        onPointerUp={handleLeftEnd}
        onPointerLeave={handleLeftEnd}
        onPointerCancel={handleLeftEnd}
        style={{
          pointerEvents: 'all',
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'rgba(0, 212, 255, 0.15)',
          border: '2px solid rgba(0, 212, 255, 0.6)',
          color: '#00d4ff',
          fontSize: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          boxShadow: '0 0 12px rgba(0, 212, 255, 0.4)',
        }}
        aria-label="Move left"
      >
        ◀
      </button>

      {/* Shoot button */}
      <button
        onPointerDown={handleShoot}
        style={{
          pointerEvents: 'all',
          width: '90px',
          height: '90px',
          borderRadius: '50%',
          background: 'rgba(0, 255, 136, 0.15)',
          border: '2px solid rgba(0, 255, 136, 0.7)',
          color: '#00ff88',
          fontSize: '14px',
          fontWeight: 'bold',
          fontFamily: 'monospace',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          boxShadow: '0 0 16px rgba(0, 255, 136, 0.5)',
          letterSpacing: '1px',
        }}
        aria-label="Shoot"
      >
        FIRE
      </button>

      {/* Right button */}
      <button
        onPointerDown={handleRightStart}
        onPointerUp={handleRightEnd}
        onPointerLeave={handleRightEnd}
        onPointerCancel={handleRightEnd}
        style={{
          pointerEvents: 'all',
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'rgba(0, 212, 255, 0.15)',
          border: '2px solid rgba(0, 212, 255, 0.6)',
          color: '#00d4ff',
          fontSize: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          boxShadow: '0 0 12px rgba(0, 212, 255, 0.4)',
        }}
        aria-label="Move right"
      >
        ▶
      </button>
    </div>
  );
}
