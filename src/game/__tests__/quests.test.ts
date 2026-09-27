import { WEEKDAYS, describeSchedule, questsForDay, scheduleKind, toggleCompletion } from '../quests';
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

  it('completes for 10 XP', () => {
    const r = toggleCompletion([], quest(), today, 'new');
    expect(r.kind).toBe('completed');
    expect(r.completions).toEqual([{ id: 'new', questId: 'q1', dimension: 'physical', date: today, xp: 10 }]);
  });

  it('undoes a same-day completion', () => {
    const first = toggleCompletion([], quest(), today, 'new');
    const second = toggleCompletion(first.completions, quest(), today, 'x');
    expect(second.kind).toBe('undone');
    expect(second.completions).toEqual([]);
  });

  it('never touches a previous day', () => {
    const yesterday = done('2026-09-25');
    const r = toggleCompletion([yesterday], quest(), today, 'new');
    expect(r.kind).toBe('completed');
    expect(r.completions).toHaveLength(2);
  });
});

describe('describeSchedule', () => {
  it('names common schedules', () => {
    expect(describeSchedule([0, 1, 2, 3, 4, 5, 6])).toBe('Daily');
    expect(describeSchedule([5, 4, 3, 2, 1])).toBe('Weekdays');
    expect(describeSchedule([])).toBe('Never');
  });

  it('lists custom days Monday first', () => {
    expect(describeSchedule([0, 3, 1])).toBe('Mon · Wed · Sun');
    expect(scheduleKind([0, 6])).toBe('custom');
  });
});

