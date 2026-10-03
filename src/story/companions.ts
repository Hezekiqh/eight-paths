import { levelFromXp, type Dimension } from '@/game';

import { EMOTIONAL } from './characters/emotional';
import { ENVIRONMENTAL } from './characters/environmental';
import { FINANCIAL } from './characters/financial';
import { INTELLECTUAL } from './characters/intellectual';
import { OCCUPATIONAL } from './characters/occupational';
import { PHYSICAL } from './characters/physical';
import { SOCIAL } from './characters/social';
import { SPIRITUAL } from './characters/spiritual';
import type { CharacterData, CharacterKind, Rarity } from './characters/types';

export type { Alignment, CharacterKind, Rarity } from './characters/types';

/**
 * The Path levels that unlock each Path's characters, in order after its core
 * companion. Tasks on that Path needed to reach them (so days, at one a day):
 * Lv 7 = 3, 10 = 15, 13 = 34, 15 = 49, 18 = 75, 20 = 95, 23 = 125, 26 = 155,
 * 30 = 195, 35 = 245, 40 = 295, 50 = 395. Paths with a legend use the whole
 * ladder; the rest stop at 40.
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

export type Companion = CharacterData & { id: CharacterId };

/** Everyone, in collection-number order. */
export const ROSTER: Companion[] = (Object.entries(CHARACTERS) as [CharacterId, CharacterData][])
  .map(([id, data]) => ({ ...data, id }))
  .sort((a, b) => a.number - b.number);

export const COMPANIONS = Object.fromEntries(ROSTER.map((c) => [c.id, c])) as Record<CharacterId, Companion>;

/** The party a new player starts with: each Path's core companion. */
export const DEFAULT_PARTY = Object.fromEntries(
  ROSTER.filter((c) => c.kind === 'core').map((c) => [c.dimension, c.id]),
) as Record<Dimension, CharacterId>;

/**
 * The four of the Original 8 a player can wake as (author, Oct 2, 2026): the
 * Season 1 cast who stay together until the party splits at the season's end.
 */
export const STARTERS: CharacterId[] = ['brannoc', 'ysolde', 'quill', 'wren'];

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
  // The old fixed-level rule: now only used to carry old saves over (see store/draws).
  return levelFromXp(pathXp).level >= companion.unlockLevel || shards >= SHARDS_TO_UNLOCK;
}

/** The ancient realm each Path's people came from (LORE.md). */
export const REALMS: Record<Dimension, string> = {
  physical: 'The Warrior Kingdom',
  financial: 'The Merchant City',
  intellectual: 'The Academy',
  spiritual: 'The Temple of the Three',
  emotional: 'The Still Valley',
  social: 'The Festival City',
  occupational: 'The Guild City',
  environmental: 'The Wildwood',
};

/** How each kind of character is labelled in the app. */
export const KIND_LABEL: Record<CharacterKind, string> = {
  core: 'Companion',
  recruit: 'Recruit',
  steward: 'Rival',
  legend: 'Legend',
};

/** What each star count means. More stars is rarer: 5★ is a first-rank, legendary figure. */
export const RARITY_TIERS: Record<Rarity, { name: string; color: string }> = {
  5: { name: 'Legendary', color: '#E8A317' },
  4: { name: 'Epic', color: '#9B59E8' },
  3: { name: 'Rare', color: '#3B8BEB' },
  2: { name: 'Uncommon', color: '#3FAE5A' },
  1: { name: 'Common', color: '#8C8A94' },
};

/** Just the stars: five is the grandest, one the plainest. (Tier names stay for VoiceOver only.) */
export const rarityLabel = (r: Rarity) => '★'.repeat(r);

/** Whether the player has this character: at least one copy, or (old saves not yet reconciled) the old rule. */
export function hasCharacter(
  companion: Companion,
  owned: Partial<Record<CharacterId, number>> | null,
  pathXp: number,
  shards = 0,
): boolean {
  return owned ? (owned[companion.id] ?? 0) > 0 : isUnlocked(companion, pathXp, shards);
}
