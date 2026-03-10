/**
 * Canvas rendering functions for all game entities.
 * Uses shadowBlur/shadowColor for neon glow effects.
 */

import type {
  Player,
  Enemy,
  Bullet,
  Particle,
  TractorBeam,
  Star,
  ScorePopup,
  ChallengingEnemy,
} from './types';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  COLORS,
  ENEMY_ANIM_INTERVAL,
} from './constants';

/** Helper: set glow on context */
function setGlow(ctx: CanvasRenderingContext2D, color: string, blur: number): void {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
}

/** Helper: clear glow */
function clearGlow(ctx: CanvasRenderingContext2D): void {
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
}

/**
 * Draws the parallax starfield background.
 */
export function drawBackground(ctx: CanvasRenderingContext2D, stars: Star[]): void {
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  stars.forEach(star => {
    const sizes = [0.8, 1.2, 1.8];
    const blurs = [0, 1, 2];
    const size = sizes[star.layer - 1];
    const blur = blurs[star.layer - 1];
    const alpha = star.brightness * (star.layer === 3 ? 1.0 : star.layer === 2 ? 0.75 : 0.5);

    if (blur > 0) {
      setGlow(ctx, `rgba(255,255,255,${alpha})`, blur * 2);
    }
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(star.x, star.y, size, 0, Math.PI * 2);
    ctx.fill();
    if (blur > 0) clearGlow(ctx);
  });
}

/**
 * Draws the player ship as a sleek cyan triangle with neon glow.
 * Supports double ship mode (companion offset).
 */
