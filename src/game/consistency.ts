import { addDays } from './dates';
import { isDueOn, restDaySet } from './schedule';
import type { Completion, Dimension, Quest, RestDay } from './types';

export type Consistency = {
  /** Due quest-days that were done. */
  done: number;
  /** Quest-days that were due. */
  due: number;
  /** done / due, or null when nothing was due. */
  rate: number | null;
};

/**
 * How reliably the player did what they scheduled between `start` and `end`
 * (inclusive). Rest days are excused. Today only counts once it's done, so
 * the number never drops just because the day isn't over.
 */
export function consistency(
  quests: Quest[],
  completions: Completion[],
  restDays: RestDay[],
  start: string,
  end: string,
  today: string,
  dimension?: Dimension,
): Consistency {
  const doneKeys = new Set(completions.map((c) => `${c.questId}|${c.date}`));
  const rest = restDaySet(restDays, dimension);
  const pool = dimension ? quests.filter((q) => q.dimension === dimension) : quests;
  let done = 0;
  let due = 0;
  const last = end < today ? end : today;
  for (let day = start; day <= last; day = addDays(day, 1)) {
    if (rest.has(day)) continue;
    for (const q of pool) {
      if (!isDueOn(q, day)) continue;
      const hit = doneKeys.has(`${q.id}|${day}`);
      if (day === today && !hit) continue;
      due += 1;
      if (hit) done += 1;
    }
  }
  return { done, due, rate: due > 0 ? done / due : null };
}

/** The `days`-long window ending today, and the one just before it. */
export function consistencyWindows(
  quests: Quest[],
  completions: Completion[],
  restDays: RestDay[],
  days: number,
  today: string,
  dimension?: Dimension,
): { current: Consistency; previous: Consistency } {
  const start = addDays(today, -(days - 1));
  const prevEnd = addDays(start, -1);
  const prevStart = addDays(prevEnd, -(days - 1));
  return {
    current: consistency(quests, completions, restDays, start, today, today, dimension),
    previous: consistency(quests, completions, restDays, prevStart, prevEnd, today, dimension),
  };
}
