import { isScheduledOn } from './schedule';
import { xpForCompletion } from './xp';
import type { Completion, Dimension, Quest } from './types';

export const DAILY = [0, 1, 2, 3, 4, 5, 6];
export const WEEKDAYS = [1, 2, 3, 4, 5];

/** The pinned onboarding quest: never scheduled, retired once completed. */
export const TUTORIAL_QUEST_ID = 'tutorial';
export const TUTORIAL_QUEST_TITLE = 'Begin your journey';

export function questsForDay(quests: Quest[], date: string): Quest[] {
  return quests.filter((q) => q.active && isScheduledOn(q, date));
}

export function completionFor(completions: Completion[], questId: string, date: string) {
  return completions.find((c) => c.questId === questId && c.date === date);
}

export type ToggleResult =
  | { kind: 'completed'; completions: Completion[]; completion: Completion }
  | { kind: 'undone'; completions: Completion[] }
  | { kind: 'ignored'; completions: Completion[] };

/**
 * Completes `quest` for `today`, or undoes today's completion if it exists.
 * Past days are never touched, so undo is same-day only.
 */
export function toggleCompletion(
  completions: Completion[],
  quest: Quest,
  classDimension: Dimension,
  today: string,
  newId: string,
): ToggleResult {
  const existing = completionFor(completions, quest.id, today);
  if (existing) {
    return { kind: 'undone', completions: completions.filter((c) => c !== existing) };
  }
  if (!quest.active) return { kind: 'ignored', completions };
  const completion: Completion = {
    id: newId,
    questId: quest.id,
    dimension: quest.dimension,
    date: today,
    xp: xpForCompletion(
      quest.dimension,
      classDimension,
      completions.filter((c) => c.dimension === quest.dimension && c.date === today).length,
    ),
  };
  return { kind: 'completed', completions: [...completions, completion], completion };
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export type ScheduleKind = 'daily' | 'weekdays' | 'custom';

export function scheduleKind(repeatDays: number[]): ScheduleKind {
  const days = [...repeatDays].sort().join(',');
  if (days === DAILY.join(',')) return 'daily';
  if (days === WEEKDAYS.join(',')) return 'weekdays';
  return 'custom';
}

/** "Daily", "Weekdays", or the days in week order starting Monday, e.g. "Mon · Wed · Fri". */
export function describeSchedule(repeatDays: number[]): string {
  const kind = scheduleKind(repeatDays);
  if (kind === 'daily') return 'Daily';
  if (kind === 'weekdays') return 'Weekdays';
  if (repeatDays.length === 0) return 'Never';
  const mondayFirst = [1, 2, 3, 4, 5, 6, 0].filter((d) => repeatDays.includes(d));
  return mondayFirst.map((d) => DAY_NAMES[d]).join(' · ');
}
