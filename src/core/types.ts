export type Direction = 'up' | 'right' | 'down' | 'left';

export interface Cell {
  row: number;
  col: number;
}

export interface ArrowPieceConfig {
  id: string;
  row: number;
  col: number;
  direction: Direction;
  color: string;
}

export interface LevelConfig {
  id: string;
  rows: number;
  cols: number;
  lives: number;
  pieces: ArrowPieceConfig[];
}

export interface ArrowPieceState extends ArrowPieceConfig {
  removed: boolean;
}

export interface ShotResult {
  ok: boolean;
  removedPieceId?: string;
  blockedByPieceId?: string;
  escapedCells: Cell[];
}

export interface GameState {
  level: LevelConfig;
  pieces: ArrowPieceState[];
  moveCount: number;
  remainingLives: number;
  completed: boolean;
  failed: boolean;
  lastShot: ShotResult | null;
}
