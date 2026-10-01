import { create } from 'zustand';

/** State that lasts one launch of the app and is never saved. */
type Session = {
  /** The opening intro has finished (or was skipped), so the game can take over the screen. */
  introDone: boolean;
  finishIntro: () => void;
  /** Something is celebrating on screen (the onboarding wrap-up), so the Keeper waits to ask. */
  keeperHold: boolean;
  setKeeperHold: (hold: boolean) => void;
  /** A quest the player marked done from a notification, waiting for the Today screen to complete it. */
  pendingQuest: string | null;
  /** Notification responses already acted on this launch, so a "Done" never runs twice. */
  handledResponses: string[];
  /** The sideways game is on screen (not the World menu), so the tab bar steps aside. */
  worldPlaying: boolean;
  /** Dev only: the fight bot plays the World's fights (autopilot.ts), for recording footage. */
  autopilot: boolean;
};

export const useSession = create<Session>((set) => ({
  introDone: false,
  finishIntro: () => set({ introDone: true }),
  keeperHold: false,
  setKeeperHold: (keeperHold) => set({ keeperHold }),
  pendingQuest: null,
  handledResponses: [],
  worldPlaying: false,
  // Dev only; EXPO_PUBLIC_AUTOPILOT=1 starts it on, for recording.
  autopilot: __DEV__ && process.env.EXPO_PUBLIC_AUTOPILOT === '1',
}));
