/**
 * Game-wide constants for canvas dimensions, timing, colors, and configuration.
 */

import type { DifficultyConfig, Difficulty } from './types';

/** Canvas dimensions (portrait orientation) */
export const CANVAS_WIDTH = 480;
export const CANVAS_HEIGHT = 720;

/** Player ship dimensions */
export const PLAYER_WIDTH = 40;
export const PLAYER_HEIGHT = 36;
/** Player Y position (near bottom) */
export const PLAYER_Y = CANVAS_HEIGHT - 80;

/** Bullet dimensions */
export const PLAYER_BULLET_WIDTH = 4;
export const PLAYER_BULLET_HEIGHT = 16;
export const PLAYER_BULLET_SPEED = 12;
export const MAX_PLAYER_BULLETS = 2;

export const ENEMY_BULLET_WIDTH = 4;
export const ENEMY_BULLET_HEIGHT = 12;

/** Formation grid */
export const FORMATION_COLS = 8;
export const FORMATION_ROWS = 5;
export const FORMATION_CELL_W = 52;
export const FORMATION_CELL_H = 48;
/** Top-left of formation grid */
export const FORMATION_START_X = (CANVAS_WIDTH - FORMATION_COLS * FORMATION_CELL_W) / 2;
export const FORMATION_START_Y = 80;
/** Maximum Y the formation will descend to */
export const FORMATION_MAX_Y = 350;
/** Pixels the formation descends per second */
export const FORMATION_DESCENT_RATE = 2;

/** Enemy dimensions */
export const ENEMY_WIDTH = 32;
export const ENEMY_HEIGHT = 28;

/** Enemy point values */
export const POINTS = {
  bee: 50,
  beeDouble: 100,
  butterfly: 80,
  butterflyDouble: 160,
  boss: 150,
  bossDouble: 400,
  bossCaptured: 400,
} as const;

/** Invincibility frames after player respawn */
export const INVINCIBLE_FRAMES = 180;

/** Formation horizontal speed */
export const FORMATION_SPEED_BASE = 0.6;
/** Pixels per frame the formation moves */
export const FORMATION_BOUNCE_X = CANVAS_WIDTH - FORMATION_COLS * FORMATION_CELL_W - FORMATION_START_X;

/** Number of stars per layer */
export const STARS_PER_LAYER = 40;

/** Particle settings */
export const PARTICLE_COUNT_ENEMY = 14;
export const PARTICLE_COUNT_PLAYER = 20;

/** Tractor beam dimensions */
export const TRACTOR_BEAM_WIDTH = 40;
export const TRACTOR_BEAM_MAX_LENGTH = 180;

/** Challenging stage every N levels */
export const CHALLENGING_STAGE_INTERVAL = 3;

/** Level complete display duration (ms) */
export const LEVEL_COMPLETE_DURATION = 120; // frames

/** Neon color palette */
export const COLORS = {
  background: '#000011',
  playerShip: '#00d4ff',
  playerGlow: '#00aadd',
  bee: '#ffcc00',
  beeGlow: '#ff9900',
  butterfly: '#ff44aa',
  butterflyGlow: '#cc2288',
  bossRed: '#ff2244',
  bossBlue: '#4422ff',
  bossGlow: '#aa1133',
  playerBullet: '#00ff88',
  playerBulletGlow: '#00cc66',
  enemyBullet: '#ff6600',
  enemyBulletGlow: '#cc4400',
  tractorBeam: '#88ff88',
  uiText: '#ffffff',
  scoreText: '#00d4ff',
  hud: '#00d4ff',
  explosion: '#ff8800',
  starColor: '#ffffff',
} as const;

/** Difficulty configurations */
export const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
  easy: {
    lives: 4,
    playerSpeed: 6,
    enemySpeed: 1.0,
    diveInterval: 4,
    enemyBulletSpeed: 3.5,
    maxEnemyBullets: 3,
  },
  medium: {
    lives: 3,
    playerSpeed: 5,
    enemySpeed: 1.5,
    diveInterval: 3,
    enemyBulletSpeed: 4.5,
    maxEnemyBullets: 4,
  },
  hard: {
    lives: 3,
    playerSpeed: 5,
    enemySpeed: 2.2,
    diveInterval: 1.5,
    enemyBulletSpeed: 6.5,
    maxEnemyBullets: 6,
  },
};

/** Target FPS */
export const TARGET_FPS = 60;

/** Frames between enemy animation frames */
export const ENEMY_ANIM_INTERVAL = 8;
