import { createInitialState, getActivePieces, getPieceById, getShootablePieceIds, shootPiece } from '../core/game';
import { tutorialLevels } from '../core/level';
import type { ArrowPieceState, Cell, Direction, GameState } from '../core/types';

// ── Constants ──────────────────────────────────────────────
const CELL_SIZE = 64;
const BOARD_PADDING = 16;
const SHOT_DURATION_MS = 420;
const ERROR_SHAKE_MS = 320;
const ERROR_FLASH_MS = 280;
const UNLOCK_PULSE_MS = 500;
const PIECE_RADIUS = 12;
const ARROW_SCALE = 0.36;

const DIR_ANGLE: Record<Direction, number> = {
  up: -Math.PI / 2,
  right: 0,
  down: Math.PI / 2,
  left: Math.PI,
};
const DIR_VEC: Record<Direction, Cell> = {
  up: { row: -1, col: 0 },
  right: { row: 0, col: 1 },
  down: { row: 1, col: 0 },
  left: { row: 0, col: -1 },
};

// ── Easing helpers ─────────────────────────────────────────
function easeOutQuad(t: number): number { return t * (2 - t); }
function easeOutBack(t: number): number { const c1 = 1.70158; const c3 = c1 + 1; return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2; }
function easeInQuad(t: number): number { return t * t; }

// ── Color helpers ──────────────────────────────────────────
function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function lighten(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const f = (c: number) => Math.min(255, Math.round(c + (255 - c) * amount));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}
function darken(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const f = (c: number) => Math.max(0, Math.round(c * (1 - amount)));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}
function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── Particle ───────────────────────────────────────────────
interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  color: string; size: number;
}

function spawnParticles(arr: Particle[], x: number, y: number, color: string, count: number, spread: number): void {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = spread * (0.3 + Math.random() * 0.7);
    arr.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1, maxLife: 0.4 + Math.random() * 0.3,
      color,
      size: 2 + Math.random() * 3,
    });
  }
}

