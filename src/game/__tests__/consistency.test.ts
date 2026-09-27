import { consistency, consistencyWindows } from '../consistency';
import { daysShownUp, milestoneCrossed, nextMilestone } from '../milestones';
import { done, quest } from './helpers';

const today = '2026-09-26'; // Saturday
const daily = quest({ createdAt: '2026-09-01T12:00:00' });
const reading = quest({ id: 'q2', title: 'Read', dimension: 'intellectual', createdAt: '2026-09-01T12:00:00' });

describe('consistency', () => {
  it('is done ÷ due over the window', () => {
    const cs = [done('2026-09-20'), done('2026-09-22'), done('2026-09-24')];
    // 20th–25th: 6 due days, 3 done. Today isn't done, so it isn't counted yet.
    expect(consistency([daily], cs, [], '2026-09-20', today, today)).toEqual({ done: 3, due: 6, rate: 0.5 });
  });

  it('counts today once it is done', () => {
    const cs = [done(today)];
    expect(consistency([daily], cs, [], today, today, today)).toEqual({ done: 1, due: 1, rate: 1 });
  });

  it('is null when nothing was due', () => {
    expect(consistency([], [], [], '2026-09-20', today, today).rate).toBeNull();
  });

  it('measures follow-through, not volume', () => {
    // One habit done every day beats two habits done half the time.
    const cs = ['2026-09-20', '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25'].map((d) => done(d));
    expect(consistency([daily], cs, [], '2026-09-20', today, today).rate).toBe(1);
    const half = [done('2026-09-20'), done('2026-09-21', 'intellectual', 'q2')];
    expect(consistency([daily, reading], half, [], '2026-09-20', '2026-09-21', today).rate).toBe(0.5);
  });

  it('excuses rest days, skips days before a quest existed, and counts archived quests until archived', () => {
    const rest = [{ date: '2026-09-25', dimension: 'all' as const }];
    expect(consistency([daily], [done('2026-09-24')], rest, '2026-09-24', today, today).due).toBe(1);
    const late = quest({ createdAt: '2026-09-24T12:00:00' });
    expect(consistency([late], [], [], '2026-09-20', today, today).due).toBe(2);
    const archived = quest({ active: false, archivedAt: '2026-09-22', createdAt: '2026-09-01T12:00:00' });
    expect(consistency([archived], [], [], '2026-09-20', today, today).due).toBe(2);
  });

  it('filters by Path and compares with the previous window', () => {
    const cs = [done('2026-09-25'), done('2026-09-18')];
    const { current, previous } = consistencyWindows([daily, reading], cs, [], 7, today, 'physical');
    expect(current.due).toBe(6);
    expect(current.done).toBe(1);
    expect(previous.due).toBe(7);
    expect(previous.done).toBe(1);
  });
});

describe('milestones', () => {
  it('counts distinct days shown up', () => {
    expect(daysShownUp([done('2026-09-25'), done('2026-09-25', 'social'), done(today)])).toBe(2);
  });

  it('spots a milestone being crossed', () => {
    expect(milestoneCrossed(0, 1)).toBe(1);
    expect(milestoneCrossed(6, 7)).toBe(7);
    expect(milestoneCrossed(7, 7)).toBeNull();
    expect(milestoneCrossed(8, 9)).toBeNull();
    expect(nextMilestone(7)).toBe(14);
  });
});
