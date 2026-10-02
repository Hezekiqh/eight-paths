import { DIMENSIONS, type Dimension } from '@/game';
import { DEFAULT_PARTY, type CharacterId } from '@/story/companions';

import { WALKER_ROWS, type WalkerId } from './walkers';

/** True if this character has overworld art, so they can walk the World. */
export const isWalker = (id: string): id is WalkerId => Object.prototype.hasOwnProperty.call(WALKER_ROWS, id);

/** A party member who can walk the World: a character with overworld art. */
export type HeroId = CharacterId & WalkerId;

/**
 * Who can walk the World, one per Path: that Path's party member, or its core
 * companion when the member has no overworld art yet. So there's always someone
 * for every Path's jobs (a Warrior to break a wall, a Mage to read the law).
 */
export function walkersFor(party: Record<Dimension, CharacterId>): HeroId[] {
  return DIMENSIONS.map((d) => (isWalker(party[d]) ? party[d] : DEFAULT_PARTY[d]) as HeroId);
}

/**
 * Who walks the World: the one the player picked, as long as they can still
 * walk for their Path (see walkersFor). Until they pick, everyone starts as
 * Brannoc (while he walks for the Warriors); otherwise it's their class companion.
 */
export function worldHero(
  picked: CharacterId | null,
  party: Record<Dimension, CharacterId>,
  classDimension: Dimension,
): HeroId {
  if (picked && walkersFor(party).includes(picked as HeroId)) return picked as HeroId;
  if (!picked && walkersFor(party).includes('brannoc')) return 'brannoc';
  const own = party[classDimension];
  if (isWalker(own)) return own;
  return DEFAULT_PARTY[classDimension] as HeroId;
}
