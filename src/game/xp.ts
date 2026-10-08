import { DIMENSIONS, type Completion, type Dimension } from './types';

/** Every task is worth the same, so a level reads as a count of tasks. */
export const BASE_XP = 10;
export const START_LEVEL = 5;

/** Free players, or Premium subscribers (see PREMIUM.md). */
export type Tier = 'free' | 'premium';

/** XP for each completed task. Premium doubles it. */
export const TASK_XP: Record<Tier, number> = { free: BASE_XP, premium: BASE_XP * 2 };

/**
 * Only the first 10 habits each day earn XP, on any Paths, Premium or not.
 * Past them, habits still count for streaks, HP and objectives, just not for XP.
 */
export const DAILY_XP_HABITS = 10;

/** Double XP from a class multiplier drop (from objectives)... */
export const BOOST_MULTIPLIER = 2;
/** ...on the next 3 habits in that class, in the order they're done, whatever the day. */
export const BOOST_HABITS = 3;

/** Tasks per level stop growing here, so progress never grinds to a halt. */
export const MAX_TASKS_PER_LEVEL = 10;

/**
 * Tasks needed to go from `level` to `level + 1`. Quick at the start (1 task
 * at level 5, then 2, 3, 4, 5), then one more every two levels until it
 * settles at 10 tasks a level from level 18 on.
 */
/**
 * XP for completing a habit when `habitsDoneToday` were already done today:
 * the tier's rate (doubled when boosted), or nothing past the day's 10.
 */
export function xpForCompletion(habitsDoneToday = 0, tier: Tier = 'free', boosted = false): number {
  if (habitsDoneToday >= DAILY_XP_HABITS) return 0;
  return TASK_XP[tier] * (boosted ? BOOST_MULTIPLIER : 1);
}

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
