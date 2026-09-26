import { DIMENSIONS, type Completion, type Dimension } from './types';

export const BASE_XP = 10;
export const CLASS_BONUS = 1.25;
export const START_LEVEL = 5;
export const OVERALL_SCALE = 8;

export function xpForCompletion(dimension: Dimension, classDimension: Dimension): number {
  return dimension === classDimension ? Math.ceil(BASE_XP * CLASS_BONUS) : BASE_XP;
}

/** XP needed to go from `level` to `level + 1`. */
export function xpToNextLevel(level: number, scale = 1): number {
  return 20 * level * scale;
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

export function xpByDimension(completions: Completion[]): Record<Dimension, number> {
  const totals = emptyDimensionRecord(0);
  for (const c of completions) totals[c.dimension] += c.xp;
  return totals;
}

export function totalXp(completions: Completion[]): number {
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
