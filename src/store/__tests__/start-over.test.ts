import { useTour } from '@/tutorial/tour';
import { useWorldStore } from '@/world/store';

import { initialData, useGameStore } from '../index';
import { startOver } from '../start-over';

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

  it('erases the habit save, so the app goes back to onboarding', () => {
    startOver();
    const s = useGameStore.getState();
    expect(s.player).toBeNull();
    expect(s.quests).toEqual([]);
    expect(s.completions).toEqual([]);
    expect(s.owned).toBeNull();
  });

  it('starts the Other World afresh, walking as nobody in particular yet', () => {
    startOver();
    const w = useWorldStore.getState();
    expect(w.flags).toEqual([]);
    expect(w.discovered).toEqual([]);
    expect(w.position).toBeNull();
    expect(w.hero).toBeNull();
    expect(w.controls).toBe('touchpad');
  });

  it('lets the Keeper show you round again', () => {
    startOver();
    expect(useTour.getState().done).toBe(false);
  });

  it('starts a new game owning none of the core eight', () => {
    startOver();
    useGameStore.getState().startGame({ name: 'Bo', classDimension: 'social', quests: [] }, '2026-10-02');
    expect(useGameStore.getState().owned).toEqual({});
  });
});
