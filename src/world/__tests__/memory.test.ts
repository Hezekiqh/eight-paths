import { initialData, type GameData } from '@/store';

import { fill, habitMemory } from '../memory';

const done = (date: string, dimension: 'physical' | 'emotional' = 'physical') => ({
  id: `${date}-${dimension}`,
  questId: 'q',
  dimension,
  date,
  xp: 10,
});

const data = (dates: string[]): GameData =>
  ({
    ...initialData,
    player: { ...(initialData.player ?? {}), onboardedAt: '2026-09-01' } as GameData['player'],
    completions: dates.map((d) => done(d)),
  }) as GameData;

describe('what the World remembers', () => {
  it('counts habits, days and the run you are on', () => {
    const m = habitMemory(data(['2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30']), '2026-09-30');
    expect(m.habits).toBe(4);
    expect(m.days).toBe(4);
    expect(m.streak).toBe(4);
    expect(m.strongest?.name).toBeDefined();
  });

  it('remembers the longest gap as the comeback that ended it', () => {
    const m = habitMemory(data(['2026-03-01', '2026-03-13', '2026-03-14']), '2026-03-15');
    expect(m.comeback).toEqual({ gap: 11, month: 'March', endedDaysAgo: 2 });
  });

  it('has no comeback for short breaks', () => {
    expect(habitMemory(data(['2026-09-01', '2026-09-03']), '2026-09-04').comeback).toBeNull();
  });

  it('fills lines, and drops ones it has nothing for', () => {
    expect(fill('{n} days', { n: 7 })).toBe('7 days');
    expect(fill('Back in {month}', {})).toBeNull();
  });
});
