import { DIMENSIONS, type Dimension } from '@/game';
import type { Owned } from '@/store/draws';
import { DEFAULT_PARTY, type CharacterId } from '@/story/companions';

import { WALKER_ROWS, type WalkerId } from './walkers';

/** True if this character has overworld art, so they can walk the World. */
export const isWalker = (id: string): id is WalkerId => Object.prototype.hasOwnProperty.call(WALKER_ROWS, id);

/** A party member who can walk the World: a character with overworld art. */
export type HeroId = CharacterId & WalkerId;

/** Everyone walks first as Brannoc: he wakes with your first habit. */
export const FIRST_WALKER: HeroId = 'brannoc';

/** Met (in the collection), or an old save that has everyone. */
const met = (id: CharacterId, owned: Owned | null | undefined) => !owned || (owned[id] ?? 0) > 0;

/**
 * Who can walk the World, at most one per Path: that Path's party member, or
 * its core companion when the member has no overworld art yet, as long as
 * you've met them. The core eight are found along the road, each before their
 * Path's first job (a Warrior to break a wall, a Mage to read the law).
 * `owned` left out: everyone (old saves).
 */
export function walkersFor(party: Record<Dimension, CharacterId>, owned?: Owned | null): HeroId[] {
  return DIMENSIONS.map((d) => (isWalker(party[d]) && met(party[d], owned) ? party[d] : DEFAULT_PARTY[d]) as HeroId).filter(
    (id) => met(id, owned),
  );
}

/**
 * Who walks the World: the one the player picked, as long as they can still
 * walk (see walkersFor). Until they pick, the wizard; otherwise their class companion if met, else Brannoc.
 */
export function worldHero(
  picked: CharacterId | null,
  party: Record<Dimension, CharacterId>,
  classDimension: Dimension,
  owned?: Owned | null,
): HeroId {
  const walkers = walkersFor(party, owned);
  if (picked && walkers.includes(picked as HeroId)) return picked as HeroId;
  // Until they pick someone, everyone starts the Other World as the wizard (Brannoc stays
  // a character of his own: his lines, and his road to the throne).
  if (!picked && walkers.includes('quill')) return 'quill';
  const own = walkers.find((h) => h === party[classDimension] || h === DEFAULT_PARTY[classDimension]);
  return own ?? FIRST_WALKER;
}
