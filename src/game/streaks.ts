import { addDays, dayOfWeek } from './dates';
import type { Completion, Dimension, Quest, RestDay } from './types';

function isRestDay(restDays: RestDay[], date: string, dimension: Dimension): boolean {
  return restDays.some((r) => r.date === date && (r.dimension === 'all' || r.dimension === dimension));
}

/**
 * Consecutive days, ending today, with at least one completion in `dimension`.
 * Today counts only once it has a completion, so the streak isn't broken
 * before the day is over. Rest days are skipped: they neither add nor break.
 */
export function dimensionStreak(
  completions: Completion[],
  restDays: RestDay[],
  dimension: Dimension,
  today: string,
): number {
  const activeDays = new Set(completions.filter((c) => c.dimension === dimension).map((c) => c.date));
  if (activeDays.size === 0) return 0;

  let streak = 0;
  let day = activeDays.has(today) ? today : addDays(today, -1);
  for (;;) {
    if (activeDays.has(day)) streak += 1;
    else if (!isRestDay(restDays, day, dimension)) break;
    day = addDays(day, -1);
  }
  return streak;
}

export function isScheduledOn(quest: Quest, date: string): boolean {
  return quest.repeatDays.includes(dayOfWeek(date));
}

/**
 * Consecutive scheduled days, ending today, on which `quest` was completed.
 * Unscheduled days and rest days are skipped; today is skipped until done.
 */
export function habitStreak(
  quest: Quest,
  completions: Completion[],
  restDays: RestDay[],
  today: string,
): number {
  if (quest.repeatDays.length === 0) return 0;
  const doneDays = new Set(completions.filter((c) => c.questId === quest.id).map((c) => c.date));
  if (doneDays.size === 0) return 0;

  const earliest = [...doneDays].sort()[0];
  let streak = 0;
  for (let day = today; day >= earliest; day = addDays(day, -1)) {
    if (!isScheduledOn(quest, day)) continue;
    if (doneDays.has(day)) streak += 1;
    else if (day === today || isRestDay(restDays, day, quest.dimension)) continue;
    else break;
  }
  return streak;
}
