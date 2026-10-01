import { dimensionStreak, habitStreak, showUpStreak } from '../streaks';
import type { Completion, Quest, RestDay } from '../types';
import { WEEKDAYS } from '../quests';
import { done, quest } from './helpers';

const today = '2026-09-26'; // Saturday

const start = '2026-09-01';
const daily = quest({ createdAt: '2026-09-01T12:00:00' });
const streak = (cs: Completion[], rest: RestDay[] = [], quests: Quest[] = [daily]) =>
  dimensionStreak(cs, rest, quests, 'physical', start, today);

describe('dimensionStreak', () => {
  it('is 0 with no completions', () => {
    expect(streak([])).toEqual({ current: 0, best: 0 });
  });

  it('counts consecutive days including today', () => {
    expect(streak([done('2026-09-24'), done('2026-09-25'), done(today)]).current).toBe(3);
  });

  it("doesn't break before today is over", () => {
    expect(streak([done('2026-09-24'), done('2026-09-25')]).current).toBe(2);
  });

  it('breaks on a missed day but remembers the best run', () => {
    const cs = [done('2026-09-20'), done('2026-09-21'), done('2026-09-22'), done('2026-09-24'), done('2026-09-25')];
    expect(streak(cs)).toEqual({ current: 2, best: 3 });
  });

  it('is 0 once a full due day is missed', () => {
    expect(streak([done('2026-09-24')]).current).toBe(0);
  });

  it('only counts its own dimension, and one completion is enough', () => {
    const cs = [done('2026-09-25', 'social'), done('2026-09-25', 'physical'), done('2026-09-25', 'physical', 'q2')];
    expect(streak(cs).current).toBe(1);
    expect(dimensionStreak(cs, [], [daily], 'financial', start, today).current).toBe(0);
  });

  it('survives a rest day without counting it', () => {
    const rest = [{ date: '2026-09-24', dimension: 'all' as const }];
    expect(streak([done('2026-09-23'), done('2026-09-25')], rest).current).toBe(2);
  });

  it('skips days when nothing in the Path was due', () => {
    const mwf = quest({ repeatDays: [1, 3, 5], createdAt: '2026-09-01T12:00:00' });
    const cs = ['2026-09-21', '2026-09-23', '2026-09-25'].map((d) => done(d));
    expect(streak(cs, [], [mwf]).current).toBe(3);
    expect(dimensionStreak(cs, [], [mwf], 'physical', start, '2026-09-28').current).toBe(3);
  });
});

describe('showUpStreak', () => {
  it('counts days with any completion and only breaks on empty days', () => {
    const cs = [done('2026-09-23', 'social'), done('2026-09-24', 'physical'), done('2026-09-25', 'financial')];
    expect(showUpStreak(cs, [], start, today)).toEqual({ current: 3, best: 3 });
  });

  it('keeps the best run after a break', () => {
    const cs = ['2026-09-10', '2026-09-11', '2026-09-12', '2026-09-13', '2026-09-25'].map((d) => done(d));
    expect(showUpStreak(cs, [], start, today)).toEqual({ current: 1, best: 4 });
  });
});

describe('habitStreak', () => {
  it('counts consecutive completed daily scheduled days', () => {
    const q = quest();
    const cs = [done('2026-09-24'), done('2026-09-25'), done(today)];
    expect(habitStreak(q, cs, [], today)).toBe(3);
  });

  it('skips unscheduled days', () => {
    const q = quest({ repeatDays: WEEKDAYS });
    // Mon 21 – Fri 25 done; Sat 26 unscheduled.
    const cs = ['2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25'].map((d) => done(d));
    expect(habitStreak(q, cs, [], today)).toBe(5);
    // Friday 18 done, weekend skipped, Monday 21 continues it.
    expect(habitStreak(q, [done('2026-09-18'), ...cs], [], '2026-09-27')).toBe(6);
  });

  it('breaks on a missed scheduled day', () => {
    const q = quest();
    const cs = [done('2026-09-23'), done('2026-09-25')];
    expect(habitStreak(q, cs, [], today)).toBe(1);
  });

  it('ignores other quests', () => {
    const q = quest();
    expect(habitStreak(q, [done('2026-09-25', 'physical', 'other')], [], today)).toBe(0);
  });

  it('passes over a skipped day', () => {
    const q = quest({ skippedOn: ['2026-09-24'] });
    const cs = [done('2026-09-23'), done('2026-09-25')];
    expect(habitStreak(q, cs, [], today)).toBe(2);
  });

  it('survives a rest day', () => {
    const q = quest();
    const cs = [done('2026-09-23'), done('2026-09-25')];
    const rest = [{ date: '2026-09-24', dimension: 'all' as const }];
    expect(habitStreak(q, cs, rest, today)).toBe(2);
  });
});
