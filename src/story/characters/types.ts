import type { Dimension } from "@/game";

/**
 * Where a character comes from. The core eight walk the story with the
 * player; recruits are woken along the way; stewards serve the Crown until
 * the player earns their company; legends crown each Path's ladder. Only
 * core companions have story arcs.
 */
export type CharacterKind = "core" | "recruit" | "steward" | "legend";

export type CharacterData = {
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
