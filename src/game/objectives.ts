import { addDays, dayOfWeek } from './dates';
import { CLASSES } from './classes';
import { questsForDay } from './quests';
import { isDueOn } from './schedule';
import type { Completion, Dimension, Quest } from './types';

export type ObjectiveReward =
  | { kind: 'drop' }
  | { kind: 'grace' }
  /** Double XP on this Path for the rest of the day it's claimed. */
  | { kind: 'boost'; dimension: Dimension };

export type Objective = {
  /** Stable for the day or week, so a claim is remembered. */
  id: string;
  period: 'daily' | 'weekly';
  title: string;
  progress: number;
  target: number;
  reward: ObjectiveReward;
  dimension?: Dimension;
};

export const isObjectiveDone = (o: Objective) => o.progress >= o.target;

/** A repeatable number from a string, so the same day always rolls the same way. */
export function seededRoll(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10_000) / 10_000;
}

/** Monday of the week containing `date`. */
export function weekStart(date: string): string {
  return addDays(date, -((dayOfWeek(date) + 6) % 7));
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/**
 * Three objectives for `today`, built from the player's own quests so each
 * one is doable: show up, clear a quest on one Path, and clear a few quests.
 */
export function dailyObjectives(
  quests: Quest[],
  completions: Completion[],
  today: string,
  classDimension: Dimension,
): Objective[] {
  const done = completions.filter((c) => c.date === today);
  const due = questsForDay(quests, today);
  const duePaths = [...new Set(due.map((q) => q.dimension))];
  const path = duePaths.length
    ? duePaths[Math.floor(seededRoll(`path:${today}`) * duePaths.length)]
    : classDimension;
  const count = clamp(Math.ceil(due.length * 0.75), 2, 5);
  return [
    { id: `daily:${today}:show-up`, period: 'daily', title: 'Show up today', progress: done.length ? 1 : 0, target: 1, reward: { kind: 'drop' } },
    {
      id: `daily:${today}:path`,
      period: 'daily',
      title: `Complete a ${CLASSES[path].className} quest`,
      progress: done.some((c) => c.dimension === path) ? 1 : 0,
      target: 1,
      reward: { kind: 'boost', dimension: path },
      dimension: path,
    },
    {
      id: `daily:${today}:count`,
      period: 'daily',
      title: `Complete ${count} quests today`,
      progress: Math.min(done.length, count),
      target: count,
      reward: { kind: 'drop' },
    },
  ];
}

/** Three objectives for the week (Monday to Sunday) containing `today`. */
export function weeklyObjectives(quests: Quest[], completions: Completion[], today: string): Objective[] {
  const start = weekStart(today);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const inWeek = completions.filter((c) => c.date >= start && c.date <= days[6]);
  const dueThisWeek = days.reduce((n, d) => n + quests.filter((q) => isDueOn(q, d)).length, 0);
  const count = clamp(Math.round(dueThisWeek * 0.7), 5, 40);
  const livePaths = new Set(quests.filter((q) => q.active).map((q) => q.dimension)).size;
  const paths = clamp(livePaths, 1, 4);
  const shownUp = new Set(inWeek.map((c) => c.date)).size;
  const walked = new Set(inWeek.map((c) => c.dimension)).size;
  return [
    { id: `weekly:${start}:show-up`, period: 'weekly', title: 'Show up 5 days this week', progress: Math.min(shownUp, 5), target: 5, reward: { kind: 'grace' } },
    { id: `weekly:${start}:count`, period: 'weekly', title: `Complete ${count} quests this week`, progress: Math.min(inWeek.length, count), target: count, reward: { kind: 'drop' } },
    {
      id: `weekly:${start}:paths`,
      period: 'weekly',
      title: paths === 1 ? 'Walk your Path this week' : `Walk ${paths} different Paths this week`,
      progress: Math.min(walked, paths),
      target: paths,
      reward: { kind: 'drop' },
    },
  ];
}

export const BOOST_MULTIPLIER = 2;

