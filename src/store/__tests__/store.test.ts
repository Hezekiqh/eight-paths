import { useGameStore, initialData } from '../index';
import {
  selectAllQuestGroups,
  selectDimensionStats,
  selectOverallProgress,
  selectTodayQuestGroups,
} from '../selectors';

const today = '2026-09-26';

beforeEach(() => useGameStore.setState(initialData));

function start() {
  useGameStore.getState().startGame(
    {
      name: ' Ada ',
      classDimension: 'intellectual',
      quests: [
        { title: 'Read 20 min', dimension: 'intellectual' },
        { title: 'Move 30 min', dimension: 'physical' },
      ],
    },
    today,
  );
}

describe('game store', () => {
  it('starts a game at level 5 with 1 rest token and daily quests', () => {
    start();
    const s = useGameStore.getState();
    expect(s.player).toMatchObject({ name: 'Ada', classDimension: 'intellectual', restTokens: 1, onboardedAt: today });
    const [tutorial, ...starters] = s.quests;
    expect(tutorial).toMatchObject({ id: 'tutorial', dimension: 'intellectual', repeatDays: [], active: true });
    expect(starters.every((q) => q.repeatDays.length === 7)).toBe(true);
    for (const stat of selectDimensionStats(s, today)) expect(stat.progress.level).toBe(5);
    expect(selectOverallProgress(s).level).toBe(5);
  });

  it('completes and undoes a quest, reporting the XP gain', () => {
    start();
    const read = useGameStore.getState().quests[1];
    const outcome = useGameStore.getState().toggleQuest(read.id, today);
    expect(outcome.kind).toBe('completed');
    if (outcome.kind === 'completed') expect(outcome.gain.gained).toBe(13);

    const groups = selectTodayQuestGroups(useGameStore.getState(), today);
    expect(groups.find((g) => g.dimension === 'intellectual')?.quests[0].done).toBe(true);

    expect(useGameStore.getState().toggleQuest(read.id, today).kind).toBe('undone');
    expect(useGameStore.getState().completions).toHaveLength(0);
  });

  it('reports a level-up', () => {
    start();
    const move = useGameStore.getState().quests[2];
    for (let day = 1; day <= 2; day += 1) {
      useGameStore.getState().toggleQuest(move.id, `2026-09-${String(day).padStart(2, '0')}`);
    }
    const outcome = useGameStore.getState().toggleQuest(move.id, today);
    expect(outcome.kind === 'completed' && outcome.gain.leveledUp).toBe(true);
    if (outcome.kind === 'completed') expect(outcome.gain.after.level).toBe(6);
  });

  it('archives quests out of today', () => {
    start();
    const read = useGameStore.getState().quests[1];
    useGameStore.getState().archiveQuest(read.id);
    const groups = selectTodayQuestGroups(useGameStore.getState(), today);
    expect(groups.map((g) => g.dimension)).toEqual(['physical']);
  });

  it('completes the tutorial for class XP, then retires it', () => {
    start();
    const outcome = useGameStore.getState().toggleQuest('tutorial', today);
    expect(outcome.kind === 'completed' && outcome.gain.gained).toBe(13);
    useGameStore.getState().completeTutorial();
    const s = useGameStore.getState();
    expect(s.player?.tutorialComplete).toBe(true);
    expect(s.quests.find((q) => q.id === 'tutorial')?.active).toBe(false);
    expect(selectTodayQuestGroups(s, today).flatMap((g) => g.quests.map((v) => v.quest.id))).not.toContain('tutorial');
  });

  it('lists every active quest except the tutorial, with its schedule', () => {
    start();
    const views = selectAllQuestGroups(useGameStore.getState(), today).flatMap((g) => g.quests);
    expect(views.map((v) => v.quest.title)).toEqual(['Move 30 min', 'Read 20 min']);
    expect(views[0].schedule).toBe('Daily');
  });

  it('edits a quest in place', () => {
    start();
    const move = useGameStore.getState().quests[2];
    useGameStore.getState().updateQuest(move.id, { title: ' Lift ', dimension: 'physical', repeatDays: [5, 1, 3] });
    expect(useGameStore.getState().quests[2]).toMatchObject({ id: move.id, title: 'Lift', repeatDays: [1, 3, 5] });
  });

  it('lets yesterday be logged until noon, refunding a spent rest token', () => {
    start();
    const read = useGameStore.getState().quests[1];
    useGameStore.getState().settle('2026-09-27');
    expect(useGameStore.getState().player?.restTokens).toBe(0);

    const morning = new Date(2026, 8, 27, 9, 0);
    const outcome = useGameStore.getState().toggleQuest(read.id, '2026-09-27', today, morning);
    expect(outcome.kind).toBe('completed');
    const s = useGameStore.getState();
    expect(s.completions.map((c) => c.date)).toEqual([today]);
    expect(s.player?.restTokens).toBe(1);
    expect(s.restDays).toEqual([]);

    const afternoon = new Date(2026, 8, 27, 13, 0);
    expect(useGameStore.getState().toggleQuest(read.id, '2026-09-27', today, afternoon).kind).toBe('ignored');
    expect(useGameStore.getState().toggleQuest(read.id, '2026-09-27', '2026-09-25', morning).kind).toBe('ignored');
  });

  it('celebrates the first day shown up', () => {
    start();
    const outcome = useGameStore.getState().toggleQuest('tutorial', today);
    expect(outcome.kind === 'completed' && outcome.milestone?.title).toBe('Day one');
    const read = useGameStore.getState().quests[1];
    const second = useGameStore.getState().toggleQuest(read.id, today);
    expect(second.kind === 'completed' && second.milestone).toBeNull();
  });

  it('halves XP past three completions in one Path per day', () => {
    start();
    for (const title of ['A', 'B', 'C', 'D']) {
      useGameStore.getState().addQuest({ title, dimension: 'physical', repeatDays: [0, 1, 2, 3, 4, 5, 6] });
    }
    const ids = useGameStore.getState().quests.slice(-4).map((q) => q.id);
    const gains = ids.map((id) => {
      const o = useGameStore.getState().toggleQuest(id, today);
      return o.kind === 'completed' ? o.gain.gained : 0;
    });
    expect(gains).toEqual([10, 10, 10, 5]);
  });

  it('stamps the archive date so past days still count as due', () => {
    start();
    const read = useGameStore.getState().quests[1];
    useGameStore.getState().archiveQuest(read.id);
    expect(useGameStore.getState().quests[1].archivedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('round-trips a backup and rejects junk', () => {
    start();
    useGameStore.getState().toggleQuest('tutorial', today);
    const backup = useGameStore.getState().exportSave();
    useGameStore.setState(initialData);
    expect(useGameStore.getState().importSave('hello').ok).toBe(false);
    expect(useGameStore.getState().importSave('{"app":"other","version":1}').ok).toBe(false);
    expect(useGameStore.getState().importSave(backup).ok).toBe(true);
    const s = useGameStore.getState();
    expect(s.player?.name).toBe('Ada');
    expect(s.completions).toHaveLength(1);
  });

  it('settles missed days with a rest token', () => {
    start();
    useGameStore.getState().settle('2026-09-28');
    const s = useGameStore.getState();
    expect(s.player?.restTokens).toBe(0);
    expect(s.restDays).toEqual([{ date: today, dimension: 'all' }]);
    expect(s.lastSettledDate).toBe('2026-09-27');
  });
});

describe('loading a saved game', () => {
  const AsyncStorage = jest.requireMock('@react-native-async-storage/async-storage');

  const saved = {
    player: {
      name: 'Ada',
      classDimension: 'intellectual',
      restTokens: 2,
      onboardedAt: '2026-09-01',
      tutorialComplete: true,
      notificationTime: '21:30',
    },
    quests: [],
    completions: [{ id: 'c1', questId: 'q1', dimension: 'intellectual', date: '2026-09-02', xp: 13 }],
    restDays: [],
    lastSettledDate: '2026-09-02',
  };

  it('keeps progress from an older save version', async () => {
    await AsyncStorage.setItem('eight-paths', JSON.stringify({ state: saved, version: 0 }));
    await useGameStore.persist.rehydrate();
    const s = useGameStore.getState();
    expect(s.player?.notificationTime).toBe('21:30');
    expect(s.completions).toHaveLength(1);
  });

  it('opens a partly damaged save instead of losing it', async () => {
    const damaged = { ...saved, completions: [...saved.completions, { junk: true }], restDays: 'oops' };
    await AsyncStorage.setItem('eight-paths', JSON.stringify({ state: damaged, version: 1 }));
    await useGameStore.persist.rehydrate();
    const s = useGameStore.getState();
    expect(s.player?.name).toBe('Ada');
    expect(s.completions).toHaveLength(1);
    expect(s.restDays).toEqual([]);
  });
});
