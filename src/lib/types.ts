/**
 * Core type definitions for the Galaga game.
 * All game entities, state, and configuration types are defined here.
 */

/** Current status of the game state machine */
export type GameStatus = 'title' | 'playing' | 'paused' | 'gameover' | 'levelcomplete' | 'challenging';

/** Player-selected difficulty */
export type Difficulty = 'easy' | 'medium' | 'hard';

/** Enemy type classification */
export type EnemyType = 'bee' | 'butterfly' | 'boss';

/** Current behavioral state of an enemy */
export type EnemyState = 'entering' | 'formation' | 'diving' | 'returning' | 'captured';

/** A 2D point */
export interface Vec2 {
  x: number;
  y: number;
}

/** Parallax star for background rendering */
export interface Star {
  x: number;
  y: number;
  /** 1=slow, 2=medium, 3=fast */
  layer: 1 | 2 | 3;
  brightness: number;
}

/** Player ship entity */
export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Is the player currently alive */
  alive: boolean;
  /** Invincibility frames remaining after respawn */
  invincibleFrames: number;
  /** Whether player has a captured companion ship */
  hasDouble: boolean;
  /** Companion ship X offset (for double ship) */
  doubleOffset: number;
}

/** A bullet fired by player or enemy */
export interface Bullet {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Positive = down (enemy), negative = up (player) */
  vy: number;
  /** 'player' or 'enemy' */
  owner: 'player' | 'enemy';
  /** Color for rendering */
  color: string;
}

/** Animation frame data for enemy wing flap */
export interface EnemyAnimation {
  frame: number;
  timer: number;
}

/** An enemy in the formation or diving */
export interface Enemy {
  id: number;
  type: EnemyType;
  state: EnemyState;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Formation slot row */
  row: number;
  /** Formation slot column */
  col: number;
  /** Home X position in formation */
  formationX: number;
  /** Home Y position in formation */
  formationY: number;
  /** Current health (boss = 2) */
  health: number;
  /** Bezier path waypoints for dive */
  divePath: Vec2[];
  /** Current progress along dive path [0..1] */
  diveT: number;
  /** Speed along dive path */
  diveSpeed: number;
  /** Whether this boss is currently firing tractor beam */
  tractorBeamActive: boolean;
  /** Frames until next shot */
  shootTimer: number;
  animation: EnemyAnimation;
  /** Whether this boss captured a ship */
  hasCapturedShip: boolean;
  /** Point value */
  points: number;
}

/** Tractor beam cone emitted by diving boss */
export interface TractorBeam {
  id: number;
  /** Boss enemy that owns this beam */
  bossId: number;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Beam length */
  length: number;
  /** Whether beam is active */
  active: boolean;
  /** Oscillation timer for visual effect */
  timer: number;
}

/** Explosion particle */
export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Remaining life [0..1] */
  life: number;
  /** Decay per frame */
  decay: number;
  size: number;
  color: string;
}

/** Floating score popup text */
export interface ScorePopup {
  id: number;
  x: number;
  y: number;
  text: string;
  life: number;
  vy: number;
}

/** Challenging stage insect path follower */
export interface ChallengingEnemy {
  id: number;
  type: EnemyType;
  x: number;
  y: number;
  pathIndex: number;
  /** Progress along current path segment [0..1] */
  t: number;
  alive: boolean;
  points: number;
}

/** Difficulty configuration */
export interface DifficultyConfig {
  lives: number;
  playerSpeed: number;
  /** Formation movement speed multiplier */
  enemySpeed: number;
  /** Seconds between dive waves */
  diveInterval: number;
  enemyBulletSpeed: number;
  /** Max simultaneous enemy bullets */
  maxEnemyBullets: number;
}

/** Complete game state snapshot */
export interface GameState {
  status: GameStatus;
  difficulty: Difficulty;
  score: number;
  highScore: number;
  level: number;
  lives: number;
  player: Player;
  enemies: Enemy[];
  playerBullets: Bullet[];
  enemyBullets: Bullet[];
  particles: Particle[];
  tractorBeams: TractorBeam[];
  scorePopups: ScorePopup[];
  stars: Star[];
  /** Challenging stage enemies */
  challengingEnemies: ChallengingEnemy[];
  /** Frame-level timers */
  formationDX: number;
  formationDir: 1 | -1;
  formationBaseY: number;
  diveTimer: number;
  /** Enemy entry animation phase */
  enteringEnemiesLeft: number;
  newHighScore: boolean;
  /** Ticks since level started */
  levelTick: number;
  /** Challenge stage hit count */
  challengeHits: number;
  /** Challenge stage total enemies */
  challengeTotal: number;
  /** Countdown before transitioning from levelcomplete */
  levelCompleteTimer: number;
  /** Whether music is enabled */
  musicEnabled: boolean;
  /** Whether sound is enabled */
  soundEnabled: boolean;
  /** Next ID for new entities */
  nextId: number;
}
