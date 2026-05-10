import type { LevelConfig } from './types';

export const tutorialLevels: LevelConfig[] = [
  {
    id: 'arrow-tutorial-1',
    rows: 5,
    cols: 5,
    lives: 3,
    pieces: [
      { id: 'a', row: 2, col: 1, direction: 'left', color: '#22c55e' },
      { id: 'b', row: 1, col: 3, direction: 'up', color: '#f59e0b' },
      { id: 'c', row: 3, col: 2, direction: 'down', color: '#38bdf8' }
    ]
  },
  {
    id: 'arrow-tutorial-2',
    rows: 5,
    cols: 5,
    lives: 3,
    pieces: [
      { id: 'a', row: 2, col: 1, direction: 'right', color: '#22c55e' },
      { id: 'b', row: 2, col: 3, direction: 'right', color: '#ef4444' },
      { id: 'c', row: 0, col: 4, direction: 'down', color: '#a855f7' },
      { id: 'd', row: 4, col: 0, direction: 'up', color: '#f59e0b' }
    ]
  },
  {
    id: 'arrow-tutorial-3',
    rows: 6,
    cols: 6,
    lives: 2,
    pieces: [
      { id: 'a', row: 1, col: 1, direction: 'right', color: '#14b8a6' },
      { id: 'b', row: 1, col: 4, direction: 'down', color: '#8b5cf6' },
      { id: 'c', row: 4, col: 4, direction: 'left', color: '#f97316' },
      { id: 'd', row: 4, col: 2, direction: 'up', color: '#eab308' },
      { id: 'e', row: 2, col: 2, direction: 'right', color: '#ec4899' }
    ]
  }
];

export const demoLevel = tutorialLevels[0];
