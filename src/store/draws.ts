import { DIMENSIONS, levelFromXp, type Dimension, type Tier } from '@/game';
import {
  DEFAULT_PARTY,
  ROSTER,
  SHARDS_TO_UNLOCK,
  isUnlocked,
  type CharacterId,
  type Companion,
  type Rarity,
} from '@/story/companions';

/**
 * How likely each star is to be drawn, per character. 1★ Commons turn up all
 * the time; a 5★ Legendary is a real event.
 */
export const RARITY_WEIGHT: Record<Rarity, number> = { 1: 12, 2: 8, 3: 5, 4: 2.5, 5: 1 };

/** Premium doubles the weight of a 5★, so one turns up about twice as often. */
export const RARITY_WEIGHTS: Record<Tier, Record<Rarity, number>> = {
  free: RARITY_WEIGHT,
  premium: { ...RARITY_WEIGHT, 5: RARITY_WEIGHT[5] * 2 },
};

/** A new character arrives on a Path every 3 to 5 of its levels. */
export const DRAW_GAP_MIN = 3;
export const DRAW_GAP_MAX = 5;

export type Owned = Partial<Record<CharacterId, number>>;

export type DrawState = {
  /** Copies of each character the player has (null: an old save, still to be worked out). */
  owned: Owned | null;
  /** The Path level at which each Path's next character arrives. */
  nextDraw: Partial<Record<Dimension, number>>;
  /** Characters waiting for their hatch cutscene, oldest first (repeats are extra copies). */
  drops: CharacterId[];
  /** Waiting drops that are already a redo, so they can't be redone again. */
  redrawn: CharacterId[];
  shards: Partial<Record<CharacterId, number>>;
  revealed: CharacterId[] | null;
};

/**
 * The core eight are met, not drawn (author, Oct 2, 2026): Brannoc wakes with
 * your first habit, and the other seven are found along the road in the
 * Other World (see meetCharacters). Until then no cocoon hands one out.
 */
export const FIRST_HERO: CharacterId = 'brannoc';
const CORE = Object.values(DEFAULT_PARTY);
const drawable = (c: Companion, owned: Owned) => !CORE.includes(c.id) || (owned[c.id] ?? 0) > 0;

const gap = (random: () => number) => DRAW_GAP_MIN + Math.floor(random() * (DRAW_GAP_MAX - DRAW_GAP_MIN + 1));

/** Picks one character, weighted by rarity. */
export function pickWeighted(
  pool: Companion[],
  random: () => number,
  weights: Record<Rarity, number> = RARITY_WEIGHT,
): Companion {
  const total = pool.reduce((sum, c) => sum + weights[c.rarity], 0);
  let roll = random() * total;
  for (const c of pool) {
    roll -= weights[c.rarity];
    if (roll < 0) return c;
  }
  return pool[pool.length - 1];
}

/**
 * Brings the collection up to date with the player's Path levels:
 *
 * - An old save (owned null) keeps everyone it had unlocked under the old
 *   fixed-level rule, and any of them not yet revealed wait for their hatch.
 * - A character with a full set of shards joins (gifts, objectives).
 * - Each Path whose level has reached its next draw gets a random character
 *   from that Path's whole roster, weighted by rarity (Premium odds for
 *   Premium players), so a draw can be a duplicate. The next draw is 3 to 5
 *   levels further on.
 *
 * Returns the changes, or null when nothing needs to change.
 */
export function reconcileDraws(
  state: Omit<DrawState, 'redrawn'>,
  pathXp: Record<Dimension, number>,
  random: () => number = Math.random,
  tier: Tier = 'free',
): Pick<DrawState, 'owned' | 'nextDraw' | 'drops'> | null {
  let changed = false;
  const drops = [...state.drops];
  let owned: Owned;
  if (state.owned === null) {
    owned = {};
    for (const c of ROSTER) if (isUnlocked(c, pathXp[c.dimension], state.shards[c.id])) owned[c.id] = 1;
    for (const id of Object.values(DEFAULT_PARTY)) owned[id] = Math.max(1, owned[id] ?? 0);
    if (state.revealed)
      for (const id of Object.keys(owned) as CharacterId[]) if (!state.revealed.includes(id)) drops.push(id);
    changed = true;
  } else {
    owned = { ...state.owned };
  }

  // The first habit (any XP at all) wakes Brannoc, with his hatch.
  if (!owned[FIRST_HERO] && DIMENSIONS.some((d) => pathXp[d] > 0)) {
    owned[FIRST_HERO] = 1;
    drops.push(FIRST_HERO);
    changed = true;
  }

  for (const c of ROSTER) {
    if (!owned[c.id] && (state.shards[c.id] ?? 0) >= SHARDS_TO_UNLOCK) {
      owned[c.id] = 1;
      drops.push(c.id);
      changed = true;
    }
  }

  const nextDraw = { ...state.nextDraw };
  for (const d of DIMENSIONS) {
    const level = levelFromXp(pathXp[d]).level;
    if (nextDraw[d] === undefined) {
      nextDraw[d] = level + gap(random);
      changed = true;
    }
    const pool = ROSTER.filter((c) => c.dimension === d && drawable(c, owned));
    while (level >= nextDraw[d]! && pool.length > 0) {
      const pick = pickWeighted(pool, random, RARITY_WEIGHTS[tier]);
      owned[pick.id] = (owned[pick.id] ?? 0) + 1;
      drops.push(pick.id);
      nextDraw[d] = nextDraw[d]! + gap(random);
      changed = true;
    }
  }

  return changed ? { owned, nextDraw, drops } : null;
}

/**
 * Premium's redo: the first waiting drop of `id` goes back and someone else
 * from the same Path is drawn in its place, at Premium odds. A drop that is
 * already a redo can't be redone. Returns the changes and who arrived instead,
 * or null when there's nothing to redo.
 */
export function redoDrop(
  state: Pick<DrawState, 'owned' | 'drops' | 'redrawn'>,
  id: CharacterId,
  random: () => number = Math.random,
): { changes: Pick<DrawState, 'owned' | 'drops' | 'redrawn'>; pick: CharacterId } | null {
  const i = state.drops.indexOf(id);
  if (i < 0 || state.redrawn.includes(id) || !state.owned) return null;
  const dimension = ROSTER.find((c) => c.id === id)!.dimension;
  const pool = ROSTER.filter((c) => c.dimension === dimension && c.id !== id && drawable(c, state.owned!));
  if (pool.length === 0) return null;
  const pick = pickWeighted(pool, random, RARITY_WEIGHTS.premium).id;
  const owned = { ...state.owned };
  const left = (owned[id] ?? 1) - 1;
  if (left > 0) owned[id] = left;
  else delete owned[id];
  owned[pick] = (owned[pick] ?? 0) + 1;
  const drops = [...state.drops];
  drops[i] = pick;
  return { changes: { owned, drops, redrawn: [...state.redrawn, pick] }, pick };
}

/** The chance (0–1) that a draw on `dimension` lands on each star, for the odds sheet. */
export function dropOdds(dimension: Dimension, tier: Tier): Record<Rarity, number> {
  const weights = RARITY_WEIGHTS[tier];
  const pool = ROSTER.filter((c) => c.dimension === dimension);
  const total = pool.reduce((sum, c) => sum + weights[c.rarity], 0);
  const odds: Record<Rarity, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const c of pool) odds[c.rarity] += weights[c.rarity] / total;
  return odds;
}
