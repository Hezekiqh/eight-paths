import { addDays } from './dates';
import { isDueOn, isScheduledOn, isSkippedOn, restDaySet, restedHabitDays } from './schedule';
import type { Completion, Dimension, Quest, RestDay } from './types';

export type Streak = { current: number; best: number };

/** 'hit' extends a streak, 'skip' leaves it alone, 'miss' breaks it. */
export type DayStatus = 'hit' | 'skip' | 'miss';

/**
 * Walks every day from `start` to `today`. Today can only help: it counts
 * once it's a hit and never breaks the streak before the day is over.
 */
export function runStreak(start: string, today: string, status: (day: string) => DayStatus): Streak {
  let current = 0;
  let best = 0;
  for (let day = start; day <= today; day = addDays(day, 1)) {
    const s = status(day);
    if (s === 'hit') {
      current += 1;
      best = Math.max(best, current);
    } else if (s === 'miss' && day !== today) {
      current = 0;
    }
  }
  return { current, best };
}

function earliest(start: string, completions: Completion[]): string {
  return completions.reduce((min, c) => (c.date < min ? c.date : min), start);
}

/**
 * Days showing up: any completion is a hit, and a day with nothing done is a
 * miss. Rest tokens save habits, not the day (older whole-day rests still count).
 */
export function showUpStreak(completions: Completion[], restDays: RestDay[], start: string, today: string): Streak {
  const active = new Set(completions.map((c) => c.date));
  const rest = restDaySet(restDays);
  return runStreak(earliest(start, completions), today, (day) =>
    active.has(day) ? 'hit' : rest.has(day) ? 'skip' : 'miss',
  );
}

/**
 * A Path's streak. A completion in the Path is a hit. A day only breaks it
 * when one of the Path's quests was due, nothing in the Path was done, and
 * not every quest due was saved by a rest token. Days with nothing due are skipped, so a
 * Mon/Wed/Fri habit isn't punished on the weekend.
 */
export function dimensionStreak(
  completions: Completion[],
  restDays: RestDay[],
  quests: Quest[],
  dimension: Dimension,
  start: string,
  today: string,
): Streak {
  const inPath = completions.filter((c) => c.dimension === dimension);
  const active = new Set(inPath.map((c) => c.date));
  const rest = restDaySet(restDays, dimension);
  const pathQuests = quests.filter((q) => q.dimension === dimension);
  const saved = new Map(pathQuests.map((q) => [q.id, restedHabitDays(restDays, q)]));
  return runStreak(earliest(start, inPath), today, (day) => {
    if (active.has(day)) return 'hit';
    if (rest.has(day)) return 'skip';
    const due = pathQuests.filter((q) => isDueOn(q, day));
    return due.some((q) => !saved.get(q.id)!.has(day)) ? 'miss' : 'skip';
  });
}

/**
 * Consecutive scheduled days, ending today, on which `quest` was completed.
 * Unscheduled, skipped and rest days are passed over; today is too until done.
 */
export function habitStreak(quest: Quest, completions: Completion[], restDays: RestDay[], today: string): number {
  if (quest.repeatDays.length === 0) return 0;
  const doneDays = new Set(completions.filter((c) => c.questId === quest.id).map((c) => c.date));
  if (doneDays.size === 0) return 0;
  const rest = restedHabitDays(restDays, quest);
  const first = [...doneDays].sort()[0];
  return runStreak(first, today, (day) => {
    if (!isScheduledOn(quest, day) || isSkippedOn(quest, day)) return 'skip';
    if (doneDays.has(day)) return 'hit';
    return rest.has(day) ? 'skip' : 'miss';
  }).current;
}
