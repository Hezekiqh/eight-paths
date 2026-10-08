import { addDays } from './dates';
import { isDueOn } from './schedule';
import { habitStreak } from './streaks';
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
 * The habits `day` would break a live streak for: due, not done, and with a
 * streak going into it. Longest streak first, so tokens save the most.
 */
function habitsToSave(day: string, completions: Completion[], quests: Quest[], restDays: RestDay[]): Quest[] {
  const done = new Set(completions.filter((c) => c.date === day).map((c) => c.questId));
  return quests
    .filter((q) => isDueOn(q, day) && !done.has(q.id))
    .map((q) => ({ q, streak: habitStreak(q, completions, restDays, day) }))
    .filter((h) => h.streak > 0)
    .sort((a, b) => b.streak - a.streak)
    .map((h) => h.q);
}

/**
 * Plays every midnight between the last settle and `today`: each habit missed
 * that day with a live streak spends one rest token, which saves that habit's
 * streak and nothing else (the day itself still counts as missed). Every 7th
 * consecutive active day earns a token, up to 3.
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
    for (const quest of habitsToSave(day, completions, quests, restDays)) {
      if (restTokens === 0) break;
      restTokens -= 1;
      restDays.push({ date: day, dimension: quest.dimension, questId: quest.id });
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
