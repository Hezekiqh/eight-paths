import { WEEKDAYS, questsForDay, toggleCompletion } from '../quests';
import { done, quest } from './helpers';

describe('questsForDay', () => {
  it('returns active quests scheduled that weekday', () => {
    const qs = [quest({ id: 'daily' }), quest({ id: 'weekday', repeatDays: WEEKDAYS }), quest({ id: 'off', active: false })];
    expect(questsForDay(qs, '2026-09-26').map((q) => q.id)).toEqual(['daily']); // Saturday
    expect(questsForDay(qs, '2026-09-25').map((q) => q.id)).toEqual(['daily', 'weekday']); // Friday
  });
});

describe('toggleCompletion', () => {
  const today = '2026-09-26';

  it('completes with class-aware XP', () => {
    const r = toggleCompletion([], quest(), 'physical', today, 'new');
    expect(r.kind).toBe('completed');
    expect(r.completions).toEqual([{ id: 'new', questId: 'q1', dimension: 'physical', date: today, xp: 13 }]);
  });

  it('undoes a same-day completion', () => {
    const first = toggleCompletion([], quest(), 'social', today, 'new');
    const second = toggleCompletion(first.completions, quest(), 'social', today, 'x');
    expect(second.kind).toBe('undone');
    expect(second.completions).toEqual([]);
  });

  it('never touches a previous day', () => {
    const yesterday = done('2026-09-25');
    const r = toggleCompletion([yesterday], quest(), 'social', today, 'new');
    expect(r.kind).toBe('completed');
    expect(r.completions).toHaveLength(2);
  });
});
