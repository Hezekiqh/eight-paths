import { migrateSave, sanitizeSave, type Migration } from '../migrations';

const player = {
  name: 'Ada',
  classDimension: 'intellectual',
  restTokens: 2,
  onboardedAt: '2026-09-01',
  tutorialComplete: true,
  notificationTime: '20:00',
};
const quest = {
  id: 'q1',
  title: 'Read 20 min',
  dimension: 'intellectual',
  repeatDays: [0, 1, 2, 3, 4, 5, 6],
  active: true,
  createdAt: '2026-09-01T12:00:00.000Z',
};
const completion = { id: 'c1', questId: 'q1', dimension: 'intellectual', date: '2026-09-02', xp: 13 };
const valid = {
  player,
  quests: [quest],
  completions: [completion],
  restDays: [{ date: '2026-09-03', dimension: 'all' }],
  lastSettledDate: '2026-09-03',
};

describe('sanitizeSave', () => {
  it('keeps a valid save exactly as it is', () => {
    expect(sanitizeSave(valid)).toEqual(valid);
  });

  it('turns garbage into an empty game instead of crashing', () => {
    for (const junk of [null, undefined, 42, 'nope', []]) {
      expect(sanitizeSave(junk)).toEqual({
        player: null,
        quests: [],
        completions: [],
        restDays: [],
        lastSettledDate: null,
      });
    }
  });

  it('fills missing collections without touching the player', () => {
    const save = sanitizeSave({ player });
    expect(save.player).toEqual(player);
    expect(save.quests).toEqual([]);
    expect(save.completions).toEqual([]);
  });

  it('drops only the malformed records', () => {
    const save = sanitizeSave({
      ...valid,
      completions: [
        completion,
        { ...completion, id: 'bad-date', date: 'yesterday' },
        { ...completion, id: 'bad-dim', dimension: 'culinary' },
        { ...completion, id: 'bad-xp', xp: -5 },
        'not even an object',
      ],
      quests: [quest, { id: 'q2' }],
    });
    expect(save.completions.map((c) => c.id)).toEqual(['c1']);
    expect(save.quests.map((q) => q.id)).toEqual(['q1']);
  });

  it('repairs out-of-range player settings', () => {
    const save = sanitizeSave({ ...valid, player: { ...player, restTokens: 9, notificationTime: '99:99', name: '' } });
    expect(save.player).toMatchObject({ restTokens: 3, notificationTime: '20:00', name: 'Adventurer' });
  });

  it('cleans quest schedules', () => {
    const save = sanitizeSave({ ...valid, quests: [{ ...quest, repeatDays: [5, 1, 1, 9, -1, 'x'] }] });
    expect(save.quests[0].repeatDays).toEqual([1, 5]);
  });
});

describe('migrateSave', () => {
  it('runs each step from the saved version up to the current one', () => {
    const steps: Record<number, Migration> = {
      1: (s) => ({ ...s, lastSettledDate: '2026-09-10' }),
      2: (s) => ({ ...s, quests: [] }),
    };
    const from1 = migrateSave(valid, 1, steps, 3);
    expect(from1.lastSettledDate).toBe('2026-09-10');
    expect(from1.quests).toEqual([]);

    const from2 = migrateSave(valid, 2, steps, 3);
    expect(from2.lastSettledDate).toBe('2026-09-03');
    expect(from2.quests).toEqual([]);
  });

  it('keeps what it understands from a newer save', () => {
    const fromFuture = migrateSave({ ...valid, somethingNew: true }, 7, {}, 1);
    expect(fromFuture).toEqual(valid);
  });
});
