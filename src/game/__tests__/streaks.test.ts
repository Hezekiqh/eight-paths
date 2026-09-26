import { dimensionStreak, habitStreak } from '../streaks';
import { WEEKDAYS } from '../quests';
import { done, quest } from './helpers';

const today = '2026-09-26'; // Saturday

describe('dimensionStreak', () => {
  it('is 0 with no completions', () => {
    expect(dimensionStreak([], [], 'physical', today)).toBe(0);
  });

  it('counts consecutive days including today', () => {
    const cs = [done('2026-09-24'), done('2026-09-25'), done(today)];
    expect(dimensionStreak(cs, [], 'physical', today)).toBe(3);
  });

  it("doesn't break before today is over", () => {
    const cs = [done('2026-09-24'), done('2026-09-25')];
    expect(dimensionStreak(cs, [], 'physical', today)).toBe(2);
  });

  it('breaks on a missed day', () => {
    const cs = [done('2026-09-22'), done('2026-09-24'), done('2026-09-25')];
    expect(dimensionStreak(cs, [], 'physical', today)).toBe(2);
  });

  it('is 0 once a full day is missed', () => {
    expect(dimensionStreak([done('2026-09-24')], [], 'physical', today)).toBe(0);
  });

  it('only counts its own dimension, and one completion is enough', () => {
    const cs = [done('2026-09-25', 'social'), done('2026-09-25', 'physical'), done('2026-09-25', 'physical', 'q2')];
    expect(dimensionStreak(cs, [], 'physical', today)).toBe(1);
    expect(dimensionStreak(cs, [], 'financial', today)).toBe(0);
  });

  it('survives a rest day without counting it', () => {
    const cs = [done('2026-09-23'), done('2026-09-25')];
    const rest = [{ date: '2026-09-24', dimension: 'all' as const }];
    expect(dimensionStreak(cs, rest, 'physical', today)).toBe(2);
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

  it('survives a rest day', () => {
    const q = quest();
    const cs = [done('2026-09-23'), done('2026-09-25')];
    const rest = [{ date: '2026-09-24', dimension: 'all' as const }];
    expect(habitStreak(q, cs, rest, today)).toBe(2);
  });
});
