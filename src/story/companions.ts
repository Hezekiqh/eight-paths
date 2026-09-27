import { DIMENSIONS, levelFromXp, type Dimension } from '@/game';

import { EMOTIONAL } from './characters/emotional';
import { ENVIRONMENTAL } from './characters/environmental';
import { FINANCIAL } from './characters/financial';
import { INTELLECTUAL } from './characters/intellectual';
import { OCCUPATIONAL } from './characters/occupational';
import { PHYSICAL } from './characters/physical';
import { SOCIAL } from './characters/social';
import { SPIRITUAL } from './characters/spiritual';
import type { CharacterData } from './characters/types';

export type { CharacterKind } from './characters/types';

/**
 * The Path levels that unlock each Path's characters, in order after its core
 * companion. Days to reach them doing one quest a day on that Path (two a day
 * halves it): Lv 7 ≈ 1 week, 10 ≈ 3½ weeks, 15 ≈ 2½ months, 20 ≈ 5 months,
 * 30 ≈ 10 months, 40 ≈ 15 months, 50 ≈ 20 months. Paths with a legend use
 * the whole ladder; the rest stop at 40.
 */
export const UNLOCK_LADDER = [7, 10, 13, 15, 18, 20, 23, 26, 30, 35, 40, 50] as const;

/**
 * Everyone a player can collect, one file per Path. Player-facing text only:
 * no dreams, secrets or reveals (see STORY.md §4 and §6). Stewards never show
 * their Sin.
 */
const CHARACTERS = {
  ...PHYSICAL,
  ...FINANCIAL,
  ...INTELLECTUAL,
  ...SPIRITUAL,
  ...EMOTIONAL,
  ...SOCIAL,
  ...OCCUPATIONAL,
  ...ENVIRONMENTAL,
} satisfies Record<string, CharacterData>;

export type CharacterId = keyof typeof CHARACTERS;

export type Companion = CharacterData & {
  id: CharacterId;
  /** Collection number, from 1: grouped by Path, then by unlock level. */
  number: number;
};

/** Everyone, in collection order. */
export const ROSTER: Companion[] = (Object.entries(CHARACTERS) as [CharacterId, CharacterData][])
  .map(([id, data]) => ({ ...data, id }))
  .sort(
    (a, b) => DIMENSIONS.indexOf(a.dimension) - DIMENSIONS.indexOf(b.dimension) || a.unlockLevel - b.unlockLevel,
  )
  .map((c, i) => ({ ...c, number: i + 1 }));

export const COMPANIONS = Object.fromEntries(ROSTER.map((c) => [c.id, c])) as Record<CharacterId, Companion>;

/** The party a new player starts with: each Path's core companion. */
export const DEFAULT_PARTY = Object.fromEntries(
  ROSTER.filter((c) => c.kind === 'core').map((c) => [c.dimension, c.id]),
) as Record<Dimension, CharacterId>;

export function isCharacterId(value: unknown): value is CharacterId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(CHARACTERS, value);
}

/** "#007" */
export const formatNumber = (n: number) => `#${String(n).padStart(3, '0')}`;

/** Shards (from objective drops) that unlock a character early. */
export const SHARDS_TO_UNLOCK = 3;

/**
 * Unlocked once their Path reaches `unlockLevel` (`pathXp` is all XP earned
 * on that Path), or early with enough shards.
 */
export function isUnlocked(companion: Companion, pathXp: number, shards = 0): boolean {
  return levelFromXp(pathXp).level >= companion.unlockLevel || shards >= SHARDS_TO_UNLOCK;
}
