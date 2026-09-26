import { daysBetween } from './dates';
import { emptyDimensionRecord } from './xp';
import { DIMENSIONS, type Completion, type Dimension } from './types';

export const DIM_AFTER_DAYS = 3;
export const FADE_AFTER_DAYS = 7;

export function opacityForIdleDays(idleDays: number): number {
  if (idleDays >= FADE_AFTER_DAYS) return 0.25;
  if (idleDays >= DIM_AFTER_DAYS) return 0.5;
  return 1;
}

/**
 * Days since the last completion in each dimension. A dimension that has
 * never been completed counts from `since` (the onboarding date).
 */
export function idleDaysByDimension(
  completions: Completion[],
  since: string,
  today: string,
): Record<Dimension, number> {
  const last = emptyDimensionRecord(since);
  for (const c of completions) if (c.date > last[c.dimension]) last[c.dimension] = c.date;
  const idle = emptyDimensionRecord(0);
  for (const d of DIMENSIONS) idle[d] = Math.max(0, daysBetween(last[d], today));
  return idle;
}

export function dimOpacityByDimension(
  completions: Completion[],
  since: string,
  today: string,
): Record<Dimension, number> {
  const idle = idleDaysByDimension(completions, since, today);
  const opacity = emptyDimensionRecord(1);
  for (const d of DIMENSIONS) opacity[d] = opacityForIdleDays(idle[d]);
  return opacity;
}
