import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { EMPTY_STATS, type KeeperStats } from './stats-rules';

/** Kept apart from the game save: the Keeper's track record belongs to this phone. */
export const useKeeperStats = create<KeeperStats>()(
  persist(() => EMPTY_STATS, {
    name: 'eight-paths-keeper-stats',
    storage: createJSONStorage(() => AsyncStorage),
  }),
);

/** Applies a pure update from stats-rules. */
export const updateKeeperStats = (update: (stats: KeeperStats) => KeeperStats) =>
  useKeeperStats.setState((s) => update(s));
