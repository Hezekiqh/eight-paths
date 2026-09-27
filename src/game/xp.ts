import { DIMENSIONS, type Completion, type Dimension } from './types';

/** Every task is worth the same, so a level reads as a count of tasks. */
export const BASE_XP = 10;
export const START_LEVEL = 5;

/** Only the first this-many completions each day earn XP; more still count for streaks. */
export const DAILY_XP_TASKS = 10;

/** Tasks per level stop growing here, so progress never grinds to a halt. */
export const MAX_TASKS_PER_LEVEL = 10;

/** `earlierToday` is how many completions the player already has today, on any Path. */
export function xpForCompletion(earlierToday = 0): number {
  return earlierToday < DAILY_XP_TASKS ? BASE_XP : 0;
}

/**
 * Tasks needed to go from `level` to `level + 1`. Quick at the start (1 task
 * at level 5, then 2, 3, 4, 5), then one more every two levels until it
 * settles at 10 tasks a level from level 18 on.
 */
export function tasksToNextLevel(level: number): number {
  if (level < 10) return Math.max(1, level - (START_LEVEL - 1));
  return Math.min(6 + Math.floor((level - 10) / 2), MAX_TASKS_PER_LEVEL);
}

/**
 * XP needed to go from `level` to `level + 1`: 10 XP per task. Gentler than
 * every earlier curve at every level, so recomputing an old save can only
 * raise its levels.
 */
export function xpToNextLevel(level: number): number {
  return tasksToNextLevel(level) * BASE_XP;
}

/** The overall level where the first climb ends and the second begins. */
export const FIRST_CLIMB_LEVEL = 100;

/**
 * Tasks for the overall level, which counts every task on every Path. Tuned so
 * someone doing about 4 tasks a day reaches level 100 in about 90 days (365
 * tasks): 2 a level until 15, 3 until 40, 4 until 70, 5 until 100. Then the
 * second climb: 6 a level, one more every 5 levels, settling at 15.
 */
export function tasksToNextOverallLevel(level: number): number {
  if (level < 15) return 2;
  if (level < 40) return 3;
  if (level < 70) return 4;
  if (level < FIRST_CLIMB_LEVEL) return 5;
  return Math.min(6 + Math.floor((level - FIRST_CLIMB_LEVEL) / 5), 15);
}

export type LevelProgress = {
  level: number;
  /** XP earned since reaching `level`. */
  xpIntoLevel: number;
  /** XP needed to reach `level + 1`. */
  xpForNext: number;
};

function climb(totalXp: number, xpFor: (level: number) => number): LevelProgress {
  let level = START_LEVEL;
  let remaining = Math.max(0, totalXp);
  while (remaining >= xpFor(level)) {
    remaining -= xpFor(level);
    level += 1;
  }
  return { level, xpIntoLevel: remaining, xpForNext: xpFor(level) };
}

/** A Path's (or a character's) level from its XP. */
export function levelFromXp(totalXp: number): LevelProgress {
  return climb(totalXp, xpToNextLevel);
}

/** The player's overall level from all their XP. */
export function overallLevelFromXp(totalXp: number): LevelProgress {
  return climb(totalXp, (level) => tasksToNextOverallLevel(level) * BASE_XP);
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
