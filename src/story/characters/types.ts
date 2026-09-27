import type { Dimension } from '@/game';

/**
 * Where a character comes from. The core eight walk the story with the
 * player; recruits are woken along the way; stewards (shown as "Rival") are
 * woken like anyone else but side with the world as it is, until the player
 * changes their mind; legends crown each Path's ladder. Only
 * core companions have story arcs.
 */
export type CharacterKind = 'core' | 'recruit' | 'steward' | 'legend';

/** Stars, 1 to 5. Everyone in the original roster is 5★; later characters can be rarer or commoner. */
export type Rarity = 1 | 2 | 3 | 4 | 5;

export type CharacterData = {
  /**
   * Collection number, deliberately scattered across Paths. Fixed forever once
   * given: new characters take the next free number, never renumber others.
   */
  number: number;
  rarity: Rarity;
  /** What everyone calls them. */
  name: string;
  /** Their full name, when it differs from `name`. */
  fullName?: string;
  /** The Path they walk: their class, color and the habits that grow them. */
  dimension: Dimension;
  kind: CharacterKind;
  /** Path level that unlocks them (see UNLOCK_LADDER). Core companions are there from the start. */
  unlockLevel: number;
  bio: string;
  /** A line in their own voice. */
  quote: string;
};
