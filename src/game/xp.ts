import { DIMENSIONS, type Completion, type Dimension } from './types';

export const BASE_XP = 10;
export const CLASS_BONUS = 1.25;
export const START_LEVEL = 5;
export const OVERALL_SCALE = 4;

/** Completions per Path per day that earn full XP; later ones earn half, so padding doesn't pay. */
export const FULL_XP_PER_PATH_PER_DAY = 3;

/** The level curve stops getting steeper here, so progress never grinds to a halt. */
export const LEVEL_XP_CAP = 150;

/**
 * `earlierInPathThatDay` is how many completions this Path already has on
 * the same day.
 */
export function xpForCompletion(
  dimension: Dimension,
  classDimension: Dimension,
  earlierInPathThatDay = 0,
): number {
  const full = dimension === classDimension ? Math.ceil(BASE_XP * CLASS_BONUS) : BASE_XP;
  return earlierInPathThatDay < FULL_XP_PER_PATH_PER_DAY ? full : Math.ceil(full / 2);
}

/**
 * XP needed to go from `level` to `level + 1`: 30 at level 5, +10 per level,
 * capped at 150. Never steeper than the 1.0 curve (20 × L), so recomputing
 * an existing save can only raise its levels.
 */
export function xpToNextLevel(level: number, scale = 1): number {
  return Math.min(30 + 10 * (level - START_LEVEL), LEVEL_XP_CAP) * scale;
}

export type LevelProgress = {
  level: number;
  /** XP earned since reaching `level`. */
  xpIntoLevel: number;
  /** XP needed to reach `level + 1`. */
  xpForNext: number;
};

export function levelFromXp(totalXp: number, scale = 1): LevelProgress {
  let level = START_LEVEL;
  let remaining = Math.max(0, totalXp);
  while (remaining >= xpToNextLevel(level, scale)) {
    remaining -= xpToNextLevel(level, scale);
    level += 1;
  }
  return { level, xpIntoLevel: remaining, xpForNext: xpToNextLevel(level, scale) };
}

export function overallLevelFromXp(totalXp: number): LevelProgress {
  return levelFromXp(totalXp, OVERALL_SCALE);
}

export function emptyDimensionRecord<T>(value: T): Record<Dimension, T> {
  return Object.fromEntries(DIMENSIONS.map((d) => [d, value])) as Record<Dimension, T>;
}

/** Anything that carries XP on a Path: completions and grants. */
type XpSource = Pick<Completion, 'dimension' | 'xp'>;

export function xpByDimension(completions: XpSource[]): Record<Dimension, number> {
  const totals = emptyDimensionRecord(0);
  for (const c of completions) totals[c.dimension] += c.xp;
  return totals;
}

export function totalXp(completions: XpSource[]): number {
  return completions.reduce((sum, c) => sum + c.xp, 0);
}

export type XpGain = {
  before: LevelProgress;
  after: LevelProgress;
  gained: number;
  leveledUp: boolean;
};

/** What a completion banner needs: the dimension bar before and after `gained` XP. */
export function describeXpGain(xpBefore: number, gained: number): XpGain {
  const before = levelFromXp(xpBefore);
  const after = levelFromXp(xpBefore + gained);
  return { before, after, gained, leveledUp: after.level > before.level };
}
