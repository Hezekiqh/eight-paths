import { router, usePathname } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { AppState } from 'react-native';

import { showUpStreak } from '@/game';
import { useGameStore } from '@/store';
import { useSession } from '@/store/session';
import { DEFAULT_PARTY } from '@/story/companions';
import { useTour } from '@/tutorial/tour';

import { nextKeeperAsk } from './ask-rules';
import { useAskHistory } from './ask-store';

import { getReminderAccess } from './index';

/** Lets the XP banner and any celebration finish before the Keeper speaks. */
const ASK_DELAY_MS = 2500;

/** Tabs where the Keeper may interrupt; never over the World, a sheet or a cutscene. */
const ASK_SCREENS = new Set(['/', '/character', '/journey', '/social-tab']);

const CORE = new Set<string>(Object.values(DEFAULT_PARTY));

/** Heroes hatched beyond the core eight. */
export function countHatches(revealed: string[] | null): number {
  return (revealed ?? []).filter((id) => !CORE.has(id)).length;
}

/**
 * Opens the Keeper's permission card at the right moment: after the first
 * quest, then once after a new hatch and once at a 7-day streak, while
 * notifications aren't fully on. The rules are in ask-rules.ts.
 */
export function useKeeperAsk(today: string) {
  const pathname = usePathname();
  const introDone = useSession((s) => s.introDone);
  const hold = useSession((s) => s.keeperHold);
  // The Keeper's tour of the app comes first.
  const touring = useTour((s) => !s.ready || !s.done);
  const player = useGameStore((s) => s.player);
  const completions = useGameStore((s) => s.completions);
  const restDays = useGameStore((s) => s.restDays);
  const revealed = useGameStore((s) => s.revealed);
  const dropsWaiting = useGameStore((s) => s.drops.length > 0);
  const asked = useAskHistory((s) => s.asked);
  const lastAskedOn = useAskHistory((s) => s.lastAskedOn);
  const hatchesAtLastAsk = useAskHistory((s) => s.hatchesAtLastAsk);

  const hatches = countHatches(revealed);
  const streak = useMemo(
    () => (player ? showUpStreak(completions, restDays, player.onboardedAt, today).current : 0),
    [player, completions, restDays, today],
  );
  const ready =
    introDone && !hold && !touring && !dropsWaiting && ASK_SCREENS.has(pathname) && (player?.tutorialComplete ?? false);

  useEffect(() => {
    if (!ready) return;
    let live = true;
    const timer = setTimeout(async () => {
      const access = await getReminderAccess();
      const ask = nextKeeperAsk({
        history: { asked, lastAskedOn, hatchesAtLastAsk },
        access,
        today,
        hasCompleted: completions.length > 0,
        hatches,
        streak,
      });
      // Only speak over the app while it's on screen.
      if (!live || !ask || AppState.currentState !== 'active') return;
      useAskHistory.getState().record(ask, today, hatches);
      router.push({ pathname: '/keeper-call', params: { ask } });
    }, ASK_DELAY_MS);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [ready, asked, lastAskedOn, hatchesAtLastAsk, today, completions.length, hatches, streak]);
}
