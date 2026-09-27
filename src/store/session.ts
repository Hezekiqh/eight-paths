import { create } from 'zustand';

/** State that lasts one launch of the app and is never saved. */
type Session = {
  /** The opening intro has finished (or was skipped), so the game can take over the screen. */
  introDone: boolean;
  finishIntro: () => void;
};

export const useSession = create<Session>((set) => ({
  introDone: false,
  finishIntro: () => set({ introDone: true }),
}));