function updateParticles(arr: Particle[], dt: number): void {
  for (let i = arr.length - 1; i >= 0; i--) {
    const p = arr[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.96;
    p.vy *= 0.96;
    p.life -= dt / p.maxLife;
    if (p.life <= 0) arr.splice(i, 1);
  }
}

function drawParticles(ctx: CanvasRenderingContext2D, arr: Particle[]): void {
  for (const p of arr) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life) * 0.8;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ── Arrow drawing ──────────────────────────────────────────
function drawArrowShape(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  size: number, direction: Direction
): void {
  const angle = DIR_ANGLE[direction];
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  const headLen = size * 0.52;
  const headW = size * 0.48;
  const tailLen = size * 0.32;
  const tailW = size * 0.18;

  ctx.beginPath();
  // arrow head (triangle)
  ctx.moveTo(headLen, 0);
  ctx.lineTo(-headLen * 0.15, -headW);
  ctx.lineTo(-headLen * 0.15, -tailW);
  // tail
  ctx.lineTo(-headLen - tailLen, -tailW);
  ctx.lineTo(-headLen - tailLen, tailW);
  ctx.lineTo(-headLen * 0.15, tailW);
  ctx.lineTo(-headLen * 0.15, headW);
  ctx.closePath();

  ctx.restore();
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ── Piece bounds for hit testing ───────────────────────────
interface PieceBounds {
  pieceId: string;
  x: number; y: number; size: number;
}

// ── Animation state types ──────────────────────────────────
interface ShotAnim {
  piece: ArrowPieceState;
  startTime: number;
  afterimages: Array<{ x: number; y: number; alpha: number }>;
}

interface ErrorAnim {
  pieceId: string;
  blockerId: string | undefined;
  startTime: number;
}

interface UnlockAnim {
  pieceIds: string[];
  startTime: number;
}

// ── Main app ───────────────────────────────────────────────
export function createPrototypeApp(): HTMLElement {
  let currentLevelIndex = 0;
  let state = createInitialState(tutorialLevels[currentLevelIndex]);
  let pieceBounds: PieceBounds[] = [];
  let hoveredPieceId: string | null = null;

  // Animation states
  let shotAnim: ShotAnim | null = null;
  let errorAnim: ErrorAnim | null = null;
  let unlockAnim: UnlockAnim | null = null;
  const particles: Particle[] = [];
  let screenShake = { x: 0, y: 0, until: 0 };
  let globalTime = 0;
  let lastFrameTime = 0;
  let running = true;

  // ── DOM setup ──────────────────────────────────────────
  const shell = document.createElement('main');
  shell.className = 'shell';

  const title = document.createElement('h1');
  title.textContent = 'Arrow Again';

  const intro = document.createElement('p');
  intro.textContent = '点击可射出的箭头棋子，按正确顺序全部消除即可过关';

  const controls = document.createElement('div');
  controls.className = 'controls';

  // Level buttons
  const levelButtons: HTMLButtonElement[] = [];
  tutorialLevels.forEach((_lvl, i) => {
    const btn = document.createElement('button');
    btn.textContent = `Level ${i + 1}`;
    btn.addEventListener('click', () => loadLevel(i));
    levelButtons.push(btn);
    controls.appendChild(btn);
  });

  const resetBtn = document.createElement('button');
  resetBtn.textContent = 'Restart';
  resetBtn.addEventListener('click', () => loadLevel(currentLevelIndex));
  controls.appendChild(resetBtn);

  const hud = document.createElement('div');
  hud.className = 'hud';

  const status = document.createElement('div');
  status.className = 'status';

  const hint = document.createElement('div');
  hint.className = 'hint';

  const boardWrap = document.createElement('div');
  boardWrap.className = 'board-wrap';

  const canvas = document.createElement('canvas');
  canvas.className = 'board-canvas';
  const ctx = canvas.getContext('2d')!;
  if (!ctx) throw new Error('Canvas 2D context not available');

  boardWrap.appendChild(canvas);
  shell.append(title, intro, controls, hud, status, hint, boardWrap);

  // ── Level loading ──────────────────────────────────────
  function loadLevel(index: number): void {
    currentLevelIndex = index;
    state = createInitialState(tutorialLevels[index]);
    shotAnim = null;
    errorAnim = null;
    unlockAnim = null;
    particles.length = 0;
    screenShake = { x: 0, y: 0, until: 0 };
    hoveredPieceId = null;
    levelButtons.forEach((btn, i) => {
      btn.classList.toggle('active', i === index);
    });
    updateHUD();
  }

  function updateHUD(): void {
    // Lives as hearts
    const hearts = '❤️'.repeat(state.remainingLives) + '🖤'.repeat(Math.max(0, state.level.lives - state.remainingLives));
    hud.innerHTML = `<span class="lives">${hearts}</span><span>Taps: ${state.moveCount}</span>`;

    if (state.completed) {
      const stars = state.remainingLives >= 2 ? '⭐⭐⭐' : state.remainingLives >= 1 ? '⭐⭐' : '⭐';
      status.textContent = `Level ${currentLevelIndex + 1} Cleared! ${stars}`;
      hint.textContent = state.remainingLives === state.level.lives ? 'Perfect!' : 'Great job!';
      return;
    }
    if (state.failed) {
      status.textContent = 'Game Over';
      hint.textContent = 'Click Restart to try again';
      return;
    }

    status.textContent = `Level ${currentLevelIndex + 1}`;
    const shootable = getShootablePieceIds(state);
    hint.textContent = shootable.length > 0
      ? `${shootable.length} arrow${shootable.length > 1 ? 's' : ''} can be shot`
      : 'No arrows can be shot - Restart needed';
  }

  // ── Piece center coordinate ────────────────────────────
  function pieceCenter(piece: ArrowPieceState): { x: number; y: number } {
    const cellInner = CELL_SIZE - 6;
    return {
      x: BOARD_PADDING + piece.col * CELL_SIZE + cellInner / 2 + 3,
      y: BOARD_PADDING + piece.row * CELL_SIZE + cellInner / 2 + 3,
    };
  }

  // ── Drawing functions ──────────────────────────────────
  function drawBoard(): void {
    const bw = state.level.cols * CELL_SIZE + BOARD_PADDING * 2;
    const bh = state.level.rows * CELL_SIZE + BOARD_PADDING * 2;
    const dpr = window.devicePixelRatio;
    canvas.width = bw * dpr;
    canvas.height = bh * dpr;
    canvas.style.width = `${bw}px`;
    canvas.style.height = `${bh}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, bw, bh);

    // Apply screen shake
    if (performance.now() < screenShake.until) {
      ctx.translate(screenShake.x, screenShake.y);
    }

    // Board background
    drawRoundedRect(ctx, 0, 0, bw, bh, 16);
    ctx.fillStyle = '#f0f9f4';
    ctx.fill();

    // Grid dots
    ctx.fillStyle = 'rgba(45, 90, 74, 0.08)';
    for (let row = 0; row <= state.level.rows; row++) {
      for (let col = 0; col <= state.level.cols; col++) {
        const x = BOARD_PADDING + col * CELL_SIZE - 1;
        const y = BOARD_PADDING + row * CELL_SIZE - 1;
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Subtle grid lines
    ctx.strokeStyle = 'rgba(45, 90, 74, 0.05)';
    ctx.lineWidth = 1;
    for (let row = 0; row < state.level.rows; row++) {
      for (let col = 0; col < state.level.cols; col++) {
        const x = BOARD_PADDING + col * CELL_SIZE + 3;
        const y = BOARD_PADDING + row * CELL_SIZE + 3;
        drawRoundedRect(ctx, x, y, CELL_SIZE - 6, CELL_SIZE - 6, 8);
        ctx.stroke();
      }
    }
  }

  function drawPiece(
    piece: ArrowPieceState,
    shootable: boolean,
    scaleOverride?: number,
    alphaOverride?: number,
    offsetX = 0,
    offsetY = 0,
    colorOverride?: string
  ): PieceBounds {
    const cellInner = CELL_SIZE - 6;
    const baseX = BOARD_PADDING + piece.col * CELL_SIZE + 3 + offsetX;
    const baseY = BOARD_PADDING + piece.row * CELL_SIZE + 3 + offsetY;
    const cx = baseX + cellInner / 2;
    const cy = baseY + cellInner / 2;
    const color = colorOverride ?? piece.color;
    const alpha = alphaOverride ?? 1;

    // Compute scale
    let scale = scaleOverride ?? 1;
    const isHovered = hoveredPieceId === piece.id && shootable;
    if (isHovered && !scaleOverride) {
      scale = 1.08;
    }
    // Shootable breathing
    if (shootable && !scaleOverride) {
      const breath = Math.sin(globalTime * 3.5) * 0.025;
      scale += breath;
    }

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);

    // ─ Shadow layer ─
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.15)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    drawRoundedRect(ctx, baseX, baseY, cellInner, cellInner, PIECE_RADIUS);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();

    // ─ Gradient fill ─
    const grad = ctx.createLinearGradient(baseX, baseY, baseX, baseY + cellInner);
    grad.addColorStop(0, lighten(color, 0.22));
    grad.addColorStop(0.5, color);
    grad.addColorStop(1, darken(color, 0.15));
    drawRoundedRect(ctx, baseX, baseY, cellInner, cellInner, PIECE_RADIUS);
    ctx.fillStyle = grad;
    ctx.fill();

    // ─ Border ─
    drawRoundedRect(ctx, baseX, baseY, cellInner, cellInner, PIECE_RADIUS);
    ctx.strokeStyle = darken(color, 0.25);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // ─ Inner highlight (top edge) ─
    ctx.save();
    ctx.beginPath();
    drawRoundedRect(ctx, baseX + 2, baseY + 2, cellInner - 4, cellInner * 0.45, PIECE_RADIUS - 2);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fill();
    ctx.restore();

    // ─ Shootable glow ring ─
    if (shootable) {
      const glowIntensity = 0.3 + Math.sin(globalTime * 3.5) * 0.15;
      ctx.save();
      ctx.shadowColor = withAlpha(color, 0.6);
      ctx.shadowBlur = 12 + Math.sin(globalTime * 3.5) * 4;
      drawRoundedRect(ctx, baseX - 1, baseY - 1, cellInner + 2, cellInner + 2, PIECE_RADIUS + 1);
      ctx.strokeStyle = withAlpha('#ffffff', glowIntensity);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    // ─ Geometric arrow ─
    const arrowSize = cellInner * ARROW_SCALE;
    ctx.save();
    drawArrowShape(ctx, cx, cy - 1, arrowSize, piece.direction);
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.shadowBlur = 2;
    ctx.shadowOffsetY = 1;
    ctx.fill();
    ctx.restore();

    ctx.restore(); // pop scale/alpha transform

    return { pieceId: piece.id, x: baseX, y: baseY, size: cellInner };
  }

  // ── Error animation rendering ──────────────────────────
  function drawErrorOverlay(piece: ArrowPieceState, progress: number): void {
    const cellInner = CELL_SIZE - 6;
    const baseX = BOARD_PADDING + piece.col * CELL_SIZE + 3;
    const baseY = BOARD_PADDING + piece.row * CELL_SIZE + 3;
    const shakeOffset = Math.sin(progress * Math.PI * 6) * 4 * (1 - progress);

    ctx.save();
    ctx.translate(shakeOffset, 0);
    ctx.globalAlpha = (1 - progress) * 0.5;
    drawRoundedRect(ctx, baseX, baseY, cellInner, cellInner, PIECE_RADIUS);
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    ctx.restore();
  }

  function drawBlockerHighlight(piece: ArrowPieceState, progress: number): void {
    const cellInner = CELL_SIZE - 6;
    const baseX = BOARD_PADDING + piece.col * CELL_SIZE + 3;
    const baseY = BOARD_PADDING + piece.row * CELL_SIZE + 3;

    ctx.save();
    ctx.globalAlpha = (1 - progress) * 0.4;
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 14;
    drawRoundedRect(ctx, baseX - 2, baseY - 2, cellInner + 4, cellInner + 4, PIECE_RADIUS + 2);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();
  }

  // ── Unlock pulse ───────────────────────────────────────
  function drawUnlockPulse(piece: ArrowPieceState, progress: number): void {
    const cellInner = CELL_SIZE - 6;
    const baseX = BOARD_PADDING + piece.col * CELL_SIZE + 3;
    const baseY = BOARD_PADDING + piece.row * CELL_SIZE + 3;
    const expand = easeOutBack(progress) * 6;

    ctx.save();
    ctx.globalAlpha = (1 - progress) * 0.55;
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 16;
    drawRoundedRect(
      ctx,
      baseX - expand, baseY - expand,
      cellInner + expand * 2, cellInner + expand * 2,
      PIECE_RADIUS + expand * 0.5
    );
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();
  }

  // ── Shot animation rendering ───────────────────────────
  function drawShotAnim(anim: ShotAnim, now: number): void {
    const elapsed = now - anim.startTime;
    const t = Math.min(1, elapsed / SHOT_DURATION_MS);
    const piece = anim.piece;
    const vec = DIR_VEC[piece.direction];
    const { x: startX, y: startY } = pieceCenter(piece);

    // How far the piece needs to travel to exit the board
    const boardW = state.level.cols * CELL_SIZE + BOARD_PADDING * 2;
    const boardH = state.level.rows * CELL_SIZE + BOARD_PADDING * 2;
    let maxDist: number;
    if (piece.direction === 'right') maxDist = boardW - startX + CELL_SIZE;
    else if (piece.direction === 'left') maxDist = startX + CELL_SIZE;
    else if (piece.direction === 'down') maxDist = boardH - startY + CELL_SIZE;
    else maxDist = startY + CELL_SIZE;

    const easedT = easeInQuad(t);
    const dist = easedT * maxDist;

    // Afterimages
    if (t < 0.85) {
      const trailCount = 5;
      for (let i = trailCount; i >= 1; i--) {
        const trailT = Math.max(0, t - i * 0.04);
        const trailDist = easeInQuad(trailT) * maxDist;
        const trailAlpha = (1 - t) * (1 - i / (trailCount + 1)) * 0.35;
        const trailScale = 1 - i * 0.08;

        drawPiece(piece, false, trailScale, trailAlpha, vec.col * trailDist, vec.row * trailDist);
      }
    }

    // Main flying piece
    const mainAlpha = 1 - easeOutQuad(Math.max(0, (t - 0.5) * 2));
    const mainScale = 1 + t * 0.1;
    drawPiece(piece, false, mainScale, mainAlpha, vec.col * dist, vec.row * dist);

    // Spawn particles along flight path
    if (t < 0.8 && Math.random() < 0.4) {
      const px = BOARD_PADDING + piece.col * CELL_SIZE + 3 + (CELL_SIZE - 6) / 2 + vec.col * dist;
      const py = BOARD_PADDING + piece.row * CELL_SIZE + 3 + (CELL_SIZE - 6) / 2 + vec.row * dist;
      spawnParticles(particles, px, py, lighten(piece.color, 0.3), 1, 40);
    }

    // Exit burst
    if (t >= 0.92 && anim.afterimages.length === 0) {
      anim.afterimages.push({ x: 0, y: 0, alpha: 1 }); // marker
      const exitX = BOARD_PADDING + piece.col * CELL_SIZE + 3 + (CELL_SIZE - 6) / 2 + vec.col * dist;
      const exitY = BOARD_PADDING + piece.row * CELL_SIZE + 3 + (CELL_SIZE - 6) / 2 + vec.row * dist;
      spawnParticles(particles, exitX, exitY, piece.color, 10, 80);
      spawnParticles(particles, exitX, exitY, '#ffffff', 4, 50);
      // Screen shake
      screenShake = {
        x: (Math.random() - 0.5) * 3,
        y: (Math.random() - 0.5) * 3,
        until: performance.now() + 60,
      };
    }
  }

  // ── Main render ────────────────────────────────────────
  function render(now: number): void {
    if (!running) return;

    const dt = Math.min(0.05, (now - lastFrameTime) / 1000);
    lastFrameTime = now;
    globalTime += dt;

    // Update particles
    updateParticles(particles, dt);

    // Update screen shake
    if (now < screenShake.until) {
      screenShake.x = (Math.random() - 0.5) * 3;
      screenShake.y = (Math.random() - 0.5) * 3;
    } else {
      screenShake.x = 0;
      screenShake.y = 0;
    }

    drawBoard();

    const shootableIds = new Set(getShootablePieceIds(state));
    const bounds: PieceBounds[] = [];

    // Draw active pieces (skip the one being animated)
    const activePieces = getActivePieces(state);
    for (const piece of activePieces) {
      if (shotAnim && piece.id === shotAnim.piece.id) continue;

      // Error shake offset
      let errOffX = 0;
      if (errorAnim && errorAnim.pieceId === piece.id) {
        const errT = Math.min(1, (now - errorAnim.startTime) / ERROR_SHAKE_MS);
        errOffX = Math.sin(errT * Math.PI * 6) * 4 * (1 - errT);
      }

      bounds.push(drawPiece(piece, shootableIds.has(piece.id), undefined, undefined, errOffX));
    }

    // Error overlay
    if (errorAnim) {
      const errT = Math.min(1, (now - errorAnim.startTime) / ERROR_FLASH_MS);
      const errPiece = getPieceById(state, errorAnim.pieceId);
      if (errPiece && !errPiece.removed) {
        drawErrorOverlay(errPiece, errT);
      }
      if (errorAnim.blockerId) {
        const blocker = getPieceById(state, errorAnim.blockerId);
        if (blocker && !blocker.removed) {
          drawBlockerHighlight(blocker, errT);
        }
      }
      if (errT >= 1) errorAnim = null;
    }

    // Unlock pulse
    if (unlockAnim) {
      const ulT = Math.min(1, (now - unlockAnim.startTime) / UNLOCK_PULSE_MS);
      for (const pid of unlockAnim.pieceIds) {
        const p = getPieceById(state, pid);
        if (p && !p.removed) drawUnlockPulse(p, ulT);
      }
      if (ulT >= 1) unlockAnim = null;
    }

    // Shot animation
    if (shotAnim) {
      drawShotAnim(shotAnim, now);
      const elapsed = now - shotAnim.startTime;
      if (elapsed >= SHOT_DURATION_MS) {
        finishShot();
      }
    }

    // Particles
    drawParticles(ctx, particles);

    pieceBounds = bounds;
    requestAnimationFrame(render);
  }

  // ── Shot completion ────────────────────────────────────
  let pendingNextState: GameState | null = null;
  let preShootableIds: Set<string> = new Set();

  function finishShot(): void {
    if (!pendingNextState) { shotAnim = null; return; }
    const prevShootable = preShootableIds;
    state = pendingNextState;
    pendingNextState = null;
    shotAnim = null;

    // Detect newly unlocked pieces
    const newShootable = new Set(getShootablePieceIds(state));
    const unlocked = [...newShootable].filter(id => !prevShootable.has(id));
    if (unlocked.length > 0) {
      unlockAnim = { pieceIds: unlocked, startTime: performance.now() };
    }

    updateHUD();
  }

  // ── Input handling ─────────────────────────────────────
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const hit = pieceBounds.find(b => x >= b.x && x <= b.x + b.size && y >= b.y && y <= b.y + b.size);
    const newHover = hit ? hit.pieceId : null;
    if (newHover !== hoveredPieceId) {
      hoveredPieceId = newHover;
      // Update cursor
      if (hoveredPieceId) {
        const shootable = getShootablePieceIds(state);
        canvas.style.cursor = shootable.includes(hoveredPieceId) ? 'pointer' : 'not-allowed';
      } else {
        canvas.style.cursor = 'default';
      }
    }
  });

  canvas.addEventListener('mouseleave', () => {
    hoveredPieceId = null;
    canvas.style.cursor = 'default';
  });

  canvas.addEventListener('click', (e) => {
    if (shotAnim || state.completed || state.failed) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const hit = pieceBounds.find(b => x >= b.x && x <= b.x + b.size && y >= b.y && y <= b.y + b.size);
    if (!hit) return;

    const piece = getPieceById(state, hit.pieceId);
    if (!piece || piece.removed) return;

    // Record pre-shot shootable set
    preShootableIds = new Set(getShootablePieceIds(state));
    // Remove the clicked piece from pre-set (it's about to be removed)
    preShootableIds.delete(hit.pieceId);

    const nextState = shootPiece(state, hit.pieceId);

    if (nextState.lastShot?.ok) {
      // Successful shot - animate
      pendingNextState = nextState;
      // Update state partially (remove piece from active, update counters)
      state = {
        ...state,
        moveCount: nextState.moveCount,
        remainingLives: nextState.remainingLives,
        pieces: nextState.pieces,
        lastShot: nextState.lastShot,
      };
      shotAnim = {
        piece: { ...piece },
        startTime: performance.now(),
        afterimages: [],
      };
      updateHUD();
    } else {
      // Error - shake + flash
      state = nextState;
      errorAnim = {
        pieceId: hit.pieceId,
        blockerId: nextState.lastShot?.blockedByPieceId,
        startTime: performance.now(),
      };
      updateHUD();
    }
  });

  // ── Initialize ─────────────────────────────────────────
  loadLevel(0);
  lastFrameTime = performance.now();
  requestAnimationFrame(render);

  return shell;
}
