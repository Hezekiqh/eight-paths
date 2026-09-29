import { create } from 'zustand';

/** State that lasts one launch of the app and is never saved. */
type Session = {
  /** The opening intro has finished (or was skipped), so the game can take over the screen. */
  introDone: boolean;
  finishIntro: () => void;
  /** Something is celebrating on screen (the onboarding wrap-up), so the Keeper waits to ask. */
  keeperHold: boolean;
  setKeeperHold: (hold: boolean) => void;
};

export const useSession = create<Session>((set) => ({
  introDone: false,
  finishIntro: () => set({ introDone: true }),
  keeperHold: false,
  setKeeperHold: (keeperHold) => set({ keeperHold }),
}));
