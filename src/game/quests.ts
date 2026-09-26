import { isScheduledOn } from './streaks';
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
    xp: xpForCompletion(quest.dimension, classDimension),
  };
  return { kind: 'completed', completions: [...completions, completion], completion };
}
