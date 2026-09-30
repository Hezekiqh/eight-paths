import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Tier } from '@/game';

/** How long a free player can explore the Other World each day. Premium has no limit. */
export const FREE_WORLD_MS = 15 * 60 * 1000;

/** Time spent in the game (not the menu) on one day. */
export type Playtime = { date: string; ms: number };

/** Adds `ms` of play on `today`, starting over on a new day. */
export function addPlay(played: Playtime, today: string, ms: number): Playtime {
  const base = played.date === today ? played.ms : 0;
  return { date: today, ms: base + Math.max(0, ms) };
}

/** Milliseconds of play left today: Infinity with Premium. */
export function playLeft(played: Playtime, today: string, tier: Tier): number {
  if (tier === 'premium') return Infinity;
  return Math.max(0, FREE_WORLD_MS - (played.date === today ? played.ms : 0));
}

type PlaytimeState = { played: Playtime };

/** Kept apart from both saves: a daily allowance, not progress. */
export const usePlaytime = create<PlaytimeState>()(
  persist((): PlaytimeState => ({ played: { date: '', ms: 0 } }), {
    name: 'eight-paths-playtime',
    storage: createJSONStorage(() => AsyncStorage),
  }),
);
