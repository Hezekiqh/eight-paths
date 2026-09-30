import type { Dimension } from '@/game';

import { useWorldStore } from './store';

/**
 * Blessings won in the World that change real XP. Letting Kaldor keep his
 * throne gives the Warrior's Blessing: your first Warrior habit each day
 * earns double XP.
 */
const BLESSINGS: Partial<Record<Dimension, string>> = { physical: 'warrior-blessing' };

/** True if this Path's first habit of the day earns double XP. */
export function blessedPath(dimension: Dimension): boolean {
  const flag = BLESSINGS[dimension];
  return !!flag && useWorldStore.getState().flags.includes(flag);
}
