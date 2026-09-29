import type { Dimension } from '@/game';
import { DEFAULT_PARTY, type CharacterId } from '@/story/companions';

import { WALKER_ROWS, type WalkerId } from './walkers';

/** True if this character has overworld art, so they can walk the World. */
export const isWalker = (id: string): id is WalkerId => Object.prototype.hasOwnProperty.call(WALKER_ROWS, id);

/** A party member who can walk the World: a character with overworld art. */
export type HeroId = CharacterId & WalkerId;

/**
 * Who walks the World: the one party member the player picked, as long as
 * they're still in the party and have overworld art. Otherwise it's the
 * player's class companion.
 */
export function worldHero(
  picked: CharacterId | null,
  party: Record<Dimension, CharacterId>,
  classDimension: Dimension,
): HeroId {
  if (picked && isWalker(picked) && Object.values(party).includes(picked)) return picked;
  const own = party[classDimension];
  if (isWalker(own)) return own;
  return DEFAULT_PARTY[classDimension] as HeroId;
}
