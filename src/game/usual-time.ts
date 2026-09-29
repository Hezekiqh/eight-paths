import { formatTime } from './dates';
import type { Completion } from './types';

/** Active days looked back over to learn when the player usually plays. */
export const USUAL_TIME_DAYS = 14;

/** Timed days needed before the learned time replaces the set one. */
export const USUAL_TIME_MIN_DAYS = 5;

/** The call comes this long before the player usually starts. */
export const USUAL_TIME_LEAD_MINUTES = 30;

/** Never earlier than 8 AM, and never so late there's no room for the 10:30 PM last call. */
export const USUAL_TIME_EARLIEST = 8 * 60;
export const USUAL_TIME_LATEST = 21 * 60 + 30;

/**
 * When to call: half an hour before the player's usual start (the median time
 * of each day's first quest over their last 14 timed days), rounded to 5
 * minutes and kept between 8:00 AM and 9:30 PM. Null until there are 5 timed
 * days to learn from.
 */
export function usualReminderTime(completions: Completion[]): string | null {
  const firstByDay = new Map<string, number>();
  for (const c of completions) {
    if (c.at === undefined) continue;
    const first = firstByDay.get(c.date);
    if (first === undefined || c.at < first) firstByDay.set(c.date, c.at);
  }
  const recent = [...firstByDay.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .slice(0, USUAL_TIME_DAYS)
    .map(([, at]) => at)
    .sort((a, b) => a - b);
  if (recent.length < USUAL_TIME_MIN_DAYS) return null;

  const mid = Math.floor(recent.length / 2);
  const median = recent.length % 2 === 1 ? recent[mid] : (recent[mid - 1] + recent[mid]) / 2;
  const target = Math.round((median - USUAL_TIME_LEAD_MINUTES) / 5) * 5;
  const clamped = Math.min(USUAL_TIME_LATEST, Math.max(USUAL_TIME_EARLIEST, target));
  return formatTime(Math.floor(clamped / 60), clamped % 60);
}
