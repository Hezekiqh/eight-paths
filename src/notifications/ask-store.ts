import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { EMPTY_ASK_HISTORY, recordAsk, type AskHistory, type KeeperAsk } from './ask-rules';

type AskState = AskHistory & {
  record: (ask: KeeperAsk, today: string, hatches: number) => void;
};

/** Kept apart from the game save: permission belongs to this phone, not to a backup. */
export const useAskHistory = create<AskState>()(
  persist(
    (set) => ({
      ...EMPTY_ASK_HISTORY,
      record: (ask, today, hatches) => set((s) => recordAsk(s, ask, today, hatches)),
    }),
    {
      name: 'eight-paths-keeper-asks',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ asked, lastAskedOn, hatchesAtLastAsk }) => ({ asked, lastAskedOn, hatchesAtLastAsk }),
    },
  ),
);
