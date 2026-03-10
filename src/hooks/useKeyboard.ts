/**
 * Keyboard input hook that tracks which keys are currently held down.
 * Also emits one-shot key events for actions like shoot and pause.
 */

import { useEffect, useRef, useCallback } from 'react';

export interface KeyState {
  left: boolean;
  right: boolean;
  shoot: boolean;
  pause: boolean;
  enter: boolean;
}

export interface KeyboardControls {
  /** Current held-key state (checked each frame) */
  keys: React.MutableRefObject<KeyState>;
  /** Consume a one-shot shoot press - returns true once per press */
  consumeShoot: () => boolean;
  /** Consume a one-shot pause press - returns true once per press */
  consumePause: () => boolean;
  /** Consume a one-shot enter press - returns true once per press */
  consumeEnter: () => boolean;
}

/**
 * Tracks keyboard state for game controls.
 * Uses refs to avoid stale closure issues in game loops.
 */
export function useKeyboard(): KeyboardControls {
  const keys = useRef<KeyState>({
    left: false,
    right: false,
    shoot: false,
    pause: false,
    enter: false,
  });

  const shootPending = useRef(false);
  const pausePending = useRef(false);
  const enterPending = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          keys.current.left = true;
          break;
        case 'ArrowRight':
        case 'KeyD':
          keys.current.right = true;
          break;
        case 'Space':
        case 'KeyZ':
          e.preventDefault();
          keys.current.shoot = true;
          shootPending.current = true;
          break;
        case 'KeyP':
        case 'Escape':
          e.preventDefault();
          pausePending.current = true;
          break;
        case 'Enter':
          e.preventDefault();
          enterPending.current = true;
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent): void => {
      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          keys.current.left = false;
          break;
        case 'ArrowRight':
        case 'KeyD':
          keys.current.right = false;
          break;
        case 'Space':
        case 'KeyZ':
          keys.current.shoot = false;
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const consumeShoot = useCallback((): boolean => {
    if (shootPending.current) {
      shootPending.current = false;
      return true;
    }
    return false;
  }, []);

  const consumePause = useCallback((): boolean => {
    if (pausePending.current) {
      pausePending.current = false;
      return true;
    }
    return false;
  }, []);

  const consumeEnter = useCallback((): boolean => {
    if (enterPending.current) {
      enterPending.current = false;
      return true;
    }
    return false;
  }, []);

  return { keys, consumeShoot, consumePause, consumeEnter };
}
