import { resetGameData } from '@/social/api';
import { useTradeNotices } from '@/social/notices';
import { useTour } from '@/tutorial/tour';
import { useWorldStore } from '@/world/store';

import { useGameStore } from './index';

/**
 * Starts the whole game over, as on the first launch: no player, quests,
 * levels or heroes (back to onboarding), a fresh Other World, and the Keeper's
 * tour to come. If signed in, the heroes and trades on the server are erased
 * first (so they don't come back in the leaderboard or by trade); that has to
 * work, or nothing is erased. Keeps the account, Premium and the app's own
 * settings (theme, sound). Throws a readable message if the server part fails.
 */
export async function startOver(): Promise<void> {
  await resetGameData();
  useTradeNotices.setState({ moments: [] });
  useGameStore.getState().resetGame();
  useWorldStore.getState().restart();
  useWorldStore.setState({ hero: null });
  useTour.getState().replay();
}
