/**
 * Web Audio API sound synthesis for Galaga.
 * All sounds are procedurally generated - no external audio files needed.
 */

/** Manages all game audio using the Web Audio API */
export class GameAudio {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private musicEnabled: boolean = false;
  private musicOscillators: OscillatorNode[] = [];
  private tractorOscillator: OscillatorNode | null = null;
  private tractorGain: GainNode | null = null;
  private musicTimeout: ReturnType<typeof setTimeout> | null = null;

  /** Chip-tune melody notes (C major scale) in Hz */
  private readonly MELODY: number[] = [
    261.63, 329.63, 392.0, 523.25, 392.0, 329.63,
    261.63, 220.0, 261.63, 329.63, 293.66, 261.63,
    392.0, 523.25, 659.25, 523.25, 392.0, 329.63,
    261.63, 196.0, 261.63, 329.63, 392.0, 261.63,
  ];

  /**
   * Lazily initializes AudioContext on first user interaction.
   * Must be called after a user gesture to avoid browser autoplay restrictions.
   */
  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Creates a simple envelope gain node.
   */
  private envelope(ctx: AudioContext, attack: number, decay: number, sustain: number, release: number, peak: number = 0.5): GainNode {
    const g = ctx.createGain();
    const now = ctx.currentTime;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(peak, now + attack);
    g.gain.linearRampToValueAtTime(sustain * peak, now + attack + decay);
    g.gain.setValueAtTime(sustain * peak, now + attack + decay);
    g.gain.linearRampToValueAtTime(0, now + attack + decay + release);
    return g;
  }

  /**
   * Plays a short high-pitched blip when player shoots.
   */
  shoot(): void {
    if (!this.enabled) return;
    try {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const gain = this.envelope(ctx, 0.001, 0.02, 0.3, 0.08, 0.3);
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * Low boom explosion when enemy is destroyed.
   */
  enemyExplode(): void {
    if (!this.enabled) return;
    try {
      const ctx = this.getCtx();
      const bufferSize = ctx.sampleRate * 0.25;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.05));
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, ctx.currentTime);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start();
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * Longer dramatic explosion when player ship is destroyed.
   */
  playerExplode(): void {
    if (!this.enabled) return;
    try {
      const ctx = this.getCtx();
      // Noise burst
      const bufferSize = ctx.sampleRate * 0.6;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.15));
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(200, ctx.currentTime);
      filter.Q.setValueAtTime(1, ctx.currentTime);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.7, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start();

      // Pitch drop tone
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.5);
      oscGain.gain.setValueAtTime(0.3, ctx.currentTime);
      oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * Ascending arpeggio when level is complete.
   */
  levelComplete(): void {
    if (!this.enabled) return;
    try {
      const ctx = this.getCtx();
      const notes = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = ctx.currentTime + i * 0.1;
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
        gain.gain.linearRampToValueAtTime(0, startTime + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.15);
      });
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * Descending sad tone on game over.
   */
  gameOver(): void {
    if (!this.enabled) return;
    try {
      const ctx = this.getCtx();
      const notes = [523.25, 440.0, 369.99, 293.66, 220.0, 164.81];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = ctx.currentTime + i * 0.2;
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.35, startTime + 0.05);
        gain.gain.linearRampToValueAtTime(0, startTime + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.25);
      });
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * Starts or stops the eerie tractor beam hum.
   */
  tractorBeam(active: boolean): void {
    if (!this.enabled) {
      this.stopTractorBeam();
      return;
    }
    if (active && !this.tractorOscillator) {
      try {
        const ctx = this.getCtx();
        this.tractorOscillator = ctx.createOscillator();
        this.tractorGain = ctx.createGain();
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.setValueAtTime(3, ctx.currentTime);
        lfoGain.gain.setValueAtTime(30, ctx.currentTime);
        lfo.connect(lfoGain);
        lfoGain.connect(this.tractorOscillator.frequency);
        this.tractorOscillator.type = 'sine';
        this.tractorOscillator.frequency.setValueAtTime(120, ctx.currentTime);
        this.tractorGain.gain.setValueAtTime(0.0, ctx.currentTime);
        this.tractorGain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.3);
        this.tractorOscillator.connect(this.tractorGain);
        this.tractorGain.connect(ctx.destination);
        this.tractorOscillator.start();
        lfo.start();
      } catch {
        // Ignore audio errors
      }
    } else if (!active) {
      this.stopTractorBeam();
    }
  }

  /** Stops the tractor beam oscillator */
  private stopTractorBeam(): void {
    if (this.tractorOscillator && this.tractorGain) {
      try {
        const ctx = this.getCtx();
        this.tractorGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
        this.tractorOscillator.stop(ctx.currentTime + 0.2);
      } catch {
        // Ignore
      }
      this.tractorOscillator = null;
      this.tractorGain = null;
    }
  }

  /**
   * Plays next note in the chip-tune melody loop.
   */
  private playMusicNote(noteIndex: number): void {
    if (!this.musicEnabled || !this.enabled) return;
    try {
      const ctx = this.getCtx();
      const freq = this.MELODY[noteIndex % this.MELODY.length];
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.02);
      gain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 0.1);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);

      if (this.musicEnabled) {
        this.musicTimeout = setTimeout(() => {
          this.playMusicNote(noteIndex + 1);
        }, 200);
      }
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * Toggles background music on/off.
   */
  toggleMusic(): void {
    this.musicEnabled = !this.musicEnabled;
    if (this.musicEnabled) {
      this.playMusicNote(0);
    } else {
      this.stopMusic();
    }
  }

  /**
   * Starts background music if not already playing.
   */
  startMusic(): void {
    if (!this.musicEnabled) return;
    this.playMusicNote(0);
  }

  /**
   * Stops background music loop.
   */
  stopMusic(): void {
    if (this.musicTimeout) {
      clearTimeout(this.musicTimeout);
      this.musicTimeout = null;
    }
    this.musicOscillators.forEach(osc => {
      try { osc.stop(); } catch { /* ignore */ }
    });
    this.musicOscillators = [];
  }

  /**
   * Enables or disables all audio.
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.stopTractorBeam();
      this.stopMusic();
    }
  }

  /** Returns whether audio is currently enabled */
  isEnabled(): boolean {
    return this.enabled;
  }

  /** Returns whether music is currently enabled */
  isMusicEnabled(): boolean {
    return this.musicEnabled;
  }

  /**
   * Sets music enabled state directly (e.g. when restoring from localStorage).
   */
  setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled;
    if (!enabled) {
      this.stopMusic();
    }
  }

  /** Plays a short beep for UI interactions */
  uiBeep(): void {
    if (!this.enabled) return;
    try {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {
      // Ignore audio errors
    }
  }

  /** Plays a 'capture' sound when tractor beam captures ship */
  captureSound(): void {
    if (!this.enabled) return;
    try {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.5);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch {
      // Ignore audio errors
    }
  }

  /** Plays a fanfare when bonus stage begins */
  challengingStageStart(): void {
    if (!this.enabled) return;
    try {
      const ctx = this.getCtx();
      const notes = [392.0, 523.25, 392.0, 523.25, 659.25];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = ctx.currentTime + i * 0.12;
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.25, startTime);
        gain.gain.linearRampToValueAtTime(0, startTime + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.1);
      });
    } catch {
      // Ignore audio errors
    }
  }
}

/** Singleton game audio instance */
export const gameAudio = new GameAudio();
