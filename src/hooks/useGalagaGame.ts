/**
 * Main game logic hook for Galaga.
 * All game state stored in refs to avoid stale closures.
 * Exposes canvasRef, a reactive gameStatus/score for UI rendering,
 * and action handlers.
 */

'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import type {
  GameState,
  GameStatus,
  Difficulty,
  Enemy,
  EnemyType,
  Bullet,
  Particle,
  TractorBeam,
  Star,
  ScorePopup,
  Vec2,
  ChallengingEnemy,
  Player,
} from '@/lib/types';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  PLAYER_Y,
  PLAYER_BULLET_SPEED,
  PLAYER_BULLET_WIDTH,
  PLAYER_BULLET_HEIGHT,
  MAX_PLAYER_BULLETS,
  ENEMY_BULLET_WIDTH,
  ENEMY_BULLET_HEIGHT,
  FORMATION_COLS,
  FORMATION_ROWS,
  FORMATION_CELL_W,
  FORMATION_CELL_H,
  FORMATION_START_X,
  FORMATION_START_Y,
  FORMATION_MAX_Y,
  ENEMY_WIDTH,
  ENEMY_HEIGHT,
  POINTS,
  INVINCIBLE_FRAMES,
  STARS_PER_LAYER,
  PARTICLE_COUNT_ENEMY,
  PARTICLE_COUNT_PLAYER,
  TRACTOR_BEAM_WIDTH,
  TRACTOR_BEAM_MAX_LENGTH,
  CHALLENGING_STAGE_INTERVAL,
  LEVEL_COMPLETE_DURATION,
  DIFFICULTY_CONFIGS,
  COLORS,
  ENEMY_ANIM_INTERVAL,
} from '@/lib/constants';
import {
  drawBackground,
  drawPlayer,
  drawEnemy,
  drawBullet,
  drawExplosions,
  drawTractorBeam,
  drawHUD,
  drawScorePopups,
  drawChallengingEnemy,
  drawScanlines,
} from '@/lib/renderer';
import { gameAudio } from '@/lib/audio';
import { useKeyboard } from './useKeyboard';

/** Exposed reactive UI state (subset of full game state) */
export interface GalagaUIState {
  status: GameStatus;
  score: number;
  highScore: number;
  level: number;
  lives: number;
  difficulty: Difficulty;
  newHighScore: boolean;
  soundEnabled: boolean;
  musicEnabled: boolean;
  challengeHits: number;
  challengeTotal: number;
}

/** Return type of useGalagaGame */
export interface GalagaGameControls {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  uiState: GalagaUIState;
  startGame: (difficulty: Difficulty) => void;
  pauseGame: () => void;
  resumeGame: () => void;
  restartGame: () => void;
  setDifficulty: (d: Difficulty) => void;
  toggleSound: () => void;
  toggleMusic: () => void;
  /** Mobile control handlers */
  onMobileLeft: (pressed: boolean) => void;
  onMobileRight: (pressed: boolean) => void;
  onMobileShoot: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

let _nextId = 1;
function genId(): number { return _nextId++; }

function randBetween(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

/** Creates the initial star field */
function createStars(): Star[] {
  const stars: Star[] = [];
  for (let layer = 1; layer <= 3; layer++) {
    for (let i = 0; i < STARS_PER_LAYER; i++) {
      stars.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        layer: layer as 1 | 2 | 3,
        brightness: 0.5 + Math.random() * 0.5,
      });
    }
  }
  return stars;
}

/** Gets the point value for an enemy given its state */
function getEnemyPoints(enemy: Enemy): number {
  const diving = enemy.state === 'diving';
  switch (enemy.type) {
    case 'bee': return diving ? POINTS.beeDouble : POINTS.bee;
    case 'butterfly': return diving ? POINTS.butterflyDouble : POINTS.butterfly;
    case 'boss':
      if (enemy.hasCapturedShip) return POINTS.bossCaptured;
      return diving ? POINTS.bossDouble : POINTS.boss;
  }
}

/** Creates a bezier dive path from enemy position toward player */
function createDivePath(
  startX: number,
  startY: number,
  playerX: number,
  dir: 'left' | 'right' | 'straight'
): Vec2[] {
  const points: Vec2[] = [];
  const steps = 120;
  const exitY = CANVAS_HEIGHT + 60;

  // Control points for bezier curve
  let cp1x: number, cp1y: number, cp2x: number, cp2y: number;

  if (dir === 'left') {
    cp1x = startX - 120;
    cp1y = startY + 100;
    cp2x = playerX - 60;
    cp2y = CANVAS_HEIGHT * 0.6;
  } else if (dir === 'right') {
    cp1x = startX + 120;
    cp1y = startY + 100;
    cp2x = playerX + 60;
    cp2y = CANVAS_HEIGHT * 0.6;
  } else {
    cp1x = startX;
    cp1y = startY + 80;
    cp2x = playerX;
    cp2y = CANVAS_HEIGHT * 0.55;
  }

  const endX = playerX + randBetween(-30, 30);
  const endY = exitY;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    const x = mt * mt * mt * startX + 3 * mt * mt * t * cp1x + 3 * mt * t * t * cp2x + t * t * t * endX;
    const y = mt * mt * mt * startY + 3 * mt * mt * t * cp1y + 3 * mt * t * t * cp2y + t * t * t * endY;
    points.push({ x, y });
  }

  return points;
}

