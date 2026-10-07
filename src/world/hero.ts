import { DIMENSIONS, type Dimension } from '@/game';
import type { Owned } from '@/store/draws';
import { DEFAULT_PARTY, type CharacterId } from '@/story/companions';

import { brannocAway } from './castle';
import { WALKER_ROWS, type WalkerId } from './walkers';

/** True if this character has overworld art, so they can walk the World. */
export const isWalker = (id: string): id is WalkerId => Object.prototype.hasOwnProperty.call(WALKER_ROWS, id);

/** A party member who can walk the World: a character with overworld art. */
export type HeroId = CharacterId & WalkerId;

/** Met (in the collection), or an old save that has everyone. */
const met = (id: CharacterId, owned: Owned | null | undefined) => !owned || (owned[id] ?? 0) > 0;

const CORE = new Set<string>(Object.values(DEFAULT_PARTY));
/**
 * In this run of the story (author, Oct 3, 2026): the collection is your real habits' and never
 * changes with the story, but the core eight only walk with you in the World once you've met them
 * there (`met:<id>`), so restarting the Other World means meeting them again. `world` left out: the
 * collection alone (outside the World). King Brannoc, staying to rule, is away until he catches you
 * up (castle.ts).
 */
const inStory = (id: CharacterId, world?: string[]) =>
  !world || !CORE.has(id) || (world.includes(`met:${id}`) && !(id === 'brannoc' && brannocAway(world)));

/**
 * The party members you actually have: met on the road, hatched, or (old
 * saves) everyone. A new save's party lists all eight core companions from the
 * start, but only these are with you, so only these chime in or show up in scenes.
 */
/**
 * Who talks among themselves around you (banter, walking banter): the party with you, but never the one
 * you're walking as. Your character is silent, like Frisk or a Pokémon trainer (author, Oct 7, 2026): they
 * only think or speak where the author has written it in for them.
 */
export function chattersWithYou(
  party: Record<Dimension, CharacterId>,
  owned: Owned | null | undefined,
  world: string[] | undefined,
  walking: string,
): CharacterId[] {
  return partyWithYou(party, owned, world).filter((id) => id !== walking);
}

export function partyWithYou(
  party: Record<Dimension, CharacterId>,
  owned?: Owned | null,
  world?: string[],
): CharacterId[] {
  return Object.values(party).filter((id) => met(id, owned) && inStory(id, world));
}

/**
 * Who can walk the World, at most one per Path: that Path's party member, or
 * its core companion when the member has no overworld art yet, as long as
 * you've met them. The core eight are found along the road, each before their
 * Path's first job (a Warrior to break a wall, a Mage to read the law).
 * `owned` left out: everyone (old saves). `flags`: the World's story flags, so
 * anyone who went home when the party split (`left:<id>`, scenes.ts) can't walk.
 */
export function walkersFor(
  party: Record<Dimension, CharacterId>,
  owned?: Owned | null,
  flags: string[] = [],
  world?: string[],
): HeroId[] {
  const here = (id: CharacterId) => met(id, owned) && inStory(id, world) && !flags.includes(`left:${id}`);
  return DIMENSIONS.map((d) => (isWalker(party[d]) && here(party[d]) ? party[d] : DEFAULT_PARTY[d]) as HeroId).filter(
    here,
  );
}

/**
 * Who walks the World: the one the player picked, as long as they can still
 * walk (see walkersFor). Otherwise the player's class companion if met, else
 * the hero they woke as (`origin`, see Player), else Brannoc.
 */
export function worldHero(
  picked: CharacterId | null,
  party: Record<Dimension, CharacterId>,
  classDimension: Dimension,
  owned?: Owned | null,
  origin?: CharacterId,
  flags: string[] = [],
  world?: string[],
): HeroId {
  const walkers = walkersFor(party, owned, flags, world);
  if (picked && walkers.includes(picked as HeroId)) return picked as HeroId;
  const own = walkers.find((h) => h === party[classDimension] || h === DEFAULT_PARTY[classDimension]);
  return own ?? ((origin && isWalker(origin) ? origin : 'brannoc') as HeroId);
}
