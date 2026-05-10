import type { ArrowPieceState, Cell, Direction, GameState, LevelConfig, ShotResult } from './types';

const DIRECTION_VECTORS: Record<Direction, Cell> = {
  up: { row: -1, col: 0 },
  right: { row: 0, col: 1 },
  down: { row: 1, col: 0 },
  left: { row: 0, col: -1 }
};

function clonePieces(level: LevelConfig): ArrowPieceState[] {
  return level.pieces.map((piece) => ({ ...piece, removed: false }));
}

function inBounds(level: LevelConfig, cell: Cell): boolean {
  return cell.row >= 0 && cell.row < level.rows && cell.col >= 0 && cell.col < level.cols;
}

function isOccupied(piece: ArrowPieceState, cell: Cell): boolean {
  return !piece.removed && piece.row === cell.row && piece.col === cell.col;
}

export function createInitialState(level: LevelConfig): GameState {
  return {
    level,
    pieces: clonePieces(level),
    moveCount: 0,
    remainingLives: level.lives,
    completed: false,
    failed: false,
    lastShot: null
  };
}

export function getPieceById(state: GameState, pieceId: string): ArrowPieceState | undefined {
  return state.pieces.find((piece) => piece.id === pieceId);
}

export function getActivePieces(state: GameState): ArrowPieceState[] {
  return state.pieces.filter((piece) => !piece.removed);
}

export function getShotPath(state: GameState, pieceId: string): ShotResult {
  const piece = getPieceById(state, pieceId);
  if (!piece || piece.removed) {
    return { ok: false, escapedCells: [] };
  }

  const vector = DIRECTION_VECTORS[piece.direction];
  const escapedCells: Cell[] = [];
  let cursor = { row: piece.row + vector.row, col: piece.col + vector.col };

  while (inBounds(state.level, cursor)) {
    escapedCells.push({ ...cursor });
    const blocker = getActivePieces(state).find((candidate) => candidate.id !== piece.id && isOccupied(candidate, cursor));
    if (blocker) {
      return {
        ok: false,
        blockedByPieceId: blocker.id,
        escapedCells
      };
    }
    cursor = { row: cursor.row + vector.row, col: cursor.col + vector.col };
  }

  return {
    ok: true,
    removedPieceId: piece.id,
    escapedCells
  };
}

export function getShootablePieceIds(state: GameState): string[] {
  return getActivePieces(state)
    .filter((piece) => getShotPath(state, piece.id).ok)
    .map((piece) => piece.id);
}

export function shootPiece(state: GameState, pieceId: string): GameState {
  if (state.completed || state.failed) {
    return state;
  }

  const result = getShotPath(state, pieceId);
  const nextMoveCount = state.moveCount + 1;

  if (!result.ok) {
    const remainingLives = Math.max(0, state.remainingLives - 1);
    return {
      ...state,
      moveCount: nextMoveCount,
      remainingLives,
      failed: remainingLives === 0,
      lastShot: result
    };
  }

  const pieces = state.pieces.map((piece) => {
    if (piece.id !== pieceId) {
      return piece;
    }

    return { ...piece, removed: true };
  });

  const completed = pieces.every((piece) => piece.removed);

  return {
    ...state,
    pieces,
    moveCount: nextMoveCount,
    completed,
    lastShot: result
  };
}
