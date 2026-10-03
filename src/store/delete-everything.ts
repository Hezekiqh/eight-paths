import { deleteAccount } from '@/social/api';
import { useTradeNotices } from '@/social/notices';
import { useSocial } from '@/social/store';
import { useTour } from '@/tutorial/tour';
import { useWorldStore } from '@/world/store';

import { useGameStore } from './index';

/**
 * Delete account: everything goes. If signed in, the account and everything
 * the server holds (username, founder number, friends, heroes, trades) is
 * deleted first; if that fails or is cancelled, nothing is erased. Then the
 * game on this phone is erased too, as on the first launch: no player, quests,
 * levels or heroes (back to the start), a fresh Other World, and the Keeper's
 * tour to come. Premium and the app's own settings (theme, sound) stay.
 */
export async function deleteEverything(): Promise<'deleted' | 'canceled'> {
  if (useSocial.getState().status === 'ready' && (await deleteAccount()) === 'canceled') return 'canceled';
  useTradeNotices.setState({ moments: [] });
  useGameStore.getState().resetGame();
  useWorldStore.getState().restart();
  useWorldStore.setState({ hero: null });
  useTour.getState().replay();
  return 'deleted';
}
