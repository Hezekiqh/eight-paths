import { create } from 'zustand';

/** State that lasts one launch of the app and is never saved. */
type Session = {
  /** The opening intro has finished (or was skipped), so the game can take over the screen. */
  introDone: boolean;
  finishIntro: () => void;
  /** Settings asked to watch the intro again. */
  introReplay: boolean;
  replayIntro: () => void;
  /** Something is celebrating on screen (the onboarding wrap-up), so the Keeper waits to ask. */
  keeperHold: boolean;
  setKeeperHold: (hold: boolean) => void;
  /** A quest the player marked done from a notification, waiting for the Today screen to complete it. */
  pendingQuest: string | null;
  /** Notification responses already acted on this launch, so a "Done" never runs twice. */
  handledResponses: string[];
  /** The sideways game is on screen (not the World menu), so the tab bar steps aside. */
  worldPlaying: boolean;
  /** Just chosen on the Keeper's question: the World's first room says who you are now, once. */
  heroIntro: string | null;
  /** Someone just hatched from a cocoon in the World: once the hatch closes, they talk to you (an NPC id). */
  talkAfterHatch: string | null;
  /** Just fell through a trap pit in the Maze Ward (dungeon.ts): which fall it was, for the prisoners' comment. */
  fell: number | null;
  /** Dev only: the fight bot plays the World's fights (autopilot.ts), for recording footage. */
  autopilot: boolean;
  /**
   * A fight carried across a change of character (author, Oct 4, 2026): switching mid-fight doesn't
   * restart it. The room, your hearts (shared by the whole party), and each enemy as it stood, with
   * how much of it is left (`left`, 0 to 1), since the new character takes a different number of hits.
   */
  carry: { map: string; hp: number; enemies: number[][]; left: number[]; mended: boolean; rained: boolean } | null;
  /** Test builds only (world/test-tools.ts): every Path at Lv 20, and the hero walking to the guide's mark. */
  testLevels: boolean;
  testWalk: boolean;
};

export const useSession = create<Session>((set) => ({
  introDone: false,
  finishIntro: () => set({ introDone: true, introReplay: false }),
  introReplay: false,
  replayIntro: () => set({ introDone: false, introReplay: true }),
  keeperHold: false,
  setKeeperHold: (keeperHold) => set({ keeperHold }),
  pendingQuest: null,
  handledResponses: [],
  worldPlaying: false,
  heroIntro: null,
  talkAfterHatch: null,
  fell: null,
  // Dev only; EXPO_PUBLIC_AUTOPILOT=1 starts it on, for recording.
  autopilot: __DEV__ && process.env.EXPO_PUBLIC_AUTOPILOT === '1',
  carry: null,
  // on from the start in a test build, so a fresh test account can walk straight in (test-tools.ts)
  testLevels: process.env.EXPO_PUBLIC_TEST_TOOLS === '1',
  testWalk: false,
}));
