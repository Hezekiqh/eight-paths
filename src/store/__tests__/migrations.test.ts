import { DEFAULT_PARTY } from '@/story/companions';

import { MIGRATIONS, migrateSave, sanitizeSave, type Migration } from '../migrations';

const player = {
  name: 'Ada',
  classDimension: 'intellectual',
  restTokens: 2,
  onboardedAt: '2026-09-01',
  tutorialComplete: true,
  notificationTime: '20:00',
  hapticsEnabled: true,
  objectivesLandscape: false,
  smartReminders: true,
};
const quest = {
  id: 'q1',
  title: 'Read 20 min',
  dimension: 'intellectual',
  repeatDays: [0, 1, 2, 3, 4, 5, 6],
  active: true,
  createdAt: '2026-09-01T12:00:00.000Z',
};
const completion = {
  id: 'c1',
  questId: 'q1',
  dimension: 'intellectual',
  date: '2026-09-02',
  xp: 13,
  characterId: 'quill',
  at: 19 * 60 + 5,
};
const valid = {
  player,
  quests: [quest],
  completions: [completion],
  restDays: [{ date: '2026-09-03', dimension: 'all' }],
  lastSettledDate: '2026-09-03',
  party: { ...DEFAULT_PARTY, intellectual: 'ottilie' },
  xpGrants: [{ id: 'g1', date: '2026-09-02', dimension: 'physical', xp: 20, characterId: 'brannoc', source: 'drop' }],
  boosts: [{ date: '2026-09-03', dimension: 'intellectual' }],
  shards: { thane: 2 },
  claimed: ['daily:2026-09-03:show-up'],
  goals: [
    { id: 'goal1', title: 'Run a 5K', dimension: 'physical', dueDate: '2026-12-01', createdAt: '2026-09-01' },
    { id: 'goal2', title: 'Call Mum', createdAt: '2026-09-01', completedAt: '2026-09-02' },
  ],
  revealed: ['brannoc', 'quill', 'ottilie'],
  owned: { brannoc: 1, quill: 1, ottilie: 2 },
  nextDraw: { intellectual: 12 },
  drops: ['ottilie'],
  redrawn: [],
  questOrder: null,
};

describe('v9: usual-time reminders', () => {
  it('learns the time for players who kept the 8 PM default, and keeps a chosen time', () => {
    const { smartReminders: _, ...old } = player;
    expect(sanitizeSave({ ...valid, player: old }).player?.smartReminders).toBe(true);
    const chosen = sanitizeSave({ ...valid, player: { ...old, notificationTime: '07:30' } }).player;
    expect(chosen).toMatchObject({ smartReminders: false, notificationTime: '07:30' });
  });

  it('keeps a completion time only when it is a real minute of the day', () => {
    const times = [undefined, -1, 1440, 12.5, '600', 0, 1439].map(
      (at) => sanitizeSave({ ...valid, completions: [{ ...completion, at }] }).completions[0].at,
    );
    expect(times).toEqual([undefined, undefined, undefined, undefined, undefined, 0, 1439]);
  });
});

describe('v8: Premium redos', () => {
  it('upgrades a v7 save with no redos yet', () => {
    const { redrawn: _r, ...v7 } = valid;
    expect(migrateSave(v7, 7).redrawn).toEqual([]);
  });
});

describe('v7: random arrivals', () => {
  it('upgrades a v6 save so reconcileDraws works out who was already unlocked', () => {
    const { owned: _o, nextDraw: _n, drops: _d, ...v6 } = valid;
    const save = migrateSave(v6, 6);
    expect(save.owned).toBeNull();
    expect(save.nextDraw).toEqual({});
    expect(save.drops).toEqual([]);
  });
});

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
        party: DEFAULT_PARTY,
        xpGrants: [],
        boosts: [],
        shards: {},
        claimed: [],
        goals: [],
        revealed: null,
        owned: null,
        nextDraw: {},
        drops: [],
        redrawn: [],
        questOrder: null,
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

  it('upgrades a v1 save: core companions hold every slot and get credit for past XP', () => {
    const { party: _, ...v1 } = valid;
    const upgraded = migrateSave({ ...v1, completions: [{ ...completion, characterId: undefined }] }, 1, MIGRATIONS, 2);
    expect(upgraded.party).toEqual(DEFAULT_PARTY);
    expect(upgraded.completions[0].characterId).toBe('quill');
  });

  it('upgrades a v4 save to count everyone already unlocked as met (revealed: null)', () => {
    const { revealed: _, ...v4 } = valid;
    expect(migrateSave(v4, 4, MIGRATIONS, 5).revealed).toBeNull();
  });

  it('keeps each party slot on its own Path', () => {
    const party = sanitizeSave({
      ...valid,
      party: { intellectual: 'brannoc', physical: 'dessa', social: 'nobody' },
    }).party;
    expect(party).toEqual({ ...DEFAULT_PARTY, physical: 'dessa' });
  });

  it('keeps what it understands from a newer save', () => {
    const fromFuture = migrateSave({ ...valid, somethingNew: true }, 7, {}, 1);
    expect(fromFuture).toEqual(valid);
  });
});
