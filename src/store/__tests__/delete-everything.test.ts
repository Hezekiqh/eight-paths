import { deleteAccount, forgetAccountHere } from '@/social/api';
import { useSocial } from '@/social/store';
import { useTour } from '@/tutorial/tour';
import { useWorldStore } from '@/world/store';

import { initialData, useGameStore } from '../index';
import { deleteEverything } from '../delete-everything';

// A saved sign-in on this phone, unless a test says otherwise.
let mockSignedIn = false;
jest.mock('@/social/api', () => ({
  deleteAccount: jest.fn(async () => 'deleted'),
  signedInHere: jest.fn(async () => mockSignedIn),
  forgetAccountHere: jest.fn(async () => {}),
}));

describe('deleting the account', () => {
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
    await deleteEverything();
    const s = useGameStore.getState();
    expect(s.player).toBeNull();
    expect(s.quests).toEqual([]);
    expect(s.completions).toEqual([]);
    expect(s.owned).toBeNull();
  });

  it('starts the Other World afresh, walking as nobody in particular yet', async () => {
    await deleteEverything();
    const w = useWorldStore.getState();
    expect(w.flags).toEqual([]);
    expect(w.discovered).toEqual([]);
    expect(w.position).toBeNull();
    expect(w.hero).toBeNull();
    expect(w.controls).toBe('touchpad');
  });

  it('lets the Keeper show you round again', async () => {
    await deleteEverything();
    expect(useTour.getState().done).toBe(false);
  });

  it('starts a new game owning none of the core eight', async () => {
    await deleteEverything();
    useGameStore.getState().startGame({ name: 'Bo', classDimension: 'social', quests: [] }, '2026-10-02');
    expect(useGameStore.getState().owned).toEqual({});
  });

  it('deletes the account on the server first, when signed in, then forgets the sign-in here', async () => {
    mockSignedIn = true;
    await deleteEverything();
    expect(deleteAccount).toHaveBeenCalled();
    expect(forgetAccountHere).toHaveBeenCalled();
    mockSignedIn = false;
  });

  it("deletes the account even when social hadn't finished loading (the old username never comes back)", async () => {
    (deleteAccount as jest.Mock).mockClear();
    mockSignedIn = true;
    useSocial.setState({ status: 'signedOut' });
    await deleteEverything();
    expect(deleteAccount).toHaveBeenCalled();
    mockSignedIn = false;
    useSocial.setState({ status: 'off' });
  });

  it("erases nothing if the account can't be deleted, or the player backs out", async () => {
    mockSignedIn = true;
    (deleteAccount as jest.Mock).mockRejectedValueOnce(new Error('offline'));
    await expect(deleteEverything()).rejects.toThrow('offline');
    (deleteAccount as jest.Mock).mockResolvedValueOnce('canceled');
    expect(await deleteEverything()).toBe('canceled');
    expect(useGameStore.getState().player).not.toBeNull();
    mockSignedIn = false;
  });
});
