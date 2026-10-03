import { resetGameData } from '@/social/api';
import { useTour } from '@/tutorial/tour';
import { useWorldStore } from '@/world/store';

import { initialData, useGameStore } from '../index';
import { startOver } from '../start-over';

jest.mock('@/social/api', () => ({ resetGameData: jest.fn(async () => {}) }));

describe('starting over', () => {
  beforeEach(() => {
    useGameStore.setState(initialData);
    useGameStore.getState().startGame({ name: 'Ada', classDimension: 'physical', quests: [] }, '2026-10-02');
    useGameStore.getState().toggleQuest('tutorial', '2026-10-02');
    useGameStore.getState().reconcileDraws();
    useWorldStore.setState({
      controls: 'touchpad',
      hero: 'brannoc',
      flags: ['met:moss', 'kaldor-beaten'],
      discovered: ['archive', 'millbrook'],
      position: { map: 'millbrook', x: 30, y: 40, facing: 'up' },
    });
    useTour.setState({ done: true });
  });

  it('erases the habit save, so the app goes back to onboarding', async () => {
    await startOver();
    const s = useGameStore.getState();
    expect(s.player).toBeNull();
    expect(s.quests).toEqual([]);
    expect(s.completions).toEqual([]);
    expect(s.owned).toBeNull();
  });

  it('starts the Other World afresh, walking as nobody in particular yet', async () => {
    await startOver();
    const w = useWorldStore.getState();
    expect(w.flags).toEqual([]);
    expect(w.discovered).toEqual([]);
    expect(w.position).toBeNull();
    expect(w.hero).toBeNull();
    expect(w.controls).toBe('touchpad');
  });

  it('lets the Keeper show you round again', async () => {
    await startOver();
    expect(useTour.getState().done).toBe(false);
  });

  it('starts a new game owning none of the core eight', async () => {
    await startOver();
    useGameStore.getState().startGame({ name: 'Bo', classDimension: 'social', quests: [] }, '2026-10-02');
    expect(useGameStore.getState().owned).toEqual({});
  });

  it('erases the heroes on the server too, before anything on the phone', async () => {
    await startOver();
    expect(resetGameData).toHaveBeenCalled();
  });

  it("erases nothing if the server can't be reached", async () => {
    (resetGameData as jest.Mock).mockRejectedValueOnce(new Error('offline'));
    await expect(startOver()).rejects.toThrow('offline');
    expect(useGameStore.getState().player).not.toBeNull();
  });
});
