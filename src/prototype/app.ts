import { createInitialState, getActivePieces, getShootablePieceIds, shootPiece } from '../core/game';
import { demoLevel } from '../core/level';
import type { ArrowPieceState, Direction, GameState } from '../core/types';

const CELL_SIZE = 80;
const BOARD_PADDING = 20;
const DIRECTION_GLYPH: Record<Direction, string> = {
  up: '↑',
  right: '→',
  down: '↓',
  left: '←'
};

type PieceBounds = {
  pieceId: string;
  x: number;
  y: number;
  size: number;
};

function drawRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function renderCanvasBoard(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  state: GameState
): PieceBounds[] {
  const boardWidth = state.level.cols * CELL_SIZE + BOARD_PADDING * 2;
  const boardHeight = state.level.rows * CELL_SIZE + BOARD_PADDING * 2;
  canvas.width = boardWidth * window.devicePixelRatio;
  canvas.height = boardHeight * window.devicePixelRatio;
  canvas.style.width = `${boardWidth}px`;
  canvas.style.height = `${boardHeight}px`;
  context.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
  context.clearRect(0, 0, boardWidth, boardHeight);

  drawRoundedRect(context, 0, 0, boardWidth, boardHeight, 28);
  context.fillStyle = 'rgba(15, 23, 42, 0.92)';
  context.fill();

  for (let row = 0; row < state.level.rows; row += 1) {
    for (let col = 0; col < state.level.cols; col += 1) {
      const x = BOARD_PADDING + col * CELL_SIZE;
      const y = BOARD_PADDING + row * CELL_SIZE;
      drawRoundedRect(context, x, y, CELL_SIZE - 8, CELL_SIZE - 8, 20);
      context.fillStyle = 'rgba(148, 163, 184, 0.14)';
      context.fill();
      context.strokeStyle = 'rgba(148, 163, 184, 0.1)';
      context.lineWidth = 1;
      context.stroke();
    }
  }

  const shootableIds = new Set(getShootablePieceIds(state));
  const bounds: PieceBounds[] = [];

  getActivePieces(state).forEach((piece) => {
    const x = BOARD_PADDING + piece.col * CELL_SIZE;
    const y = BOARD_PADDING + piece.row * CELL_SIZE;
    const size = CELL_SIZE - 8;

    context.save();
    drawRoundedRect(context, x, y, size, size, 20);
    context.fillStyle = piece.color;
    context.shadowColor = 'rgba(15, 23, 42, 0.32)';
    context.shadowBlur = 24;
    context.shadowOffsetY = 8;
    context.fill();
    context.restore();

    if (shootableIds.has(piece.id)) {
      drawRoundedRect(context, x + 2, y + 2, size - 4, size - 4, 18);
      context.strokeStyle = 'rgba(255,255,255,0.88)';
      context.lineWidth = 3;
      context.stroke();
    }

    context.fillStyle = '#ffffff';
    context.font = '700 34px Inter, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(DIRECTION_GLYPH[piece.direction], x + size / 2, y + size / 2 + 1);

    bounds.push({ pieceId: piece.id, x, y, size });
  });

  return bounds;
}

function createMobileShellPreview(): HTMLElement {
  const wrapper = document.createElement('section');
  wrapper.className = 'mobile-preview';
  wrapper.innerHTML = `
    <div class="phone-card">
      <div class="phone-card__header">Android Demo Target</div>
      <div class="phone-card__body">
        <div class="phone-card__screen">Compose Shell</div>
        <div class="phone-card__screen">Level 1 Demo</div>
        <div class="phone-card__screen">Canvas Board</div>
        <div class="phone-card__screen">Result HUD</div>
      </div>
      <div class="phone-card__footer">当前先推进到安卓可运行 demo</div>
    </div>
  `;
  return wrapper;
}

export function createPrototypeApp(): HTMLElement {
  let state = createInitialState(demoLevel);
  let pieceBounds: PieceBounds[] = [];

  const shell = document.createElement('main');
  shell.className = 'shell';

  const title = document.createElement('h1');
  title.textContent = 'Arrow Again · Level 1 Canvas Demo';

  const intro = document.createElement('p');
  intro.textContent = '第一关 demo 已切到 Canvas 渲染：找出路径无遮挡的箭头，点击让它飞出，清空棋盘过关。';

  const controls = document.createElement('div');
  controls.className = 'controls';

  const reset = document.createElement('button');
  reset.textContent = 'Replay Level 1';

  controls.append(reset);

  const status = document.createElement('div');
  status.className = 'status';

  const hint = document.createElement('div');
  hint.className = 'hint';

  const boardWrap = document.createElement('div');
  boardWrap.className = 'board-wrap';

  const canvas = document.createElement('canvas');
  canvas.className = 'board-canvas';

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas 2D context not available');
  }

  function repaint(): void {
    pieceBounds = renderCanvasBoard(context, canvas, state);

    if (state.completed) {
      status.textContent = `Level 1 cleared in ${state.moveCount} taps`;
      hint.textContent = '第一关已跑通。下一步继续补动画、星级和 Android 真机承载。';
      return;
    }

    if (state.failed) {
      status.textContent = `Lives: 0 · ${state.moveCount} taps`;
      hint.textContent = '生命值用完了，重开后优先点带白色描边的箭头。';
      return;
    }

    status.textContent = `Level 1 · Lives: ${state.remainingLives} · Taps: ${state.moveCount}`;

    if (!state.lastShot) {
      hint.textContent = `当前可直接飞出的箭头：${getShootablePieceIds(state).join(', ') || '无'}`;
      return;
    }

    if (state.lastShot.ok) {
      hint.textContent = `已消除 ${state.lastShot.removedPieceId}，继续清空剩余箭头。`;
      return;
    }

    hint.textContent = `点击失败：被 ${state.lastShot.blockedByPieceId ?? '未知棋子'} 挡住。`;
  }

  canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const hit = pieceBounds.find((item) => x >= item.x && x <= item.x + item.size && y >= item.y && y <= item.y + item.size);

    if (!hit) {
      return;
    }

    state = shootPiece(state, hit.pieceId);
    repaint();
  });

  reset.addEventListener('click', () => {
    state = createInitialState(demoLevel);
    repaint();
  });

  boardWrap.appendChild(canvas);
  shell.append(title, intro, controls, status, hint, boardWrap, createMobileShellPreview());
  repaint();
  return shell;
}
