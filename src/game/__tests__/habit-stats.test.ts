import { averageMinute, clockTime, habitStats } from '../habit-stats';
import type { Completion } from '../types';
import { done, quest } from './helpers';

const at = (date: string, minutes: number): Completion => ({ ...done(date), at: minutes });
// 2026-10-07 is a Wednesday; the habit began on Thursday the 1st
const q = quest({ createdAt: '2026-10-01T09:00:00' });
const TODAY = '2026-10-07';

describe('averageMinute', () => {
  it('averages the times of day', () => {
    expect(averageMinute([7 * 60, 8 * 60])).toBe(7 * 60 + 30);
  });
  it('counts the small hours as the end of the day before, not the start', () => {
    // 11 PM and 1 AM average to midnight, not to noon
    expect(averageMinute([23 * 60, 1 * 60])).toBe(0);
  });
  it('is null without any times', () => {
    expect(averageMinute([])).toBeNull();
  });
});

describe('clockTime', () => {
  it('reads like a clock', () => {
    expect(clockTime(7 * 60 + 5)).toBe('7:05 AM');
    expect(clockTime(0)).toBe('12:00 AM');
    expect(clockTime(12 * 60)).toBe('12:00 PM');
    expect(clockTime(21 * 60 + 30)).toBe('9:30 PM');
  });
});

describe('habitStats', () => {
  const completions = [
    at('2026-10-01', 7 * 60),
    at('2026-10-02', 8 * 60),
    done('2026-10-05'),
    at('2026-10-06', 9 * 60),
  ];
  const s = habitStats(q, completions, [], TODAY);

  it('averages only the completions that know their time', () => {
    expect(s.timed).toBe(3);
    expect(s.averageTime).toBe(8 * 60);
    expect(s.total).toBe(4);
  });

  it('marks the month: hits with their time, misses, today still open, the future off', () => {
    const days = s.month.weeks.flat().filter((d) => d !== null);
    const status = (date: string) => days.find((d) => d!.date === date)!;
    expect(status('2026-10-01')).toMatchObject({ status: 'hit', at: 7 * 60 });
    expect(status('2026-10-03').status).toBe('miss');
    expect(status('2026-10-07').status).toBe('open');
    expect(status('2026-10-20').status).toBe('off');
    expect(status('2026-09-30')?.status ?? 'off').toBe('off');
    expect(s.month.hits).toBe(4);
    expect(s.month.misses).toBe(2);
  });

  it('excuses skipped days and rest days instead of calling them misses', () => {
    const skipped = habitStats(
      { ...q, skippedOn: ['2026-10-03'] },
      completions,
      [{ date: '2026-10-04', dimension: 'all' }],
      TODAY,
    );
    const days = skipped.month.weeks.flat();
    expect(days.find((d) => d?.date === '2026-10-03')!.status).toBe('excused');
    expect(days.find((d) => d?.date === '2026-10-04')!.status).toBe('excused');
    expect(skipped.month.misses).toBe(0);
    expect(skipped.streak.current).toBe(4);
  });

  it('leaves unscheduled weekdays off', () => {
    const weekdaysOnly = habitStats({ ...q, repeatDays: [1, 2, 3, 4, 5] }, completions, [], TODAY);
    expect(weekdaysOnly.month.weeks.flat().find((d) => d?.date === '2026-10-03')!.status).toBe('off');
  });

  it('keeps streaks and rates the way the rest of the game does', () => {
    expect(s.streak).toEqual({ current: 2, best: 2 });
    // due Oct 1-6 (today only counts once done): 4 of 6
    expect(s.last30).toEqual({ done: 4, due: 6, rate: 4 / 6 });
  });

  it('names the best weekday only once it has been due twice', () => {
    expect(s.bestDay).toBeNull();
    const longer = habitStats(q, [...completions, done('2026-10-08'), done('2026-10-09')], [], '2026-10-10');
    expect(longer.bestDay).toMatchObject({ name: 'Thursday', done: 2, due: 2 });
  });

  it('shows another month when asked', () => {
    expect(habitStats(q, completions, [], TODAY, '2026-09').month.hits).toBe(0);
  });
});
