import type { LevelConfig } from './types';

export const tutorialLevels: LevelConfig[] = [
  // Level 1: Tutorial - 3 free arrows, no blocking
  {
    id: 'level-1',
    rows: 5,
    cols: 5,
    lives: 3,
    pieces: [
      { id: 'a', row: 2, col: 1, direction: 'left', color: '#22c55e' },
      { id: 'b', row: 1, col: 3, direction: 'up', color: '#f59e0b' },
      { id: 'c', row: 3, col: 3, direction: 'down', color: '#38bdf8' },
    ],
  },
  // Level 2: Simple blocking - must shoot b before a
  {
    id: 'level-2',
    rows: 5,
    cols: 5,
    lives: 3,
    pieces: [
      { id: 'a', row: 2, col: 1, direction: 'right', color: '#22c55e' },
      { id: 'b', row: 2, col: 3, direction: 'right', color: '#ef4444' },
      { id: 'c', row: 0, col: 4, direction: 'down', color: '#a855f7' },
      { id: 'd', row: 4, col: 0, direction: 'up', color: '#f59e0b' },
    ],
  },
  // Level 3: Chain dependency A→B→C
  {
    id: 'level-3',
    rows: 6,
    cols: 6,
    lives: 2,
    pieces: [
      { id: 'a', row: 1, col: 1, direction: 'right', color: '#14b8a6' },
      { id: 'b', row: 1, col: 4, direction: 'down', color: '#8b5cf6' },
      { id: 'c', row: 4, col: 4, direction: 'left', color: '#f97316' },
      { id: 'd', row: 4, col: 2, direction: 'up', color: '#eab308' },
      { id: 'e', row: 2, col: 2, direction: 'right', color: '#ec4899' },
    ],
  },
  // Level 4: Cross-blocking (7x7, 8 pieces)
  {
    id: 'level-4',
    rows: 7,
    cols: 7,
    lives: 3,
    pieces: [
      // Top horizontal chain: f→e→d (right direction, must shoot outermost first)
      { id: 'd', row: 1, col: 5, direction: 'right', color: '#ef4444' },
      { id: 'e', row: 1, col: 3, direction: 'right', color: '#f59e0b' },
      { id: 'f', row: 1, col: 1, direction: 'right', color: '#22c55e' },
      // Vertical blocker: g blocks h
      { id: 'g', row: 3, col: 3, direction: 'up', color: '#8b5cf6' },
      { id: 'h', row: 5, col: 3, direction: 'up', color: '#38bdf8' },
      // Free arrows
      { id: 'i', row: 3, col: 0, direction: 'left', color: '#ec4899' },
      { id: 'j', row: 5, col: 6, direction: 'right', color: '#14b8a6' },
      { id: 'k', row: 5, col: 0, direction: 'down', color: '#f97316' },
    ],
  },
  // Level 5: Dense cross-pattern (8x8, 12 pieces)
  {
    id: 'level-5',
    rows: 8,
    cols: 8,
    lives: 3,
    pieces: [
      // Row 1: horizontal chain
      { id: 'a', row: 1, col: 1, direction: 'right', color: '#22c55e' },
      { id: 'b', row: 1, col: 4, direction: 'right', color: '#ef4444' },
      { id: 'c', row: 1, col: 6, direction: 'down', color: '#f59e0b' },
      // Column blocking
      { id: 'd', row: 3, col: 6, direction: 'right', color: '#8b5cf6' },
      { id: 'e', row: 3, col: 3, direction: 'left', color: '#38bdf8' },
      { id: 'f', row: 3, col: 1, direction: 'down', color: '#ec4899' },
      // Bottom row
      { id: 'g', row: 5, col: 1, direction: 'down', color: '#14b8a6' },
      { id: 'h', row: 6, col: 3, direction: 'left', color: '#f97316' },
      { id: 'i', row: 5, col: 5, direction: 'up', color: '#a855f7' },
      // Edge free
      { id: 'j', row: 0, col: 0, direction: 'left', color: '#eab308' },
      { id: 'k', row: 7, col: 7, direction: 'right', color: '#06b6d4' },
      { id: 'l', row: 7, col: 2, direction: 'down', color: '#84cc16' },
    ],
  },
];

export const demoLevel = tutorialLevels[0];
