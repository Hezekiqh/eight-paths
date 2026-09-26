import type { Completion, Dimension, Quest } from '../types';

let n = 0;

export function done(date: string, dimension: Dimension = 'physical', questId = 'q1', xp = 10): Completion {
  n += 1;
  return { id: `c${n}`, questId, dimension, date, xp };
}

export function quest(overrides: Partial<Quest> = {}): Quest {
  return {
    id: 'q1',
    title: 'Move 30 min',
    dimension: 'physical',
    repeatDays: [0, 1, 2, 3, 4, 5, 6],
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}