export function drawPlayer(
  ctx: CanvasRenderingContext2D,
  player: Player,
  tick: number
): void {
  if (!player.alive) return;

  // Flashing during invincibility
  if (player.invincibleFrames > 0) {
    if (Math.floor(tick / 4) % 2 === 0) return;
  }

  const drawShip = (x: number, tint?: string): void => {
    const cx = x;
    const cy = player.y + player.height / 2;
    const color = tint ?? COLORS.playerShip;

    ctx.save();
    setGlow(ctx, color, 16);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    // Main body triangle
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx, cy - player.height / 2);
    ctx.lineTo(cx - player.width / 2, cy + player.height / 2);
    ctx.lineTo(cx - player.width / 4, cy + player.height / 4);
    ctx.lineTo(cx, cy + player.height / 3);
    ctx.lineTo(cx + player.width / 4, cy + player.height / 4);
    ctx.lineTo(cx + player.width / 2, cy + player.height / 2);
    ctx.closePath();
    ctx.fill();

    // Cockpit
    ctx.fillStyle = '#001133';
    ctx.beginPath();
    ctx.ellipse(cx, cy - player.height / 6, 6, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cockpit outline
    setGlow(ctx, color, 8);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy - player.height / 6, 6, 8, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Engine glow
    setGlow(ctx, COLORS.playerBullet, 12);
    ctx.fillStyle = COLORS.playerBullet;
    ctx.beginPath();
    ctx.ellipse(cx, cy + player.height / 2, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    clearGlow(ctx);
    ctx.restore();
  };

  drawShip(player.x);

  if (player.hasDouble) {
    drawShip(player.x + player.doubleOffset, '#ff44aa');
  }
}

/**
 * Draws a bee enemy (yellow/hexagonal).
 */
function drawBee(ctx: CanvasRenderingContext2D, enemy: Enemy): void {
  const cx = enemy.x;
  const cy = enemy.y;
  const w = enemy.width;
  const h = enemy.height;
  const frame = Math.floor(enemy.animation.timer / ENEMY_ANIM_INTERVAL) % 2;

  ctx.save();
  setGlow(ctx, COLORS.beeGlow, 12);

  // Body (hexagonal shape)
  ctx.fillStyle = COLORS.bee;
  ctx.beginPath();
  ctx.moveTo(cx, cy - h / 2);
  ctx.lineTo(cx + w / 3, cy - h / 4);
  ctx.lineTo(cx + w / 3, cy + h / 4);
  ctx.lineTo(cx, cy + h / 2);
  ctx.lineTo(cx - w / 3, cy + h / 4);
  ctx.lineTo(cx - w / 3, cy - h / 4);
  ctx.closePath();
  ctx.fill();

  // Wings (animate)
  const wingSpread = frame === 0 ? w * 0.45 : w * 0.35;
  const wingY = frame === 0 ? -h * 0.15 : 0;
  ctx.fillStyle = 'rgba(255, 200, 0, 0.6)';
  // Left wing
  ctx.beginPath();
  ctx.ellipse(cx - wingSpread, cy + wingY, wingSpread * 0.6, h * 0.22, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // Right wing
  ctx.beginPath();
  ctx.ellipse(cx + wingSpread, cy + wingY, wingSpread * 0.6, h * 0.22, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#ff2200';
  ctx.beginPath();
  ctx.arc(cx - 5, cy - 4, 2.5, 0, Math.PI * 2);
  ctx.arc(cx + 5, cy - 4, 2.5, 0, Math.PI * 2);
  ctx.fill();

  clearGlow(ctx);
  ctx.restore();
}

/**
 * Draws a butterfly enemy (pink/winged).
 */
function drawButterfly(ctx: CanvasRenderingContext2D, enemy: Enemy): void {
  const cx = enemy.x;
  const cy = enemy.y;
  const w = enemy.width;
  const h = enemy.height;
  const frame = Math.floor(enemy.animation.timer / ENEMY_ANIM_INTERVAL) % 2;

  ctx.save();
  setGlow(ctx, COLORS.butterflyGlow, 14);

  // Wings (large, butterfly-shaped)
  const wSpread = frame === 0 ? w * 0.6 : w * 0.4;
  const wHeight = frame === 0 ? h * 0.42 : h * 0.32;
  ctx.fillStyle = COLORS.butterfly;

  // Upper wings
  ctx.beginPath();
  ctx.ellipse(cx - wSpread, cy - h * 0.15, wSpread * 0.75, wHeight, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + wSpread, cy - h * 0.15, wSpread * 0.75, wHeight, 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Lower wings
  ctx.fillStyle = 'rgba(255, 68, 170, 0.7)';
  ctx.beginPath();
  ctx.ellipse(cx - wSpread * 0.7, cy + h * 0.15, wSpread * 0.5, wHeight * 0.65, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + wSpread * 0.7, cy + h * 0.15, wSpread * 0.5, wHeight * 0.65, 0.6, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = '#cc2288';
  ctx.beginPath();
  ctx.ellipse(cx, cy, 6, h * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();

  // Antennae
  ctx.strokeStyle = COLORS.butterfly;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - 3, cy - h * 0.35);
  ctx.quadraticCurveTo(cx - 10, cy - h * 0.55, cx - 8, cy - h * 0.65);
  ctx.moveTo(cx + 3, cy - h * 0.35);
  ctx.quadraticCurveTo(cx + 10, cy - h * 0.55, cx + 8, cy - h * 0.65);
  ctx.stroke();

  clearGlow(ctx);
  ctx.restore();
}

/**
 * Draws a Boss Galaga (large red+blue dual-color).
 */
function drawBoss(ctx: CanvasRenderingContext2D, enemy: Enemy): void {
  const cx = enemy.x;
  const cy = enemy.y;
  const w = enemy.width * 1.2;
  const h = enemy.height * 1.2;
  const frame = Math.floor(enemy.animation.timer / ENEMY_ANIM_INTERVAL) % 2;

  ctx.save();

  // Left half: red, Right half: blue
  // Draw left side
  setGlow(ctx, COLORS.bossGlow, 18);
  ctx.fillStyle = COLORS.bossRed;
  ctx.beginPath();
  ctx.moveTo(cx, cy - h / 2);
  ctx.lineTo(cx - w * 0.45, cy - h * 0.1);
  ctx.lineTo(cx - w * 0.5, cy + h * 0.2);
  ctx.lineTo(cx - w * 0.25, cy + h * 0.5);
  ctx.lineTo(cx, cy + h * 0.3);
  ctx.closePath();
  ctx.fill();

  // Draw right side
  ctx.fillStyle = COLORS.bossBlue;
  ctx.beginPath();
  ctx.moveTo(cx, cy - h / 2);
  ctx.lineTo(cx + w * 0.45, cy - h * 0.1);
  ctx.lineTo(cx + w * 0.5, cy + h * 0.2);
  ctx.lineTo(cx + w * 0.25, cy + h * 0.5);
  ctx.lineTo(cx, cy + h * 0.3);
  ctx.closePath();
  ctx.fill();

  // Wings
  const wSpread = frame === 0 ? w * 0.7 : w * 0.55;
  // Left wing (red tint)
  ctx.fillStyle = 'rgba(255, 34, 68, 0.5)';
  ctx.beginPath();
  ctx.ellipse(cx - wSpread, cy, wSpread * 0.55, h * 0.32, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // Right wing (blue tint)
  ctx.fillStyle = 'rgba(68, 34, 255, 0.5)';
  ctx.beginPath();
  ctx.ellipse(cx + wSpread, cy, wSpread * 0.55, h * 0.32, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Center divider line
  setGlow(ctx, '#ffffff', 4);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx, cy - h * 0.4);
  ctx.lineTo(cx, cy + h * 0.25);
  ctx.stroke();

  // Eyes
  ctx.fillStyle = '#ffcc00';
  setGlow(ctx, '#ffcc00', 8);
  ctx.beginPath();
  ctx.arc(cx - 7, cy - 3, 3, 0, Math.PI * 2);
  ctx.arc(cx + 7, cy - 3, 3, 0, Math.PI * 2);
  ctx.fill();

  // Captured ship indicator
  if (enemy.hasCapturedShip) {
    ctx.save();
    setGlow(ctx, '#00d4ff', 10);
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy + h * 0.5);
    ctx.lineTo(cx - 10, cy + h * 0.75);
    ctx.lineTo(cx - 8, cy + h * 0.6);
    ctx.lineTo(cx, cy + h * 0.65);
    ctx.lineTo(cx + 8, cy + h * 0.6);
    ctx.lineTo(cx + 10, cy + h * 0.75);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  clearGlow(ctx);
  ctx.restore();
}

/**
 * Dispatches to specific enemy draw function based on type.
 */
export function drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy): void {
  if (enemy.state === 'captured') return;

  switch (enemy.type) {
    case 'bee':
      drawBee(ctx, enemy);
      break;
    case 'butterfly':
      drawButterfly(ctx, enemy);
      break;
    case 'boss':
      drawBoss(ctx, enemy);
      break;
  }
}

/**
 * Draws a bullet (player or enemy).
 */
export function drawBullet(ctx: CanvasRenderingContext2D, bullet: Bullet): void {
  ctx.save();
  const isPlayer = bullet.owner === 'player';
  const color = isPlayer ? COLORS.playerBullet : COLORS.enemyBullet;
  const glowColor = isPlayer ? COLORS.playerBulletGlow : COLORS.enemyBulletGlow;

  setGlow(ctx, glowColor, 10);
  ctx.fillStyle = color;

  if (isPlayer) {
    // Player bullet: tall thin rect with rounded top
    const x = bullet.x - bullet.width / 2;
    const y = bullet.y - bullet.height / 2;
    ctx.beginPath();
    ctx.roundRect(x, y, bullet.width, bullet.height, bullet.width / 2);
    ctx.fill();
  } else {
    // Enemy bullet: diamond shape
    ctx.beginPath();
    ctx.moveTo(bullet.x, bullet.y - bullet.height / 2);
    ctx.lineTo(bullet.x + bullet.width / 2, bullet.y);
    ctx.lineTo(bullet.x, bullet.y + bullet.height / 2);
    ctx.lineTo(bullet.x - bullet.width / 2, bullet.y);
    ctx.closePath();
    ctx.fill();
  }

  clearGlow(ctx);
  ctx.restore();
}

/**
 * Draws all explosion particles.
 */
export function drawExplosions(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
  ctx.save();
  particles.forEach(p => {
    const alpha = p.life;
    ctx.globalAlpha = alpha;
    setGlow(ctx, p.color, 8 * alpha);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  clearGlow(ctx);
  ctx.restore();
}

/**
 * Draws the tractor beam cone from a boss enemy.
 */
export function drawTractorBeam(ctx: CanvasRenderingContext2D, beam: TractorBeam): void {
  if (!beam.active) return;
  ctx.save();

  const oscillation = Math.sin(beam.timer * 0.15) * 0.3 + 0.7;

  // Gradient for beam
  const gradient = ctx.createLinearGradient(beam.x, beam.y, beam.x, beam.y + beam.length);
  gradient.addColorStop(0, `rgba(136, 255, 136, ${0.8 * oscillation})`);
  gradient.addColorStop(0.5, `rgba(136, 255, 136, ${0.4 * oscillation})`);
  gradient.addColorStop(1, `rgba(136, 255, 136, 0)`);

  setGlow(ctx, COLORS.tractorBeam, 20 * oscillation);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(beam.x - beam.width / 4, beam.y);
  ctx.lineTo(beam.x - beam.width / 2, beam.y + beam.length);
  ctx.lineTo(beam.x + beam.width / 2, beam.y + beam.length);
  ctx.lineTo(beam.x + beam.width / 4, beam.y);
  ctx.closePath();
  ctx.fill();

  // Beam edge lines
  ctx.strokeStyle = `rgba(136, 255, 136, ${0.9 * oscillation})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(beam.x - beam.width / 4, beam.y);
  ctx.lineTo(beam.x - beam.width / 2, beam.y + beam.length);
  ctx.moveTo(beam.x + beam.width / 4, beam.y);
  ctx.lineTo(beam.x + beam.width / 2, beam.y + beam.length);
  ctx.stroke();

  clearGlow(ctx);
  ctx.restore();
}

/**
 * Draws score popup texts floating upward.
 */
export function drawScorePopups(ctx: CanvasRenderingContext2D, popups: ScorePopup[]): void {
  ctx.save();
  popups.forEach(popup => {
    const alpha = popup.life;
    ctx.globalAlpha = alpha;
    setGlow(ctx, COLORS.scoreText, 8);
    ctx.fillStyle = COLORS.scoreText;
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(popup.text, popup.x, popup.y);
  });
  ctx.globalAlpha = 1;
  clearGlow(ctx);
  ctx.restore();
}

/**
 * Draws the HUD: score (top-left), high score (top-center), lives (top-right), level (bottom).
 */
export function drawHUD(
  ctx: CanvasRenderingContext2D,
  score: number,
  lives: number,
  level: number,
  highScore: number,
  newHighScore: boolean,
  tick: number,
  playerX: number,
  playerWidth: number
): void {
  ctx.save();
  ctx.font = 'bold 16px monospace';
  ctx.textBaseline = 'top';

  // Score (top left)
  setGlow(ctx, COLORS.scoreText, 10);
  ctx.fillStyle = COLORS.scoreText;
  ctx.textAlign = 'left';
  ctx.fillText(`SCORE`, 12, 10);
  ctx.font = 'bold 20px monospace';
  ctx.fillText(score.toString().padStart(6, '0'), 12, 28);

  // High score (top center)
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  const hiColor = newHighScore && Math.floor(tick / 15) % 2 === 0 ? '#ffcc00' : COLORS.uiText;
  setGlow(ctx, hiColor, 8);
  ctx.fillStyle = hiColor;
  ctx.fillText('HI-SCORE', CANVAS_WIDTH / 2, 10);
  ctx.font = 'bold 20px monospace';
  ctx.fillText(highScore.toString().padStart(6, '0'), CANVAS_WIDTH / 2, 26);

  // Level indicator (bottom)
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  setGlow(ctx, '#ffcc00', 8);
  ctx.fillStyle = '#ffcc00';
  ctx.fillText(`STAGE  ${level}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 22);

  // Lives (top right) - draw ship icons
  ctx.textAlign = 'right';
  setGlow(ctx, COLORS.hud, 8);
  ctx.fillStyle = COLORS.hud;
  ctx.font = 'bold 14px monospace';
  ctx.fillText('SHIPS', CANVAS_WIDTH - 12, 10);
  for (let i = 0; i < lives; i++) {
    drawMiniShip(ctx, CANVAS_WIDTH - 18 - i * 22, 32);
  }

  clearGlow(ctx);
  ctx.restore();
}

/** Draws a tiny ship icon for the lives display */
function drawMiniShip(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.save();
  setGlow(ctx, COLORS.playerShip, 8);
  ctx.fillStyle = COLORS.playerShip;
  ctx.beginPath();
  ctx.moveTo(x, y - 8);
  ctx.lineTo(x - 8, y + 6);
  ctx.lineTo(x - 4, y + 2);
  ctx.lineTo(x, y + 4);
  ctx.lineTo(x + 4, y + 2);
  ctx.lineTo(x + 8, y + 6);
  ctx.closePath();
  ctx.fill();
  clearGlow(ctx);
  ctx.restore();
}

/**
 * Draws a challenging stage enemy (simpler path-follower).
 */
export function drawChallengingEnemy(ctx: CanvasRenderingContext2D, enemy: ChallengingEnemy): void {
  if (!enemy.alive) return;
  const mockEnemy: Enemy = {
    id: enemy.id,
    type: enemy.type,
    state: 'formation',
    x: enemy.x,
    y: enemy.y,
    width: 32,
    height: 28,
    row: 0,
    col: 0,
    formationX: 0,
    formationY: 0,
    health: 1,
    divePath: [],
    diveT: 0,
    diveSpeed: 0,
    tractorBeamActive: false,
    shootTimer: 0,
    animation: { frame: 0, timer: Date.now() % 16 },
    hasCapturedShip: false,
    points: enemy.points,
  };
  drawEnemy(ctx, mockEnemy);
}

/**
 * Draws a scanline overlay effect for retro look.
 */
export function drawScanlines(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.globalAlpha = 0.04;
  ctx.fillStyle = '#000000';
  for (let y = 0; y < CANVAS_HEIGHT; y += 4) {
    ctx.fillRect(0, y, CANVAS_WIDTH, 2);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

/**
 * Draws an overlay for the pause screen dim effect.
 */
export function drawPauseOverlay(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 17, 0.6)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.restore();
}
