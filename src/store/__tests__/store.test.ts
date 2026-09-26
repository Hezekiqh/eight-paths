import { useGameStore, initialData } from '../index';
import { selectDimensionStats, selectOverallProgress, selectTodayQuestGroups } from '../selectors';

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
    expect(groups.find((g) => g.dimension === 'intellectual')?.quests[0].doneToday).toBe(true);

    expect(useGameStore.getState().toggleQuest(read.id, today).kind).toBe('undone');
    expect(useGameStore.getState().completions).toHaveLength(0);
  });

  it('reports a level-up', () => {
    start();
    const move = useGameStore.getState().quests[2];
    for (let day = 1; day <= 9; day += 1) {
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

  it('settles missed days with a rest token', () => {
    start();
    useGameStore.getState().settle('2026-09-28');
    const s = useGameStore.getState();
    expect(s.player?.restTokens).toBe(0);
    expect(s.restDays).toEqual([{ date: today, dimension: 'all' }]);
    expect(s.lastSettledDate).toBe('2026-09-27');
  });
});
