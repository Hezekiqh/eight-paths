import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { BOARD_BY_ID, DEFAULT_BOARDS } from './rankings';

type RankingsState = {
  /** The niche rankings this player follows on the Social tab, in the order they added them. */
  followed: string[];
  follow: (id: string) => void;
  unfollow: (id: string) => void;
};

/** Which rankings to show, kept on this phone. */
export const useRankings = create<RankingsState>()(
  persist(
    (set) => ({
      followed: DEFAULT_BOARDS,
      follow: (id) => set((s) => (s.followed.includes(id) || !BOARD_BY_ID[id] ? s : { followed: [...s.followed, id] })),
      unfollow: (id) => set((s) => ({ followed: s.followed.filter((f) => f !== id) })),
    }),
    {
      name: 'eight-paths-rankings',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ followed: s.followed }),
      // A ranking that no longer exists is dropped.
      merge: (saved, current) => ({
        ...current,
        followed: ((saved as Partial<RankingsState>)?.followed ?? current.followed).filter((id) => BOARD_BY_ID[id]),
      }),
    },
  ),
);
