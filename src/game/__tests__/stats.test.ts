import { addDays } from '../dates';
import { slices, stats } from '../stats';
import type { Completion } from '../types';
import { done, quest } from './helpers';

const today = '2026-10-03'; // Saturday
const move = quest({ id: 'move', title: 'Move', dimension: 'physical', createdAt: '2026-08-01T12:00:00' });
const read = quest({ id: 'read', title: 'Read', dimension: 'intellectual', createdAt: '2026-08-01T12:00:00' });
const call = quest({ id: 'call', title: 'Call', dimension: 'social', createdAt: '2026-08-01T12:00:00' });

/** `questId` done on each of the last `days` days (today included), every `every` days. */
function streak(questId: string, dimension: Completion['dimension'], days: number, every = 1, from = today): Completion[] {
  const out: Completion[] = [];
  for (let i = 0; i < days; i += every) out.push({ ...done(addDays(from, -i), dimension, questId), at: 19 * 60 });
  return out;
}

describe('the Stats tab', () => {
  // Move every day for two weeks; Read every day this week only; Call every other day.
  const completions = [
    ...streak('move', 'physical', 14),
    ...streak('read', 'intellectual', 7),
    ...streak('call', 'social', 14, 2),
  ];
  const week = stats([move, read, call], completions, [], today, 'week');

  it('rates each Path over the period, and how it moved from the period before', () => {
    const by = Object.fromEntries(week.paths.map((p) => [p.dimension, p]));
    expect(by.physical.current.rate).toBe(1);
    expect(by.intellectual.current.rate).toBe(1);
    expect(by.intellectual.change).toBe(1); // nothing last week, everything this week
    expect(by.social.current.rate).toBeCloseTo(4 / 7);
    expect(by.financial.current.rate).toBeNull();
  });

  it('calls out the most improved, the most consistent and the one needing tending', () => {
    expect(week.mostImproved?.dimension).toBe('intellectual');
    expect(['physical', 'intellectual']).toContain(week.mostConsistent?.dimension);
    expect(week.needsTending?.dimension).toBe('social');
  });

  it('cuts the week into 7 days, the month into 5 slices and the year into 12 months', () => {
    expect(week.timeline.map((b) => b.label)).toEqual(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
    const month = slices('month', addDays(today, -29), today);
    expect(month).toHaveLength(5);
    expect(month[0].from).toBe(addDays(today, -29));
    expect(month[4].to).toBe(today);
    const year = slices('year', addDays(today, -364), today);
    expect(year.map((s) => s.label)).toEqual(['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct']);
    expect(year[11]).toEqual({ label: 'Oct', from: '2026-10-01', to: today });
    expect(year[0]).toEqual({ label: 'Nov', from: '2025-11-01', to: '2025-11-30' });
  });

  it('adds the timeline up to the same total as the whole period', () => {
    const due = week.timeline.reduce((s, b) => s + b.due, 0);
    const doneDays = week.timeline.reduce((s, b) => s + b.done, 0);
    expect({ done: doneDays, due }).toEqual({ done: week.overall.current.done, due: week.overall.current.due });
  });

  it('finds the best weekday over a month, and when in the day things get done', () => {
    // Read only ever on Saturdays.
    const sat = [0, 7, 14, 21].map((k) => ({ ...done(addDays(today, -k), 'intellectual', 'read'), at: 8 * 60 }));
    const month = stats([read], sat, [], today, 'month');
    expect(month.bestDay?.label).toBe('Sat');
    expect(month.timeOfDay.find((t) => t.label === 'Morning')?.count).toBe(4);
    expect(week.timeOfDay.find((t) => t.label === 'Evening')?.count).toBe(week.questsDone);
  });

  it('ranks the habits kept best, and names one slipping only when there is one', () => {
    expect(week.topHabits.map((h) => h.quest.id).slice(0, 2).sort()).toEqual(['move', 'read']);
    expect(week.slipping).toBeNull();
  });

  it('says nothing it cannot back up on a brand-new game', () => {
    const fresh = stats([quest({ createdAt: `${today}T08:00:00` })], [], [], today, 'year');
    expect(fresh.overall.current.rate).toBeNull();
    expect([fresh.mostImproved, fresh.mostConsistent, fresh.needsTending, fresh.bestDay]).toEqual([null, null, null, null]);
  });
});
