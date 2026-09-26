import { addDays } from './dates';
import type { Completion, RestDay } from './types';

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
 * Plays every midnight between the last settle and `today`: each finished day
 * with zero completions spends a token (and becomes a rest day) if one is
 * available, and every 7th consecutive active day earns a token, up to 3.
 * `firstDay` is the first day eligible for settling (the onboarding date).
 */
export function settleRestDays(
  ledger: RestLedger,
  completions: Completion[],
  firstDay: string,
  today: string,
): RestLedger {
  const activeDays = new Set(completions.map((c) => c.date));
  let { restTokens } = ledger;
  const restDays = [...ledger.restDays];
  let day = ledger.lastSettledDate ? addDays(ledger.lastSettledDate, 1) : firstDay;
  let lastSettledDate = ledger.lastSettledDate;

  while (day < today) {
    if (activeDays.has(day)) {
      const run = activeRunEndingOn(activeDays, day);
      if (run % DAYS_PER_TOKEN === 0) restTokens = Math.min(MAX_REST_TOKENS, restTokens + 1);
    } else if (restTokens > 0) {
      restTokens -= 1;
      restDays.push({ date: day, dimension: 'all' });
    }
    lastSettledDate = day;
    day = addDays(day, 1);
  }

  return { restTokens, restDays, lastSettledDate };
}
