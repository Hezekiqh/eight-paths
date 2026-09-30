import { usePremium } from '@/premium/store';
import { initialData, useGameStore } from '@/store';

import { useWorldStore } from '../store';

const today = '2026-09-30';

beforeEach(() => {
  useGameStore.setState(initialData);
  usePremium.setState({ premium: false });
  useWorldStore.setState({ flags: [] });
  useGameStore.getState().startGame(
    {
      name: 'Ada',
      classDimension: 'intellectual',
      quests: [
        { title: 'Run', dimension: 'physical' },
        { title: 'Lift', dimension: 'physical' },
      ],
    },
    today,
  );
});

const warriorXp = () =>
  useGameStore
    .getState()
    .completions.filter((c) => c.dimension === 'physical')
    .map((c) => c.xp);

describe("the Warrior's Blessing", () => {
  it('doubles the first Warrior habit of the day, and only the first', () => {
    useWorldStore.setState({ flags: ['warrior-blessing'] });
    const [, run, lift] = useGameStore.getState().quests;
    useGameStore.getState().toggleQuest(run.id, today);
    useGameStore.getState().toggleQuest(lift.id, today);
    const [first, second] = warriorXp();
    expect(first).toBe(second * 2);
  });

  it('does nothing without the blessing', () => {
    const [, run, lift] = useGameStore.getState().quests;
    useGameStore.getState().toggleQuest(run.id, today);
    useGameStore.getState().toggleQuest(lift.id, today);
    const [first, second] = warriorXp();
    expect(first).toBe(second);
  });
});
