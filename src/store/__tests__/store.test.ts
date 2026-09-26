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
    expect(s.quests.every((q) => q.repeatDays.length === 7)).toBe(true);
    for (const stat of selectDimensionStats(s, today)) expect(stat.progress.level).toBe(5);
    expect(selectOverallProgress(s).level).toBe(5);
  });

  it('completes and undoes a quest, reporting the XP gain', () => {
    start();
    const read = useGameStore.getState().quests[0];
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
    const move = useGameStore.getState().quests[1];
    for (let day = 1; day <= 9; day += 1) {
      useGameStore.getState().toggleQuest(move.id, `2026-09-${String(day).padStart(2, '0')}`);
    }
    const outcome = useGameStore.getState().toggleQuest(move.id, today);
    expect(outcome.kind === 'completed' && outcome.gain.leveledUp).toBe(true);
    if (outcome.kind === 'completed') expect(outcome.gain.after.level).toBe(6);
  });

  it('archives quests out of today', () => {
    start();
    const read = useGameStore.getState().quests[0];
    useGameStore.getState().archiveQuest(read.id);
    const groups = selectTodayQuestGroups(useGameStore.getState(), today);
    expect(groups.map((g) => g.dimension)).toEqual(['physical']);
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
