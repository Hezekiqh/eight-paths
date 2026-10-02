import { useTour } from '@/tutorial/tour';
import { useWorldStore } from '@/world/store';

import { useGameStore } from './index';

/**
 * Starts the whole game over on this phone, as on the first launch: no
 * player, quests, levels or heroes (back to onboarding), a fresh Other World,
 * and the Keeper's tour to come. Keeps the account, Premium and the app's own
 * settings (theme, sound).
 */
export function startOver(): void {
  useGameStore.getState().resetGame();
  useWorldStore.getState().restart();
  useWorldStore.setState({ hero: null });
  useTour.getState().replay();
}
