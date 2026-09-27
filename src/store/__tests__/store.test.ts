import { useGameStore, initialData } from '../index';
import {
  selectAllQuestGroups,
  selectCollection,
  selectObjectives,
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
    if (outcome.kind === 'completed') expect(outcome.gain.gained).toBe(10);

    const groups = selectTodayQuestGroups(useGameStore.getState(), today);
    expect(groups.find((g) => g.dimension === 'intellectual')?.quests[0].done).toBe(true);

    expect(useGameStore.getState().toggleQuest(read.id, today).kind).toBe('undone');
    expect(useGameStore.getState().completions).toHaveLength(0);
  });

  it('levels up on the very first task', () => {
    start();
    const move = useGameStore.getState().quests[2];
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
    expect(outcome.kind === 'completed' && outcome.gain.gained).toBe(10);
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

  it('celebrates the first day shown up', () => {
    start();
    const outcome = useGameStore.getState().toggleQuest('tutorial', today);
    expect(outcome.kind === 'completed' && outcome.milestone?.title).toBe('Day one');
    const read = useGameStore.getState().quests[1];
    const second = useGameStore.getState().toggleQuest(read.id, today);
    expect(second.kind === 'completed' && second.milestone).toBeNull();
  });

  it('stops giving XP after the first 10 tasks of the day, on any Path', () => {
    start();
    for (let i = 0; i < 12; i += 1) {
      useGameStore.getState().addQuest({ title: `Q${i}`, dimension: i % 2 ? 'physical' : 'social', repeatDays: [0, 1, 2, 3, 4, 5, 6] });
    }
    const ids = useGameStore.getState().quests.slice(-12).map((q) => q.id);
    const gains = ids.map((id) => {
      const o = useGameStore.getState().toggleQuest(id, today);
      return o.kind === 'completed' ? o.gain.gained : -1;
    });
    expect(gains).toEqual([10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 0, 0]);
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

  it('levels whoever is in the party, and only lets unlocked characters join', () => {
    start();
    const read = useGameStore.getState().quests.find((q) => q.title === 'Read 20 min')!;
    useGameStore.getState().toggleQuest(read.id, today);
    expect(useGameStore.getState().completions.at(-1)?.characterId).toBe('quill');

    // Ottilie needs Mage Path Lv 10; a new player is Lv 5.
    expect(useGameStore.getState().swapCharacter('ottilie')).toBe(false);
    expect(useGameStore.getState().party.intellectual).toBe('quill');

    const early = useGameStore.getState().completions.filter((c) => c.dimension === 'intellectual');
    useGameStore.setState({
      completions: [...early, ...Array.from({ length: 30 }, (_, i) => ({ ...early[0], id: `x${i}`, xp: 13 }))],
    });
    expect(useGameStore.getState().swapCharacter('ottilie')).toBe(true);

    const tomorrow = '2026-09-27';
    useGameStore.getState().toggleQuest(read.id, tomorrow);
    const collection = selectCollection(useGameStore.getState());
    const xpOf = (id: string) => collection.entries.find((e) => e.companion.id === id)!;
    expect(collection.party.intellectual.companion.id).toBe('ottilie');
    expect(xpOf('ottilie').progress).toMatchObject({ level: 6, xpIntoLevel: 0 });
    expect(xpOf('quill').progress.level).toBeGreaterThan(9);
  });

  it('claims a finished objective once, and a boost doubles that Path for the day', () => {
    start();
    const { quests } = useGameStore.getState();
    const read = quests.find((q) => q.title === 'Read 20 min')!;
    const move = quests.find((q) => q.title === 'Move 30 min')!;
    const objectives = () => selectObjectives(useGameStore.getState(), today);

    const path = objectives().daily.find((o) => o.reward.kind === 'boost')!;
    expect(useGameStore.getState().claimObjective(path.id, today)).toBeNull(); // not done yet

    const first = path.dimension === 'physical' ? move : read;
    useGameStore.getState().toggleQuest(first.id, today);
    expect(objectives().unclaimed).toBeGreaterThan(0);
    const reward = useGameStore.getState().claimObjective(path.id, today)!;
    expect(reward.title).toMatch(/2× (Warrior|Mage) XP/);
    expect(useGameStore.getState().claimObjective(path.id, today)).toBeNull(); // already claimed
    expect(objectives().boosted).toEqual([path.dimension]);

    // Undo and redo: the boost now doubles it.
    const normal = useGameStore.getState().completions.at(-1)!.xp;
    useGameStore.getState().toggleQuest(first.id, today);
    useGameStore.getState().toggleQuest(first.id, today);
    expect(useGameStore.getState().completions.at(-1)!.xp).toBe(normal * 2);
  });

  it('gives a grace day, or bonus XP when tokens are full', () => {
    start();
    const move = useGameStore.getState().quests.find((q) => q.title === 'Move 30 min')!;
    const days = ['2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25'];
    for (const d of days) useGameStore.getState().toggleQuest(move.id, d);
    const grace = selectObjectives(useGameStore.getState(), today).weekly[0];
    expect(grace.progress).toBe(5);

    useGameStore.setState((s) => ({ player: { ...s.player!, restTokens: 3 } }));
    const reward = useGameStore.getState().claimObjective(grace.id, today)!;
    expect(reward.title).toMatch(/XP/);
    expect(useGameStore.getState().xpGrants).toHaveLength(1);
    expect(useGameStore.getState().player!.restTokens).toBe(3);
  });

  it('unlocks a character early with enough shards', () => {
    start();
    expect(useGameStore.getState().swapCharacter('dessa')).toBe(false);
    useGameStore.setState({ shards: { dessa: 3 } });
    expect(useGameStore.getState().swapCharacter('dessa')).toBe(true);
    expect(selectCollection(useGameStore.getState()).unlockedCount).toBe(9);
  });

  it('awards goal XP to the Path and takes it back when undone', () => {
    start();
    const { addGoal, toggleGoal } = useGameStore.getState();
    addGoal({ title: '  Run a 5K ', dimension: 'physical' });
    addGoal({ title: 'Call Mum' });
    const [run, call] = useGameStore.getState().goals;
    expect(run.title).toBe('Run a 5K');

    toggleGoal(run.id, today);
    toggleGoal(call.id, today);
    const physical = () => selectDimensionStats(useGameStore.getState(), today).find((d) => d.dimension === 'physical')!;
    expect(physical().xp).toBe(30);
    expect(useGameStore.getState().xpGrants).toHaveLength(1);

    toggleGoal(run.id, today);
    expect(physical().xp).toBe(0);
    expect(useGameStore.getState().goals[0].completedAt).toBeUndefined();
  });

  it('remembers the Vibration setting', () => {
    start();
    expect(useGameStore.getState().player!.hapticsEnabled).toBe(true);
    useGameStore.getState().setHapticsEnabled(false);
    expect(useGameStore.getState().player!.hapticsEnabled).toBe(false);
  });

  it('says when the party member levels up, not just the Path', () => {
    start();
    const read = useGameStore.getState().quests.find((q) => q.title === 'Read 20 min')!;
    // Quill levels on the 1st task (5→6), then needs 2 more (6→7).
    const outcomes = ['2026-09-24', '2026-09-25', '2026-09-26'].map((d) => useGameStore.getState().toggleQuest(read.id, d));
    const levelled = outcomes.map((o) => o.kind === 'completed' && o.characterLeveledUp);
    expect(levelled).toEqual([true, false, true]);
  });

  it('reports overall level-ups and makes every tenth level a milestone', () => {
    start();
    // Overall level 10 takes 10 tasks (2 a level from 5).
    for (let i = 0; i < 10; i += 1) {
      useGameStore.getState().addQuest({ title: `Q${i}`, dimension: 'social', repeatDays: [0, 1, 2, 3, 4, 5, 6] });
    }
    const ids = useGameStore.getState().quests.slice(-10).map((q) => q.id);
    const outcomes = ids.map((id) => useGameStore.getState().toggleQuest(id, today));
    const ups = outcomes.map((o) => (o.kind === 'completed' ? o.overallLevelUp : undefined));
    expect(ups).toEqual([null, 6, null, 7, null, 8, null, 9, null, 10]);
    const last = outcomes[9];
    expect(last.kind === 'completed' && last.milestone?.title).toBe('Level 10');
  });

  it('starts with the core eight revealed and records new reveals once', () => {
    start();
    expect(useGameStore.getState().revealed).toHaveLength(8);
    useGameStore.getState().markRevealed(['dessa', 'dessa', 'brannoc']);
    const revealed = useGameStore.getState().revealed!;
    expect(revealed).toHaveLength(9);
    expect(revealed).toContain('dessa');
  });
});