/** Creates a return path from off-screen back to formation */
function createReturnPath(startX: number, formX: number, formY: number): Vec2[] {
  const points: Vec2[] = [];
  const steps = 90;
  const startY = CANVAS_HEIGHT + 60;
  // Wrap around from bottom
  const loopX = startX < CANVAS_WIDTH / 2 ? CANVAS_WIDTH + 60 : -60;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    const cp1x = loopX;
    const cp1y = CANVAS_HEIGHT * 0.5;
    const cp2x = formX;
    const cp2y = formY - 80;
    const x = mt * mt * mt * startX + 3 * mt * mt * t * cp1x + 3 * mt * t * t * cp2x + t * t * t * formX;
    const y = mt * mt * mt * startY + 3 * mt * mt * t * cp1y + 3 * mt * t * t * cp2y + t * t * t * formY;
    points.push({ x, y });
  }
  return points;
}

/** Creates particles for an explosion */
function createExplosion(
  x: number,
  y: number,
  color: string,
  count: number,
  speed: number = 3
): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
    const spd = speed * (0.5 + Math.random() * 1.5);
    particles.push({
      id: genId(),
      x,
      y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      life: 1,
      decay: 0.025 + Math.random() * 0.02,
      size: 2 + Math.random() * 3,
      color,
    });
  }
  return particles;
}

/** Checks if two rectangular entities overlap */
function rectOverlap(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number
): boolean {
  return (
    ax - aw / 2 < bx + bw / 2 &&
    ax + aw / 2 > bx - bw / 2 &&
    ay - ah / 2 < by + bh / 2 &&
    ay + ah / 2 > by - ah / 2
  );
}

/** Creates a fresh player state */
function createPlayer(difficulty: Difficulty): Player {
  return {
    x: CANVAS_WIDTH / 2,
    y: PLAYER_Y,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    alive: true,
    invincibleFrames: 0,
    hasDouble: false,
    doubleOffset: -40,
  };
}

/** Creates a full enemy formation for a given level */
function createFormation(level: number): Enemy[] {
  const enemies: Enemy[] = [];

  for (let row = 0; row < FORMATION_ROWS; row++) {
    for (let col = 0; col < FORMATION_COLS; col++) {
      let type: EnemyType;
      if (row === 0 && col >= 2 && col <= 5) {
        type = 'boss';
      } else if (row === 0) {
        type = 'butterfly'; // fill rest of row 0
      } else if (row <= 2) {
        type = 'butterfly';
      } else {
        type = 'bee';
      }

      // Bosses only in center 4 of row 0
      if (row === 0 && (col < 2 || col > 5)) {
        type = 'butterfly';
      }

      const formX = FORMATION_START_X + col * FORMATION_CELL_W + FORMATION_CELL_W / 2;
      const formY = FORMATION_START_Y + row * FORMATION_CELL_H + FORMATION_CELL_H / 2;

      const baseHealth = type === 'boss' ? 2 : 1;
      let basePoints = 0;
      switch (type) {
        case 'bee': basePoints = POINTS.bee; break;
        case 'butterfly': basePoints = POINTS.butterfly; break;
        case 'boss': basePoints = POINTS.boss; break;
      }

      enemies.push({
        id: genId(),
        type,
        state: 'entering',
        x: col < FORMATION_COLS / 2 ? -40 : CANVAS_WIDTH + 40,
        y: formY,
        width: type === 'boss' ? ENEMY_WIDTH * 1.2 : ENEMY_WIDTH,
        height: type === 'boss' ? ENEMY_HEIGHT * 1.2 : ENEMY_HEIGHT,
        row,
        col,
        formationX: formX,
        formationY: formY,
        health: baseHealth,
        divePath: [],
        diveT: 0,
        diveSpeed: 0.008 + level * 0.001,
        tractorBeamActive: false,
        shootTimer: Math.floor(randBetween(60, 200)),
        animation: { frame: 0, timer: col * 4 },
        hasCapturedShip: false,
        points: basePoints,
      });
    }
  }
  return enemies;
}

/** Creates challenging stage enemies */
function createChallengingEnemies(): ChallengingEnemy[] {
  const enemies: ChallengingEnemy[] = [];
  const types: EnemyType[] = ['bee', 'butterfly', 'bee', 'butterfly', 'bee'];
  const count = 40;
  for (let i = 0; i < count; i++) {
    enemies.push({
      id: genId(),
      type: types[i % types.length],
      x: -60 - i * 30,
      y: CANVAS_HEIGHT * 0.3 + Math.sin(i * 0.5) * 100,
      pathIndex: i,
      t: 0,
      alive: true,
      points: 100,
    });
  }
  return enemies;
}

