import { addDays } from './dates';
import { isDueOn } from './schedule';
import { dimensionStreak, habitStreak, showUpStreak } from './streaks';
import type { Completion, Quest, RestDay } from './types';

export const STARTING_REST_TOKENS = 1;
export const MAX_REST_TOKENS = 3;
export const DAYS_PER_TOKEN = 7;

export type RestLedger = {
  restTokens: number;
  restDays: RestDay[];
  /** Last day whose midnight has been processed; null before the first settle. */
  lastSettledDate: string | null;
};

/** Consecutive days with a completion anywhere, ending on (and including) `day`. */
function activeRunEndingOn(activeDays: Set<string>, day: string): number {
  let run = 0;
  while (activeDays.has(day)) {
    run += 1;
    day = addDays(day, -1);
  }
  return run;
}

/**
 * Whether `day`, as it stands, would break a streak that's still alive: the
 * show-up streak (nothing done at all), a Path's (one of its quests was due
 * and nothing in it was done) or a habit's (it was due and not done). Each
 * streak is read with `day` as "today", so it's the streak going into it.
 */
function breaksAStreak(
  day: string,
  completions: Completion[],
  quests: Quest[],
  restDays: RestDay[],
  firstDay: string,
): boolean {
  const doneThatDay = completions.filter((c) => c.date === day);
  if (doneThatDay.length === 0 && showUpStreak(completions, restDays, firstDay, day).current > 0) return true;
  const due = quests.filter((q) => isDueOn(q, day));
  const doneQuests = new Set(doneThatDay.map((c) => c.questId));
  const donePaths = new Set(doneThatDay.map((c) => c.dimension));
  for (const q of due) {
    if (doneQuests.has(q.id)) continue;
    if (habitStreak(q, completions, restDays, day) > 0) return true;
    if (!donePaths.has(q.dimension) && dimensionStreak(completions, restDays, quests, q.dimension, firstDay, day).current > 0) {
      return true;
    }
  }
  return false;
}

/**
 * Plays every midnight between the last settle and `today`: each finished day
 * that would break a live streak (a missed habit, a Path left untouched, or
 * nothing done at all) spends a token and becomes a rest day for everything,
 * if one is available. Every 7th consecutive active day earns a token, up to 3.
 * `firstDay` is the first day eligible for settling (the onboarding date).
 */
export function settleRestDays(
  ledger: RestLedger,
  completions: Completion[],
  quests: Quest[],
  firstDay: string,
  today: string,
): RestLedger {
  const activeDays = new Set(completions.map((c) => c.date));
  let { restTokens } = ledger;
  const restDays = [...ledger.restDays];
  let day = ledger.lastSettledDate ? addDays(ledger.lastSettledDate, 1) : firstDay;
  let lastSettledDate = ledger.lastSettledDate;

  while (day < today) {
    if (restTokens > 0 && breaksAStreak(day, completions, quests, restDays, firstDay)) {
      restTokens -= 1;
      restDays.push({ date: day, dimension: 'all' });
    }
    if (activeDays.has(day)) {
      const run = activeRunEndingOn(activeDays, day);
      if (run % DAYS_PER_TOKEN === 0) restTokens = Math.min(MAX_REST_TOKENS, restTokens + 1);
    }
    lastSettledDate = day;
    day = addDays(day, 1);
  }

  return { restTokens, restDays, lastSettledDate };
}
