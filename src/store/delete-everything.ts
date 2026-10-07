import { deleteAccount, forgetAccountHere, signedInHere } from '@/social/api';
import { useRegulator } from '@/regulator/store';
import { useTradeNotices } from '@/social/notices';
import { useTour } from '@/tutorial/tour';
import { useWorldStore } from '@/world/store';

import { useGameStore } from './index';

/** Said when the player backs out of confirming with Apple: the delete didn't happen. */
export const NOT_CONFIRMED = "You didn't confirm with Apple, so your account and your game are untouched.";

/**
 * Delete account, when signed in: the account and everything the server holds
 * (username, founder number, friends, heroes, trades) is deleted and the
 * sign-in forgotten on this phone. The game on this phone stays, so the player
 * lands back on the Friends sign-in screen rather than the first-launch story.
 */
export async function deleteAccountOnly(): Promise<'deleted' | 'canceled'> {
  if ((await deleteAccount()) === 'canceled') return 'canceled';
  await forgetAccountHere();
  useTradeNotices.setState({ moments: [] });
  return 'deleted';
}

/**
 * Delete account: everything goes. If this phone holds a sign-in at all (even
 * one social hasn't finished loading), the account and everything the server
 * holds (username, founder number, friends, heroes, trades) is deleted first;
 * if that fails or is cancelled, nothing is erased. The sign-in is then
 * forgotten on this phone, so the old username can't come back on the next
 * launch, and the server's old trades can't flow back into the new collection. Then the
 * game on this phone is erased too, as on the first launch: no player, quests,
 * levels or heroes (back to the start), a fresh Other World, and the Keeper's
 * tour to come, and the Dopamine Regulator erased. Premium and the app's own
 * settings (theme, sound) stay.
 */
export async function deleteEverything(): Promise<'deleted' | 'canceled'> {
  if ((await signedInHere()) && (await deleteAccount()) === 'canceled') return 'canceled';
  await forgetAccountHere();
  useTradeNotices.setState({ moments: [] });
  useGameStore.getState().resetGame();
  useWorldStore.getState().restart();
  useWorldStore.setState({ hero: null });
  useTour.getState().replay();
  useRegulator.getState().reset();
  return 'deleted';
}
