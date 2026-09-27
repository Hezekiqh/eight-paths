import { dailyObjectives, isObjectiveDone, seededRoll, weekStart, weeklyObjectives } from '../objectives';

import { done, quest } from './helpers';

// 2026-09-23 is a Wednesday.
const today = '2026-09-23';
const quests = [
  quest({ id: 'move', dimension: 'physical' }),
  quest({ id: 'read', dimension: 'intellectual' }),
  quest({ id: 'save', dimension: 'financial', repeatDays: [1, 3, 5] }),
];

describe('objectives', () => {
  it('starts weeks on Monday', () => {
    expect(weekStart('2026-09-23')).toBe('2026-09-21');
    expect(weekStart('2026-09-21')).toBe('2026-09-21');
    expect(weekStart('2026-09-27')).toBe('2026-09-21');
  });

  it('rolls the same way for the same seed', () => {
    expect(seededRoll('drop:x')).toBe(seededRoll('drop:x'));
    expect(seededRoll('a')).toBeGreaterThanOrEqual(0);
    expect(seededRoll('a')).toBeLessThan(1);
  });

  it('builds three daily objectives from quests due today', () => {
    const daily = dailyObjectives(quests, [], today, 'physical');
    expect(daily).toHaveLength(3);
    const path = daily.find((o) => o.reward.kind === 'boost')!;
    expect(['physical', 'intellectual', 'financial']).toContain(path.dimension);
    expect(daily.find((o) => o.id.endsWith(':count'))!.target).toBe(3);
    expect(daily.every((o) => o.progress === 0)).toBe(true);
    // Same day, same objectives.
    expect(dailyObjectives(quests, [], today, 'physical')).toEqual(daily);
  });

  it('tracks daily progress from completions', () => {
    const daily = dailyObjectives(quests, [done(today, 'physical', 'move'), done(today, 'intellectual', 'read')], today, 'physical');
    expect(isObjectiveDone(daily[0])).toBe(true);
    expect(daily[2]).toMatchObject({ progress: 2, target: 3 });
  });

  it('counts the week from Monday to Sunday', () => {
    const history = [
      done('2026-09-20', 'physical', 'move'), // last Sunday: not this week
      done('2026-09-21', 'physical', 'move'),
      done('2026-09-22', 'intellectual', 'read'),
      done('2026-09-23', 'financial', 'save'),
    ];
    const [showUp, count, paths] = weeklyObjectives(quests, history, today);
    expect(showUp).toMatchObject({ progress: 3, target: 5, reward: { kind: 'grace' } });
    expect(count.progress).toBe(3);
    expect(paths).toMatchObject({ progress: 3, target: 3 });
  });
});
