import { createInitialState, getActivePieces, getShotPath, getShootablePieceIds, shootPiece } from '../core/game';
import { tutorialLevels } from '../core/level';
import type { ArrowPieceState, Direction, GameState } from '../core/types';

const CELL_SIZE = 68;
const DIRECTION_GLYPH: Record<Direction, string> = {
  up: '↑',
  right: '→',
  down: '↓',
  left: '←'
};

function renderPiece(piece: ArrowPieceState, shootable: boolean, disabled: boolean): HTMLButtonElement {
  const button = document.createElement('button');
  button.className = `piece ${shootable ? 'piece--shootable' : ''}`;
  button.style.gridColumn = String(piece.col + 1);
  button.style.gridRow = String(piece.row + 1);
  button.style.background = piece.color;
  button.textContent = DIRECTION_GLYPH[piece.direction];
  button.dataset.pieceId = piece.id;
  button.disabled = disabled;
  return button;
}

function renderBoard(
  state: GameState,
  board: HTMLDivElement,
  status: HTMLDivElement,
  hint: HTMLDivElement,
  onPieceClick: (event: MouseEvent) => void
): void {
  board.innerHTML = '';
  board.style.gridTemplateColumns = `repeat(${state.level.cols}, ${CELL_SIZE}px)`;
  board.style.gridTemplateRows = `repeat(${state.level.rows}, ${CELL_SIZE}px)`;

  for (let row = 0; row < state.level.rows; row += 1) {
    for (let col = 0; col < state.level.cols; col += 1) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      board.appendChild(cell);
    }
  }

  const shootableIds = new Set(getShootablePieceIds(state));
  getActivePieces(state).forEach((piece) => {
    const button = renderPiece(piece, shootableIds.has(piece.id), state.completed || state.failed);
    button.addEventListener('click', onPieceClick);
    board.appendChild(button);
  });

  if (state.completed) {
    status.textContent = `Level cleared in ${state.moveCount} taps`;
    hint.textContent = '全部清空了。下一步接关卡流转、星级和动画。';
    return;
  }

  if (state.failed) {
    status.textContent = `Lives: 0 · ${state.moveCount} taps`;
    hint.textContent = '生命值用完了。先重开，再找出路径完全畅通的箭头。';
    return;
  }

  status.textContent = `Lives: ${state.remainingLives} · Taps: ${state.moveCount}`;

  if (!state.lastShot) {
    hint.textContent = `当前可直接飞出的箭头：${getShootablePieceIds(state).join(', ') || '无'}`;
    return;
  }

  if (state.lastShot.ok) {
    hint.textContent = `已消除 ${state.lastShot.removedPieceId}，继续找下一个路径无遮挡的箭头。`;
    return;
  }

  hint.textContent = `点击失败：被 ${state.lastShot.blockedByPieceId ?? '未知棋子'} 挡住。`;
}

function createMobileShellPreview(): HTMLElement {
  const wrapper = document.createElement('section');
  wrapper.className = 'mobile-preview';
  wrapper.innerHTML = `
    <div class="phone-card">
      <div class="phone-card__header">Android / iOS App Shell</div>
      <div class="phone-card__body">
        <div class="phone-card__screen">Home</div>
        <div class="phone-card__screen">Level Map</div>
        <div class="phone-card__screen">Game</div>
        <div class="phone-card__screen">Result</div>
      </div>
      <div class="phone-card__footer">共享规则核 + 平台壳分层</div>
    </div>
  `;
  return wrapper;
}

export function createPrototypeApp(): HTMLElement {
  let levelIndex = 0;
  let state = createInitialState(tutorialLevels[levelIndex]);

  const shell = document.createElement('main');
  shell.className = 'shell';

  const title = document.createElement('h1');
  title.textContent = 'Arrow Again MVP Prototype';

  const intro = document.createElement('p');
  intro.textContent = '已从旧 Parking Jam 拖拽原型收口到箭头点击消除规则核，并同步按 Android / iOS 双端启动。';

  const controls = document.createElement('div');
  controls.className = 'controls';

  const reset = document.createElement('button');
  reset.textContent = 'Replay';

  const nextLevel = document.createElement('button');
  nextLevel.textContent = 'Next Level';

  controls.append(reset, nextLevel);

  const status = document.createElement('div');
  status.className = 'status';

  const hint = document.createElement('div');
  hint.className = 'hint';

  const board = document.createElement('div');
  board.className = 'board';

  function repaint(): void {
    renderBoard(state, board, status, hint, handlePieceClick);
  }

  function handlePieceClick(event: MouseEvent): void {
    const target = event.currentTarget as HTMLButtonElement;
    const pieceId = target.dataset.pieceId;
    if (!pieceId) {
      return;
    }

    state = shootPiece(state, pieceId);
    repaint();
  }

  reset.addEventListener('click', () => {
    state = createInitialState(tutorialLevels[levelIndex]);
    repaint();
  });

  nextLevel.addEventListener('click', () => {
    levelIndex = (levelIndex + 1) % tutorialLevels.length;
    state = createInitialState(tutorialLevels[levelIndex]);
    repaint();
  });

  shell.append(title, intro, controls, status, hint, board, createMobileShellPreview());
  repaint();
  return shell;
}
