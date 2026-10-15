import { onSteadyRun, paceMood, todaysMoods, VICTORY_MS } from '../mood';
import type { Completion, Dimension } from '../types';

const at = (h: number, m = 0) => h * 60 + m;
const done = (dimension: Dimension, minutes: number): Completion => ({
  id: `${dimension}-${minutes}`,
  questId: `q-${minutes}`,
  dimension,
  date: '2026-10-15',
  xp: 10,
  at: minutes,
});

describe('paceMood', () => {
  it('is anxious when well behind the day', () => {
    expect(paceMood(0, 6, at(15))).toBe('anxious');
  });

  it('is confident a little ahead, and in overdrive far ahead', () => {
    expect(paceMood(3, 6, at(10))).toBe('confident');
    expect(paceMood(5, 6, at(8))).toBe('overdrive');
  });

  it('says nothing when on pace or with nothing due', () => {
    expect(paceMood(3, 6, at(14, 30))).toBeNull();
    expect(paceMood(0, 0, at(15))).toBeNull();
  });
});

describe('onSteadyRun', () => {
  it('needs three in a row about an hour apart, the last one recent', () => {
    expect(onSteadyRun([at(9), at(10), at(11)], at(11, 30))).toBe(true);
    expect(onSteadyRun([at(9), at(11, 30), at(12)], at(12, 10))).toBe(false);
    expect(onSteadyRun([at(9), at(10), at(11)], at(13))).toBe(false);
  });
});

describe('todaysMoods', () => {
  const base = { today: '2026-10-15', now: 1_000_000 };

  it('plays the victory dance right after a level-up, then moves on', () => {
    const c = [done('physical', at(12))];
    const fresh = todaysMoods({ ...base, completions: c, minutes: at(12), done: 1, total: 4, victoryAt: base.now - 1000 });
    expect(fresh.current).toBe('victory');
    const later = todaysMoods({ ...base, completions: c, minutes: at(12), done: 1, total: 4, victoryAt: base.now - VICTORY_MS });
    expect(later.current).toBe('strong');
    expect(later.earned).toContain('victory');
  });

  it('keeps cool on a habit an hour', () => {
    const c = [done('physical', at(9)), done('social', at(10)), done('financial', at(11))];
    expect(todaysMoods({ ...base, completions: c, minutes: at(11, 40), done: 3, total: 8 }).current).toBe('cool');
  });

  it("shows a just-done habit's Path, then the day's pace", () => {
    const c = [done('intellectual', at(16))];
    expect(todaysMoods({ ...base, completions: c, minutes: at(16, 10), done: 1, total: 6 }).current).toBe('smart');
    expect(todaysMoods({ ...base, completions: c, minutes: at(17), done: 1, total: 6 }).current).toBe('anxious');
  });
});
