import { DIMENSIONS, toDateKey } from '@/game';
import { usePremium } from '@/premium/store';

import { useGameStore, initialData } from '../index';
import {
  selectAllQuestGroups,
  selectCollection,
  selectObjectives,
  selectDimensionStats,
  selectOverallProgress,
  selectTodayQuests,
} from '../selectors';

const today = '2026-09-26';

beforeEach(() => {
  useGameStore.setState(initialData);
  usePremium.setState({ premium: false });
});

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

    expect(selectTodayQuests(useGameStore.getState(), today).find((v) => v.quest.id === read.id)?.done).toBe(true);

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
    expect(selectTodayQuests(useGameStore.getState(), today).map((v) => v.quest.dimension)).toEqual(['physical']);
  });

  it('orders today by the order the player usually does their quests, then oldest first', () => {
    start();
    const titles = () => selectTodayQuests(useGameStore.getState(), today).map((v) => v.quest.title);
    expect(titles()).toEqual(['Read 20 min', 'Move 30 min']);
    const [, read, move] = useGameStore.getState().quests;
    const yesterday = '2026-09-25';
    useGameStore.setState({
      completions: [
        { id: 'a', questId: move.id, dimension: 'physical', date: yesterday, xp: 10, at: 7 * 60 },
        { id: 'b', questId: read.id, dimension: 'intellectual', date: yesterday, xp: 10, at: 20 * 60 },
      ],
    });
    expect(titles()).toEqual(['Move 30 min', 'Read 20 min']);
  });

  it("keeps the player's own order, with new quests at the bottom", () => {
    start();
    const [, read, move] = useGameStore.getState().quests;
    useGameStore.getState().setQuestOrder([move.id, read.id]);
    useGameStore
      .getState()
      .addQuest({ title: 'Call a friend', dimension: 'social', repeatDays: [0, 1, 2, 3, 4, 5, 6] });
    const titles = () => selectTodayQuests(useGameStore.getState(), today).map((v) => v.quest.title);
    expect(titles()).toEqual(['Move 30 min', 'Read 20 min', 'Call a friend']);
    useGameStore.getState().setQuestOrder(null);
    expect(titles()[0]).toBe('Read 20 min');
    expect(useGameStore.getState().questSort.by).toBe('auto');
  });

  it('can put unfinished quests on top, or order by when they were finished today', () => {
    start();
    const [, read] = useGameStore.getState().quests;
    useGameStore.getState().addQuest({ title: 'Call a friend', dimension: 'social', repeatDays: [0, 1, 2, 3, 4, 5, 6] });
    const call = useGameStore.getState().quests.at(-1)!;
    const titles = () => selectTodayQuests(useGameStore.getState(), today).map((v) => v.quest.title);
    expect(titles()).toEqual(['Read 20 min', 'Move 30 min', 'Call a friend']);
    useGameStore.setState({
      completions: [
        { id: 'a', questId: call.id, dimension: 'social', date: today, xp: 10, at: 9 * 60 },
        { id: 'b', questId: read.id, dimension: 'intellectual', date: today, xp: 10, at: 8 * 60 },
      ],
    });
    // Unfinished on top: Move rises above the two already done, which keep their order.
    useGameStore.getState().setQuestSort({ unfinishedFirst: true });
    expect(titles()).toEqual(['Move 30 min', 'Read 20 min', 'Call a friend']);
    // As finished today: Read (8:00), then Call (9:00), then the rest.
    useGameStore.getState().setQuestSort({ by: 'done', unfinishedFirst: false });
    expect(titles()).toEqual(['Read 20 min', 'Call a friend', 'Move 30 min']);
    // Both: what's left first, then what's done in the order it was done.
    useGameStore.getState().setQuestSort({ unfinishedFirst: true });
    expect(titles()).toEqual(['Move 30 min', 'Read 20 min', 'Call a friend']);
  });

  it('completes the tutorial for class XP, then retires it', () => {
    start();
    const outcome = useGameStore.getState().toggleQuest('tutorial', today);
    expect(outcome.kind === 'completed' && outcome.gain.gained).toBe(10);
    useGameStore.getState().completeTutorial();
    const s = useGameStore.getState();
    expect(s.player?.tutorialComplete).toBe(true);
    expect(s.quests.find((q) => q.id === 'tutorial')?.active).toBe(false);
    expect(selectTodayQuests(s, today).map((v) => v.quest.id)).not.toContain('tutorial');
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

  it('caps XP at 30 a Path a day, or 60 with Premium', () => {
    const gainsFor = (count: number) => {
      start();
      for (let i = 0; i < count; i += 1) {
        useGameStore.getState().addQuest({ title: `Q${i}`, dimension: 'physical', repeatDays: [0, 1, 2, 3, 4, 5, 6] });
      }
      return useGameStore
        .getState()
        .quests.slice(-count)
        .map((q) => {
          const o = useGameStore.getState().toggleQuest(q.id, today);
          return o.kind === 'completed' ? o.gain.gained : -1;
        });
    };
    expect(gainsFor(4)).toEqual([10, 10, 10, 0]);
    // Another Path still has its own 30 to earn.
    const other = useGameStore.getState().quests.find((q) => q.dimension !== 'physical')!;
    const o = useGameStore.getState().toggleQuest(other.id, today);
    expect(o.kind === 'completed' && o.gain.gained).toBe(10);

    usePremium.setState({ premium: true });
    expect(gainsFor(4)).toEqual([20, 20, 20, 0]);
  });

  it('only lets Premium redo a waiting drop', () => {
    start();
    useGameStore.setState({ drops: ['pip'], owned: { ...useGameStore.getState().owned, pip: 1 } });
    expect(useGameStore.getState().redoDrop('pip')).toBeNull();
    usePremium.setState({ premium: true });
    const pick = useGameStore.getState().redoDrop('pip')!;
    expect(useGameStore.getState().drops).toEqual([pick]);
    expect(useGameStore.getState().redoDrop(pick)).toBeNull();
    useGameStore.getState().finishDrop(pick);
    expect(useGameStore.getState().redrawn).toEqual([]);
  });

  it('skips a quest out of today for good, without breaking anything', () => {
    start();
    const [tutorial, read, move] = useGameStore.getState().quests;
    useGameStore.getState().toggleQuest(move.id, today);
    expect(useGameStore.getState().skipQuest(move.id, today)).toBe(false);
    expect(useGameStore.getState().skipQuest(tutorial.id, today)).toBe(false);
    expect(useGameStore.getState().skipQuest(read.id, today)).toBe(true);
    expect(useGameStore.getState().skipQuest(read.id, today)).toBe(false);
    expect(selectTodayQuests(useGameStore.getState(), today).map((v) => v.quest.title)).toEqual(['Move 30 min']);
    expect(selectTodayQuests(useGameStore.getState(), '2026-09-27').map((v) => v.quest.title)).toContain('Read 20 min');
    const intellectual = selectDimensionStats(useGameStore.getState(), today).find(
      (d) => d.dimension === 'intellectual',
    );
    expect(intellectual?.consistency.due).toBe(0);
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
    const read = useGameStore.getState().quests.find((q) => q.title === 'Read 20 min')!;
    useGameStore.getState().toggleQuest(read.id, today);
    // The 26th started a streak; the 27th, with nothing done, would break it.
    useGameStore.getState().settle('2026-09-28');
    const s = useGameStore.getState();
    expect(s.player?.restTokens).toBe(0);
    expect(s.restDays).toEqual([{ date: '2026-09-27', dimension: 'all' }]);
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
    useGameStore.getState().chooseOrigin('brannoc');
    const read = useGameStore.getState().quests.find((q) => q.title === 'Read 20 min')!;
    useGameStore.getState().toggleQuest(read.id, today);
    expect(useGameStore.getState().completions.at(-1)?.characterId).toBe('quill');

    // Nobody new has arrived on the Mage Path yet.
    useGameStore.getState().reconcileDraws();
    expect(useGameStore.getState().swapCharacter('ottilie')).toBe(false);
    expect(useGameStore.getState().party.intellectual).toBe('quill');

    const early = useGameStore.getState().completions.filter((c) => c.dimension === 'intellectual');
    useGameStore.setState({
      completions: [...early, ...Array.from({ length: 30 }, (_, i) => ({ ...early[0], id: `x${i}`, xp: 13 }))],
    });
    // Levelling the Mage Path brings random arrivals from it; pretend Ottilie was one.
    useGameStore.getState().reconcileDraws();
    // Brannoc woke with the first habit; everyone else came from the Mage Path.
    const arrivals = useGameStore.getState().drops.filter((id) => id !== 'brannoc');
    expect(useGameStore.getState().drops).toContain('brannoc');
    expect(arrivals.length).toBeGreaterThan(0);
    expect(
      arrivals.every((id) =>
        ['intellectual'].includes(
          selectCollection(useGameStore.getState()).entries.find((e) => e.companion.id === id)!.companion.dimension,
        ),
      ),
    ).toBe(true);
    useGameStore.setState((s) => ({ owned: { ...s.owned, ottilie: 1 } }));
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

  it('never grants a character just by showing one (the dev test buttons are visual only)', () => {
    start();
    const before = { owned: useGameStore.getState().owned, drops: useGameStore.getState().drops };
    // A hatch closing for someone who never arrived (as a preview or a stray link would).
    useGameStore.getState().finishDrop('aurelio');
    expect(useGameStore.getState().owned).toEqual(before.owned);
    expect(useGameStore.getState().owned?.aurelio).toBeUndefined();
    expect(useGameStore.getState().swapCharacter('aurelio')).toBe(false);
  });

  it('unlocks a character early with enough shards', () => {
    start();
    expect(useGameStore.getState().swapCharacter('dessa')).toBe(false);
    useGameStore.setState({ shards: { dessa: 3 } });
    useGameStore.getState().reconcileDraws();
    expect(useGameStore.getState().swapCharacter('dessa')).toBe(true);
    // Nobody else yet: no habit has woken Brannoc, and the rest of the core eight are still to be met.
    expect(selectCollection(useGameStore.getState()).unlockedCount).toBe(1);
    expect(useGameStore.getState().drops).toContain('dessa');
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
    const physical = () =>
      selectDimensionStats(useGameStore.getState(), today).find((d) => d.dimension === 'physical')!;
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
    const outcomes = ['2026-09-24', '2026-09-25', '2026-09-26'].map((d) =>
      useGameStore.getState().toggleQuest(read.id, d),
    );
    const levelled = outcomes.map((o) => o.kind === 'completed' && o.characterLeveledUp);
    expect(levelled).toEqual([true, false, true]);
  });

  it('reports overall level-ups and makes every tenth level a milestone', () => {
    start();
    // Overall level 10 takes 10 tasks (2 a level from 5), spread out to stay under each Path's daily cap.
    for (let i = 0; i < 10; i += 1) {
      useGameStore
        .getState()
        .addQuest({ title: `Q${i}`, dimension: DIMENSIONS[i % 8], repeatDays: [0, 1, 2, 3, 4, 5, 6] });
    }
    const ids = useGameStore
      .getState()
      .quests.slice(-10)
      .map((q) => q.id);
    const outcomes = ids.map((id) => useGameStore.getState().toggleQuest(id, today));
    const ups = outcomes.map((o) => (o.kind === 'completed' ? o.overallLevelUp : undefined));
    expect(ups).toEqual([null, 6, null, 7, null, 8, null, 9, null, 10]);
    const last = outcomes[9];
    expect(last.kind === 'completed' && last.milestone?.title).toBe('Level 10');
  });

  it('starts with nobody met, wakes the class hero with the first habit, then the chosen hero, and meets the rest', () => {
    start();
    expect(selectCollection(useGameStore.getState()).unlockedCount).toBe(0);
    // The first habit wakes the class's hero, Quill for a Mage, with their hatch.
    useGameStore.getState().toggleQuest('tutorial', today);
    useGameStore.getState().reconcileDraws();
    expect(useGameStore.getState().owned).toEqual({ quill: 1 });
    expect(useGameStore.getState().drops).toEqual(['quill']);

    // Entering the Other World, the hero chosen to be wakes too, and takes their Path's slot.
    useGameStore.getState().chooseOrigin('wren');
    expect(useGameStore.getState().owned).toEqual({ quill: 1, wren: 1 });
    expect(useGameStore.getState().drops).toEqual(['quill', 'wren']);
    expect(useGameStore.getState().party.spiritual).toBe('wren');

    // Asked once: a second answer changes nothing.
    useGameStore.getState().chooseOrigin('brannoc');
    expect(useGameStore.getState().player?.origin).toBe('wren');

    // Found in the Other World: they join at once, with no hatch.
    useGameStore.getState().meetCharacters(['brannoc']);
    expect(useGameStore.getState().owned?.brannoc).toBe(1);
    expect(useGameStore.getState().drops).toEqual(['quill', 'wren']);
  });

  it('only lets one of the four starters be chosen', () => {
    start();
    useGameStore.getState().chooseOrigin('moss');
    expect(useGameStore.getState().player?.origin).toBeUndefined();
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

describe('usual-time reminders', () => {
  it('starts new players on "at my usual time", and picking a time turns it off', () => {
    start();
    expect(useGameStore.getState().player?.smartReminders).toBe(true);
    useGameStore.getState().setNotificationTime('07:30');
    expect(useGameStore.getState().player).toMatchObject({ notificationTime: '07:30', smartReminders: false });
    useGameStore.getState().setSmartReminders(true);
    expect(useGameStore.getState().player?.smartReminders).toBe(true);
  });

  it('times a completion made today, and not one made for another day', () => {
    start();
    const [first, second] = useGameStore.getState().quests.filter((q) => q.id !== 'tutorial');
    const now = new Date();
    const todayKey = toDateKey(now);
    useGameStore.getState().toggleQuest(first.id, todayKey);
    useGameStore.getState().toggleQuest(second.id, today);
    const [timed, untimed] = useGameStore.getState().completions;
    expect(timed.at).toBeGreaterThanOrEqual(0);
    expect(timed.at).toBeLessThan(24 * 60);
    expect(untimed.at).toBeUndefined();
  });
});
