import { addDays } from './dates';
import { emptyDimensionRecord } from './xp';
import { createdDay, isDueOn, restDaySet } from './schedule';
import { DIMENSIONS, type Completion, type Dimension, type Quest, type RestDay } from './types';

export const DIM_AFTER_MISSED = 3;
export const FADE_AFTER_MISSED = 7;

export function opacityForMissedDays(missed: number): number {
  if (missed >= FADE_AFTER_MISSED) return 0.25;
  if (missed >= DIM_AFTER_MISSED) return 0.5;
  return 1;
}

/**
 * Scheduled days missed in each Path since its last completion. Only days
 * when one of the Path's quests was due count (rest days don't), so a
 * Path you're keeping up on its own schedule never dims, and a Path with no
 * quests never does either. Today never counts; it isn't over yet.
 */
export function missedDaysByDimension(
  quests: Quest[],
  completions: Completion[],
  restDays: RestDay[],
  today: string,
): Record<Dimension, number> {
  const missed = emptyDimensionRecord(0);
  for (const d of DIMENSIONS) {
    const pathQuests = quests.filter((q) => q.dimension === d);
    if (pathQuests.length === 0) continue;
    const active = new Set(completions.filter((c) => c.dimension === d).map((c) => c.date));
    if (active.has(today)) continue;
    const rest = restDaySet(restDays, d);
    const firstDay = pathQuests.map(createdDay).sort()[0];
    for (let day = addDays(today, -1); day >= firstDay && missed[d] < FADE_AFTER_MISSED; day = addDays(day, -1)) {
      if (active.has(day)) break;
      if (!rest.has(day) && pathQuests.some((q) => isDueOn(q, day))) missed[d] += 1;
    }
  }
  return missed;
}

export function dimOpacityByDimension(
  quests: Quest[],
  completions: Completion[],
  restDays: RestDay[],
  today: string,
): Record<Dimension, number> {
  const missed = missedDaysByDimension(quests, completions, restDays, today);
  const opacity = emptyDimensionRecord(1);
  for (const d of DIMENSIONS) opacity[d] = opacityForMissedDays(missed[d]);
  return opacity;
}
