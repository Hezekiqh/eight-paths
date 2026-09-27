import type { Completion } from './types';

/** Lifetime days shown up that earn a celebration. */
export const SHOW_UP_MILESTONES = [1, 3, 7, 14, 21, 30, 50, 75, 100, 150, 200, 250, 300, 365, 500, 750, 1000];

/** Distinct days with at least one completion. */
export function daysShownUp(completions: Completion[]): number {
  return new Set(completions.map((c) => c.date)).size;
}

/** The milestone reached by going from `before` to `after` days, if any. */
export function milestoneCrossed(before: number, after: number): number | null {
  return SHOW_UP_MILESTONES.find((m) => before < m && after >= m) ?? null;
}

/** The next milestone above `days`, or null past the last one. */
export function nextMilestone(days: number): number | null {
  return SHOW_UP_MILESTONES.find((m) => m > days) ?? null;
}
