import { DIMENSIONS, levelFromXp, type Dimension } from '@/game';
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
 * How likely each star is to be drawn, per character. 5★ Commons turn up all
 * the time; a 1★ Legendary is a real event.
 */
export const RARITY_WEIGHT: Record<Rarity, number> = { 5: 12, 4: 8, 3: 5, 2: 2.5, 1: 1 };

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
  shards: Partial<Record<CharacterId, number>>;
  revealed: CharacterId[] | null;
};

const gap = (random: () => number) => DRAW_GAP_MIN + Math.floor(random() * (DRAW_GAP_MAX - DRAW_GAP_MIN + 1));

/** Picks one character, weighted by rarity. */
export function pickWeighted(pool: Companion[], random: () => number): Companion {
  const total = pool.reduce((sum, c) => sum + RARITY_WEIGHT[c.rarity], 0);
  let roll = random() * total;
  for (const c of pool) {
    roll -= RARITY_WEIGHT[c.rarity];
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
 *   from that Path, weighted by rarity. Once a Path is complete, draws give
 *   extra copies instead. The next draw is 3 to 5 levels further on.
 *
 * Returns the changes, or null when nothing needs to change.
 */
export function reconcileDraws(
  state: DrawState,
  pathXp: Record<Dimension, number>,
  random: () => number = Math.random,
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
    const pool = ROSTER.filter((c) => c.dimension === d);
    while (level >= nextDraw[d]!) {
      const missing = pool.filter((c) => !owned[c.id]);
      const pick = pickWeighted(missing.length > 0 ? missing : pool, random);
      owned[pick.id] = (owned[pick.id] ?? 0) + 1;
      drops.push(pick.id);
      nextDraw[d] = nextDraw[d]! + gap(random);
      changed = true;
    }
  }

  return changed ? { owned, nextDraw, drops } : null;
}