/** Initial game state */
function createInitialState(difficulty: Difficulty = 'medium'): GameState {
  const config = DIFFICULTY_CONFIGS[difficulty];
  return {
    status: 'title',
    difficulty,
    score: 0,
    highScore: 0,
    level: 1,
    lives: config.lives,
    player: createPlayer(difficulty),
    enemies: [],
    playerBullets: [],
    enemyBullets: [],
    particles: [],
    tractorBeams: [],
    scorePopups: [],
    stars: createStars(),
    challengingEnemies: [],
    formationDX: 0,
    formationDir: 1,
    formationBaseY: 0,
    diveTimer: config.diveInterval * 60,
    enteringEnemiesLeft: 0,
    newHighScore: false,
    levelTick: 0,
    challengeHits: 0,
    challengeTotal: 0,
    levelCompleteTimer: 0,
    musicEnabled: false,
    soundEnabled: true,
    nextId: 1,
  };
}

// ─── Main Hook ────────────────────────────────────────────────────────────────

/**
 * Core game loop hook. All game logic lives here.
 */
export function useGalagaGame(): GalagaGameControls {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<GameState>(createInitialState('medium'));
  const rafRef = useRef<number>(0);
  const tickRef = useRef<number>(0);
  const mobileLeft = useRef(false);
  const mobileRight = useRef(false);
  const mobileShootPending = useRef(false);

  // Reactive UI state - only updated when status changes
  const [uiState, setUiState] = useState<GalagaUIState>({
    status: 'title',
    score: 0,
    highScore: 0,
    level: 1,
    lives: 3,
    difficulty: 'medium',
    newHighScore: false,
    soundEnabled: true,
    musicEnabled: false,
    challengeHits: 0,
    challengeTotal: 0,
  });

  const { keys, consumeShoot, consumePause, consumeEnter } = useKeyboard();

  /** Syncs reactive UI state from game state ref */
  const syncUiState = useCallback(() => {
    const s = stateRef.current;
    setUiState({
      status: s.status,
      score: s.score,
      highScore: s.highScore,
      level: s.level,
      lives: s.lives,
      difficulty: s.difficulty,
      newHighScore: s.newHighScore,
      soundEnabled: s.soundEnabled,
      musicEnabled: s.musicEnabled,
      challengeHits: s.challengeHits,
      challengeTotal: s.challengeTotal,
    });
  }, []);

  // ─── Update Functions ───────────────────────────────────────────────────────

  /** Updates the parallax star field */
  function updateStars(state: GameState): void {
    const speeds = [0.3, 0.7, 1.4];
    state.stars.forEach(star => {
      star.y += speeds[star.layer - 1];
      if (star.y > CANVAS_HEIGHT) {
        star.y = -2;
        star.x = Math.random() * CANVAS_WIDTH;
      }
    });
  }

  /** Updates player movement and shooting */
  function updatePlayer(state: GameState, shoot: boolean): void {
    const { player } = state;
    if (!player.alive) return;

    const config = DIFFICULTY_CONFIGS[state.difficulty];
    const speed = config.playerSpeed;

    if (keys.current.left || mobileLeft.current) {
      player.x = Math.max(player.width / 2 + 4, player.x - speed);
    }
    if (keys.current.right || mobileRight.current) {
      player.x = Math.min(CANVAS_WIDTH - player.width / 2 - 4, player.x + speed);
    }

    if (player.invincibleFrames > 0) {
      player.invincibleFrames--;
    }

    // Shoot
    const wantShoot = shoot || mobileShootPending.current;
    mobileShootPending.current = false;

    if (wantShoot && state.playerBullets.length < MAX_PLAYER_BULLETS) {
      const positions: number[] = [player.x];
      if (player.hasDouble) positions.push(player.x + player.doubleOffset);

      positions.forEach(bx => {
        if (state.playerBullets.length < MAX_PLAYER_BULLETS) {
          state.playerBullets.push({
            id: genId(),
            x: bx,
            y: player.y - player.height / 2,
            width: PLAYER_BULLET_WIDTH,
            height: PLAYER_BULLET_HEIGHT,
            vy: -PLAYER_BULLET_SPEED,
            owner: 'player',
            color: COLORS.playerBullet,
          });
        }
      });
      gameAudio.shoot();
    }
  }

  /** Updates player bullets - move and cull off-screen */
  function updatePlayerBullets(state: GameState): void {
    state.playerBullets = state.playerBullets.filter(b => {
      b.y += b.vy;
      return b.y > -b.height;
    });
  }

  /** Updates enemy bullets - move and cull off-screen */
  function updateEnemyBullets(state: GameState): void {
    state.enemyBullets = state.enemyBullets.filter(b => {
      b.y += b.vy;
      return b.y < CANVAS_HEIGHT + b.height;
    });
  }

  /** Updates particle systems */
  function updateParticles(state: GameState): void {
    state.particles = state.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.life -= p.decay;
      return p.life > 0;
    });
  }

  /** Updates score popups */
  function updateScorePopups(state: GameState): void {
    state.scorePopups = state.scorePopups.filter(popup => {
      popup.y += popup.vy;
      popup.life -= 0.02;
      return popup.life > 0;
    });
  }

  /** Handles enemy entry animation (fly in from sides) */
  function updateEnemyEntry(state: GameState): void {
    const config = DIFFICULTY_CONFIGS[state.difficulty];
    let allInFormation = true;

    state.enemies.forEach(enemy => {
      if (enemy.state !== 'entering') return;
      allInFormation = false;

      const speed = 3 + config.enemySpeed;
      const dx = enemy.formationX - enemy.x;
      const dy = enemy.formationY - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < speed + 1) {
        enemy.x = enemy.formationX;
        enemy.y = enemy.formationY;
        enemy.state = 'formation';
      } else {
        enemy.x += (dx / dist) * speed;
        enemy.y += (dy / dist) * speed;
      }
    });

    if (allInFormation) {
      state.enteringEnemiesLeft = 0;
    }
  }

  /** Moves the enemy formation left/right and slowly descends */
  function updateFormation(state: GameState): void {
    const config = DIFFICULTY_CONFIGS[state.difficulty];
    const levelSpeedBonus = (state.level - 1) * 0.15;
    const speed = (config.enemySpeed + levelSpeedBonus) * 0.6;

    // Update formation offset
    state.formationDX += speed * state.formationDir;

    const maxDX = 60 + state.level * 5;
    if (Math.abs(state.formationDX) > maxDX) {
      state.formationDir = state.formationDir === 1 ? -1 : 1;
      state.formationDX = Math.sign(state.formationDX) * maxDX;
    }

    // Slow descent
    const descentRate = 0.008;
    if (state.formationBaseY < FORMATION_MAX_Y - FORMATION_START_Y) {
      state.formationBaseY += descentRate;
    }

    // Apply to formation enemies
    state.enemies.forEach(enemy => {
      if (enemy.state === 'formation') {
        enemy.x = enemy.formationX + state.formationDX;
        enemy.y = enemy.formationY + state.formationBaseY;
      }
    });
  }

  /** Handles diving enemies following bezier paths */
  function updateDiving(state: GameState): void {
    const config = DIFFICULTY_CONFIGS[state.difficulty];
    const levelSpeedBonus = 1 + (state.level - 1) * 0.08;

    state.enemies.forEach(enemy => {
      if (enemy.state !== 'diving' && enemy.state !== 'returning') return;

      enemy.diveT += enemy.diveSpeed * levelSpeedBonus;

      if (enemy.state === 'diving') {
        const idx = Math.min(Math.floor(enemy.diveT * (enemy.divePath.length - 1)), enemy.divePath.length - 1);
        enemy.x = enemy.divePath[idx].x;
        enemy.y = enemy.divePath[idx].y;

        // Tractor beam for boss
        if (enemy.type === 'boss' && enemy.y > CANVAS_HEIGHT * 0.3 && enemy.y < CANVAS_HEIGHT * 0.7) {
          if (!enemy.tractorBeamActive && Math.random() < 0.005) {
            enemy.tractorBeamActive = true;
            const beam: TractorBeam = {
              id: genId(),
              bossId: enemy.id,
              x: enemy.x,
              y: enemy.y + enemy.height / 2,
              width: TRACTOR_BEAM_WIDTH,
              height: TRACTOR_BEAM_MAX_LENGTH,
              length: 0,
              active: true,
              timer: 0,
            };
            state.tractorBeams.push(beam);
            gameAudio.tractorBeam(true);
          }
        }

        // Enemy shooting while diving
        enemy.shootTimer--;
        if (enemy.shootTimer <= 0 && state.enemyBullets.length < config.maxEnemyBullets) {
          const bulletSpeed = config.enemyBulletSpeed;
          state.enemyBullets.push({
            id: genId(),
            x: enemy.x,
            y: enemy.y + enemy.height / 2,
            width: ENEMY_BULLET_WIDTH,
            height: ENEMY_BULLET_HEIGHT,
            vy: bulletSpeed,
            owner: 'enemy',
            color: COLORS.enemyBullet,
          });
          enemy.shootTimer = Math.floor(randBetween(40, 120));
        }

        // Reached end of dive path
        if (enemy.diveT >= 1) {
          enemy.state = 'returning';
          enemy.diveT = 0;
          enemy.tractorBeamActive = false;
          // Remove tractor beams from this boss
          state.tractorBeams = state.tractorBeams.filter(b => b.bossId !== enemy.id);
          gameAudio.tractorBeam(false);

          const returnPath = createReturnPath(enemy.x, enemy.formationX + state.formationDX, enemy.formationY + state.formationBaseY);
          enemy.divePath = returnPath;
        }
      } else if (enemy.state === 'returning') {
        const idx = Math.min(Math.floor(enemy.diveT * (enemy.divePath.length - 1)), enemy.divePath.length - 1);
        enemy.x = enemy.divePath[idx].x;
        enemy.y = enemy.divePath[idx].y;

        if (enemy.diveT >= 1) {
          enemy.state = 'formation';
          enemy.diveT = 0;
          enemy.divePath = [];
          enemy.tractorBeamActive = false;
        }
      }
    });
  }

  /** Updates tractor beams */
  function updateTractorBeams(state: GameState): void {
    state.tractorBeams = state.tractorBeams.filter(beam => {
      const boss = state.enemies.find(e => e.id === beam.bossId);
      if (!boss || !beam.active) return false;

      beam.x = boss.x;
      beam.y = boss.y + boss.height / 2;
      beam.timer++;
      if (beam.length < TRACTOR_BEAM_MAX_LENGTH) {
        beam.length += 4;
      }

      // Check if player is in beam
      const { player } = state;
      if (
        player.alive &&
        player.invincibleFrames === 0 &&
        !boss.hasCapturedShip &&
        rectOverlap(
          player.x, player.y, player.width, player.height,
          beam.x, beam.y + beam.length / 2, beam.width, beam.length
        )
      ) {
        // Capture player
        boss.hasCapturedShip = true;
        beam.active = false;
        state.lives--;
        player.alive = false;
        state.particles.push(...createExplosion(player.x, player.y, COLORS.playerShip, PARTICLE_COUNT_PLAYER, 4));
        gameAudio.captureSound();
        gameAudio.tractorBeam(false);

        // Respawn player if lives remain
        setTimeout(() => {
          if (state.lives > 0 && state.status !== 'gameover') {
            state.player = createPlayer(state.difficulty);
            state.player.invincibleFrames = INVINCIBLE_FRAMES;
            syncUiState();
          }
        }, 2000);

        syncUiState();
      }

      // Auto-deactivate after a while
      if (beam.timer > 180) {
        beam.active = false;
        boss.tractorBeamActive = false;
        gameAudio.tractorBeam(false);
        return false;
      }

      return beam.active;
    });
  }

  /** Triggers dive waves */
  function updateDiveTrigger(state: GameState): void {
    const config = DIFFICULTY_CONFIGS[state.difficulty];
    const intervalFrames = config.diveInterval * 60;
    const levelBonus = Math.max(0.5, 1 - (state.level - 1) * 0.08);

    state.diveTimer--;
    if (state.diveTimer <= 0) {
      state.diveTimer = Math.floor(intervalFrames * levelBonus);

      // Pick 1-3 formation enemies to dive
      const formationEnemies = state.enemies.filter(e => e.state === 'formation');
      if (formationEnemies.length === 0) return;

      const diveCount = Math.min(
        formationEnemies.length,
        1 + Math.floor(Math.random() * Math.min(3, 1 + state.level))
      );

      // Prefer lower rows (indices 3-4) for dive
      const shuffled = [...formationEnemies].sort((a, b) => {
        const aScore = a.row * 2 + Math.random();
        const bScore = b.row * 2 + Math.random();
        return bScore - aScore;
      });

      for (let i = 0; i < diveCount; i++) {
        const enemy = shuffled[i];
        const dirs: ('left' | 'right' | 'straight')[] = ['left', 'right', 'straight'];
        const dir = dirs[Math.floor(Math.random() * dirs.length)];
        const playerX = state.player.alive ? state.player.x : CANVAS_WIDTH / 2;
        enemy.state = 'diving';
        enemy.diveT = 0;
        enemy.divePath = createDivePath(enemy.x, enemy.y, playerX, dir);
        enemy.tractorBeamActive = false;
      }
    }
  }

  /** Enemy formation shooting at player */
  function updateEnemyFormationShoot(state: GameState): void {
    const config = DIFFICULTY_CONFIGS[state.difficulty];
    if (state.enemyBullets.length >= config.maxEnemyBullets) return;

    // Bottom-row enemies shoot occasionally
    const shooters = state.enemies.filter(e => e.state === 'formation' && e.row >= 3);
    if (shooters.length === 0) return;

    const shooter = shooters[Math.floor(Math.random() * shooters.length)];
    shooter.shootTimer--;
    if (shooter.shootTimer <= 0) {
      shooter.shootTimer = Math.floor(randBetween(90, 240));
      if (state.enemyBullets.length < config.maxEnemyBullets) {
        state.enemyBullets.push({
          id: genId(),
          x: shooter.x,
          y: shooter.y + shooter.height / 2,
          width: ENEMY_BULLET_WIDTH,
          height: ENEMY_BULLET_HEIGHT,
          vy: config.enemyBulletSpeed,
          owner: 'enemy',
          color: COLORS.enemyBullet,
        });
      }
    }
  }

  /** Checks player bullet vs enemy collisions */
  function checkPlayerBulletCollisions(state: GameState): void {
    const toRemoveBullets = new Set<number>();
    const toRemoveEnemies = new Set<number>();

    state.playerBullets.forEach(bullet => {
      state.enemies.forEach(enemy => {
        if (toRemoveEnemies.has(enemy.id)) return;
        if (!rectOverlap(
          bullet.x, bullet.y, bullet.width, bullet.height,
          enemy.x, enemy.y, enemy.width, enemy.height
        )) return;

        toRemoveBullets.add(bullet.id);
        enemy.health--;

        if (enemy.health <= 0) {
          const pts = getEnemyPoints(enemy);
          state.score += pts;

          // Check if this boss had a captured ship - release it
          if (enemy.type === 'boss' && enemy.hasCapturedShip) {
            // Double ship bonus - let the freed ship join player
            state.player.hasDouble = true;
            state.player.doubleOffset = -44;
          }

          toRemoveEnemies.add(enemy.id);

          // Explosion particles
          const color = enemy.type === 'bee' ? COLORS.bee
            : enemy.type === 'butterfly' ? COLORS.butterfly
            : COLORS.bossRed;
          state.particles.push(...createExplosion(enemy.x, enemy.y, color, PARTICLE_COUNT_ENEMY));

          // Score popup
          state.scorePopups.push({
            id: genId(),
            x: enemy.x,
            y: enemy.y,
            text: `+${pts}`,
            life: 1,
            vy: -0.8,
          });

          // Remove associated tractor beams
          state.tractorBeams = state.tractorBeams.filter(b => b.bossId !== enemy.id);

          gameAudio.enemyExplode();
        }
      });
    });

    state.playerBullets = state.playerBullets.filter(b => !toRemoveBullets.has(b.id));
    state.enemies = state.enemies.filter(e => !toRemoveEnemies.has(e.id));
  }

  /** Checks enemy bullet vs player collisions */
  function checkEnemyBulletCollisions(state: GameState): void {
    if (!state.player.alive || state.player.invincibleFrames > 0) return;

    const toRemoveBullets = new Set<number>();

    state.enemyBullets.forEach(bullet => {
      if (rectOverlap(
        bullet.x, bullet.y, bullet.width, bullet.height,
        state.player.x, state.player.y, state.player.width, state.player.height
      )) {
        toRemoveBullets.add(bullet.id);
        killPlayer(state);
      }
    });

    state.enemyBullets = state.enemyBullets.filter(b => !toRemoveBullets.has(b.id));
  }

  /** Checks direct enemy collision with player (when diving enemy hits ship) */
  function checkEnemyPlayerCollision(state: GameState): void {
    if (!state.player.alive || state.player.invincibleFrames > 0) return;

    state.enemies.forEach(enemy => {
      if (enemy.state !== 'diving') return;
      if (rectOverlap(
        enemy.x, enemy.y, enemy.width * 0.7, enemy.height * 0.7,
        state.player.x, state.player.y, state.player.width * 0.8, state.player.height * 0.8
      )) {
        killPlayer(state);
      }
    });
  }

  /** Kills the player, decrements lives, checks game over */
  function killPlayer(state: GameState): void {
    if (!state.player.alive) return;
    state.player.alive = false;
    state.player.hasDouble = false;
    state.lives--;
    state.particles.push(...createExplosion(state.player.x, state.player.y, COLORS.playerShip, PARTICLE_COUNT_PLAYER, 5));
    gameAudio.playerExplode();
    syncUiState();
  }

  /** Respawns player if lives remain, otherwise triggers game over */
  function checkRespawn(state: GameState): void {
    if (state.player.alive) return;

    // Check if respawn is already pending (particles still fading)
    const hasRecentExplosion = state.particles.some(
      p => p.color === COLORS.playerShip && p.life > 0.5
    );

    if (!hasRecentExplosion) {
      if (state.lives > 0) {
        state.player = createPlayer(state.difficulty);
        state.player.invincibleFrames = INVINCIBLE_FRAMES;
        state.enemyBullets = []; // Clear enemy bullets on respawn
      } else {
        // Game over
        state.status = 'gameover';
        gameAudio.gameOver();

        // Update high score
        if (state.score > state.highScore) {
          state.highScore = state.score;
          state.newHighScore = true;
          try {
            localStorage.setItem('galaga-highscore', state.score.toString());
          } catch { /* ignore */ }
        }
        syncUiState();
      }
    }
  }

  /** Checks if all enemies are defeated → level complete */
  function checkLevelComplete(state: GameState): void {
    if (state.enemies.length === 0 && state.enteringEnemiesLeft === 0) {
      state.status = 'levelcomplete';
      state.levelCompleteTimer = LEVEL_COMPLETE_DURATION;
      gameAudio.levelComplete();
      syncUiState();
    }
  }

  /** Counts down level complete timer and advances level */
  function updateLevelComplete(state: GameState): void {
    state.levelCompleteTimer--;
    if (state.levelCompleteTimer <= 0) {
      state.level++;
      const isChallenging = state.level % CHALLENGING_STAGE_INTERVAL === 0;

      if (isChallenging) {
        state.status = 'challenging';
        state.challengingEnemies = createChallengingEnemies();
        state.challengeHits = 0;
        state.challengeTotal = state.challengingEnemies.length;
        gameAudio.challengingStageStart();
      } else {
        state.status = 'playing';
        state.enemies = createFormation(state.level);
        state.enteringEnemiesLeft = state.enemies.length;
        state.formationDX = 0;
        state.formationDir = 1;
        state.formationBaseY = 0;
        state.playerBullets = [];
        state.enemyBullets = [];
        const config = DIFFICULTY_CONFIGS[state.difficulty];
        state.diveTimer = Math.floor(config.diveInterval * 60);
      }
      state.levelTick = 0;
      syncUiState();
    }
  }

  /** Updates challenging stage */
  function updateChallenging(state: GameState): void {
    const speed = 4;

    state.challengingEnemies.forEach(enemy => {
      if (!enemy.alive) return;
      enemy.x += speed;
      enemy.y = CANVAS_HEIGHT * 0.25 + Math.sin((enemy.x / CANVAS_WIDTH) * Math.PI * 3 + enemy.pathIndex * 0.4) * 140;

      // Off screen → remove
      if (enemy.x > CANVAS_WIDTH + 60) {
        enemy.alive = false;
      }
    });

    // Player shooting in challenging stage
    const shoot = consumeShoot();
    if (shoot || mobileShootPending.current) {
      mobileShootPending.current = false;
      if (state.playerBullets.length < MAX_PLAYER_BULLETS) {
        state.playerBullets.push({
          id: genId(),
          x: state.player.x,
          y: state.player.y - state.player.height / 2,
          width: PLAYER_BULLET_WIDTH,
          height: PLAYER_BULLET_HEIGHT,
          vy: -PLAYER_BULLET_SPEED,
          owner: 'player',
          color: COLORS.playerBullet,
        });
        gameAudio.shoot();
      }
    }

    // Move player in challenging stage
    const config = DIFFICULTY_CONFIGS[state.difficulty];
    if (keys.current.left || mobileLeft.current) {
      state.player.x = Math.max(state.player.width / 2 + 4, state.player.x - config.playerSpeed);
    }
    if (keys.current.right || mobileRight.current) {
      state.player.x = Math.min(CANVAS_WIDTH - state.player.width / 2 - 4, state.player.x + config.playerSpeed);
    }

    updatePlayerBullets(state);

    // Check bullet vs challenging enemy
    state.playerBullets.forEach(bullet => {
      state.challengingEnemies.forEach(enemy => {
        if (!enemy.alive) return;
        if (rectOverlap(bullet.x, bullet.y, bullet.width, bullet.height, enemy.x, enemy.y, 32, 28)) {
          enemy.alive = false;
          state.score += enemy.points;
          state.challengeHits++;
          state.particles.push(...createExplosion(enemy.x, enemy.y, COLORS.bee, 10));
          state.scorePopups.push({
            id: genId(),
            x: enemy.x,
            y: enemy.y,
            text: `+${enemy.points}`,
            life: 1,
            vy: -0.8,
          });
          gameAudio.enemyExplode();
        }
      });
    });

    updateParticles(state);
    updateScorePopups(state);
    updateStars(state);

    // Check if all challenging enemies gone
    const allGone = state.challengingEnemies.every(e => !e.alive);
    if (allGone) {
      // Bonus for hitting all
      if (state.challengeHits === state.challengeTotal) {
        state.score += 10000;
        state.scorePopups.push({
          id: genId(),
          x: CANVAS_WIDTH / 2,
          y: CANVAS_HEIGHT / 2,
          text: 'PERFECT! +10000',
          life: 1,
          vy: -0.5,
        });
      }
      state.status = 'levelcomplete';
      state.levelCompleteTimer = LEVEL_COMPLETE_DURATION;
      gameAudio.levelComplete();
      syncUiState();
    }
  }

  /** Updates enemy animations */
  function updateEnemyAnimations(state: GameState): void {
    state.enemies.forEach(enemy => {
      enemy.animation.timer++;
    });
  }

  // ─── Main Render/Update ────────────────────────────────────────────────────

  /** Renders one frame to canvas */
  function renderFrame(state: GameState, canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const tick = tickRef.current;

    drawBackground(ctx, state.stars);

    if (state.status === 'playing' || state.status === 'paused') {
      // Draw tractor beams
      state.tractorBeams.forEach(beam => drawTractorBeam(ctx, beam));
      // Draw enemies
      state.enemies.forEach(enemy => drawEnemy(ctx, enemy));
      // Draw bullets
      state.playerBullets.forEach(b => drawBullet(ctx, b));
      state.enemyBullets.forEach(b => drawBullet(ctx, b));
      // Draw particles
      drawExplosions(ctx, state.particles);
      // Draw player
      drawPlayer(ctx, state.player, tick);
      // Draw score popups
      drawScorePopups(ctx, state.scorePopups);
      // HUD
      drawHUD(ctx, state.score, state.lives, state.level, state.highScore, state.newHighScore, tick, state.player.x, state.player.width);
    } else if (state.status === 'challenging') {
      state.challengingEnemies.forEach(e => drawChallengingEnemy(ctx, e));
      state.playerBullets.forEach(b => drawBullet(ctx, b));
      drawExplosions(ctx, state.particles);
      drawPlayer(ctx, state.player, tick);
      drawScorePopups(ctx, state.scorePopups);
      drawHUD(ctx, state.score, state.lives, state.level, state.highScore, state.newHighScore, tick, state.player.x, state.player.width);

      // "CHALLENGING STAGE" overlay text
      ctx.save();
      ctx.font = 'bold 28px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffcc00';
      ctx.shadowColor = '#ffcc00';
      ctx.shadowBlur = 15;
      ctx.fillText('-- CHALLENGING STAGE --', CANVAS_WIDTH / 2, 50);
      ctx.restore();
    }

    drawScanlines(ctx);
  }

  // ─── Game Loop ─────────────────────────────────────────────────────────────

  const gameLoop = useCallback(() => {
    rafRef.current = requestAnimationFrame(gameLoop);
    tickRef.current++;

    const state = stateRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const shoot = consumeShoot();
    const pause = consumePause();
    const enter = consumeEnter();

    updateStars(state);

    switch (state.status) {
      case 'title': {
        renderFrame(state, canvas);
        // Title screen - just animate stars
        if (enter) {
          // Enter consumed in StartScreen component
        }
        break;
      }

      case 'playing': {
        if (pause) {
          state.status = 'paused';
          syncUiState();
          break;
        }
        if (enter) {
          state.status = 'paused';
          syncUiState();
          break;
        }

        state.levelTick++;

        updateEnemyAnimations(state);
        updateEnemyEntry(state);
        updateFormation(state);
        updateDiving(state);
        updateTractorBeams(state);
        updateDiveTrigger(state);
        updateEnemyFormationShoot(state);
        updatePlayer(state, shoot);
        updatePlayerBullets(state);
        updateEnemyBullets(state);
        checkPlayerBulletCollisions(state);
        checkEnemyBulletCollisions(state);
        checkEnemyPlayerCollision(state);
        updateParticles(state);
        updateScorePopups(state);
        checkRespawn(state);

        if (state.status === 'playing') {
          checkLevelComplete(state);
        }

        // Update high score
        if (state.score > state.highScore) {
          state.highScore = state.score;
          state.newHighScore = true;
          try { localStorage.setItem('galaga-highscore', state.score.toString()); } catch { /* ignore */ }
        }

        renderFrame(state, canvas);
        break;
      }

      case 'paused': {
        if (pause || enter) {
          state.status = 'playing';
          syncUiState();
        }
        renderFrame(state, canvas);
        break;
      }

      case 'levelcomplete': {
        updateParticles(state);
        updateScorePopups(state);
        renderFrame(state, canvas);
        updateLevelComplete(state);
        break;
      }

      case 'challenging': {
        updateChallenging(state);
        renderFrame(state, canvas);
        break;
      }

      case 'gameover': {
        updateParticles(state);
        renderFrame(state, canvas);
        if (enter) {
          // Handled by GameOverScreen
        }
        break;
      }
    }

    // Periodic sync (every 30 frames)
    if (tickRef.current % 30 === 0) {
      syncUiState();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consumeShoot, consumePause, consumeEnter, syncUiState]);

  // Start/stop loop
  useEffect(() => {
    rafRef.current = requestAnimationFrame(gameLoop);
    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [gameLoop]);

  // Load high score from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('galaga-highscore');
      if (saved) {
        const hs = parseInt(saved, 10);
        if (!isNaN(hs)) {
          stateRef.current.highScore = hs;
          syncUiState();
        }
      }
      const savedSound = localStorage.getItem('galaga-sound');
      if (savedSound === 'false') {
        stateRef.current.soundEnabled = false;
        gameAudio.setEnabled(false);
      }
    } catch { /* ignore */ }
  }, [syncUiState]);

  // ─── Exposed Actions ────────────────────────────────────────────────────────

  const startGame = useCallback((difficulty: Difficulty) => {
    const config = DIFFICULTY_CONFIGS[difficulty];
    const highScore = stateRef.current.highScore;
    const soundEnabled = stateRef.current.soundEnabled;
    const musicEnabled = stateRef.current.musicEnabled;

    stateRef.current = {
      ...createInitialState(difficulty),
      highScore,
      soundEnabled,
      musicEnabled,
      status: 'playing',
      lives: config.lives,
      enemies: createFormation(1),
      enteringEnemiesLeft: FORMATION_ROWS * FORMATION_COLS,
      diveTimer: Math.floor(config.diveInterval * 60 * 1.5), // Extra delay at start
    };
    syncUiState();

    if (musicEnabled) {
      gameAudio.startMusic();
    }
  }, [syncUiState]);

  const pauseGame = useCallback(() => {
    const state = stateRef.current;
    if (state.status === 'playing') {
      state.status = 'paused';
      syncUiState();
    }
  }, [syncUiState]);

  const resumeGame = useCallback(() => {
    const state = stateRef.current;
    if (state.status === 'paused') {
      state.status = 'playing';
      syncUiState();
    }
  }, [syncUiState]);

  const restartGame = useCallback(() => {
    startGame(stateRef.current.difficulty);
  }, [startGame]);

  const setDifficulty = useCallback((d: Difficulty) => {
    stateRef.current.difficulty = d;
    syncUiState();
  }, [syncUiState]);

  const toggleSound = useCallback(() => {
    const state = stateRef.current;
    state.soundEnabled = !state.soundEnabled;
    gameAudio.setEnabled(state.soundEnabled);
    try { localStorage.setItem('galaga-sound', state.soundEnabled.toString()); } catch { /* ignore */ }
    syncUiState();
  }, [syncUiState]);

  const toggleMusic = useCallback(() => {
    const state = stateRef.current;
    state.musicEnabled = !state.musicEnabled;
    gameAudio.toggleMusic();
    syncUiState();
  }, [syncUiState]);

  const onMobileLeft = useCallback((pressed: boolean) => {
    mobileLeft.current = pressed;
  }, []);

  const onMobileRight = useCallback((pressed: boolean) => {
    mobileRight.current = pressed;
  }, []);

  const onMobileShoot = useCallback(() => {
    mobileShootPending.current = true;
  }, []);

  return {
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
  };
}
