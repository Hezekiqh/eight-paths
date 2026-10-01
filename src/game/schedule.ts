import { dayOfWeek, toDateKey } from './dates';
import type { Quest, RestDay } from './types';

export function isScheduledOn(quest: Quest, date: string): boolean {
  return quest.repeatDays.includes(dayOfWeek(date));
}

/** Whether the player skipped `quest` on `date`. */
export function isSkippedOn(quest: Quest, date: string): boolean {
  return quest.skippedOn?.includes(date) ?? false;
}

/** The local day a quest was created. */
export function createdDay(quest: Quest): string {
  return toDateKey(new Date(quest.createdAt));
}

/** Whether the quest existed and wasn't archived yet on `date`. */
export function questLiveOn(quest: Quest, date: string): boolean {
  if (date < createdDay(quest)) return false;
  if (quest.active) return true;
  return quest.archivedAt !== undefined && date < quest.archivedAt;
}

/** Whether the player was expected to do `quest` on `date`. A skipped day isn't due. */
export function isDueOn(quest: Quest, date: string): boolean {
  return isScheduledOn(quest, date) && questLiveOn(quest, date) && !isSkippedOn(quest, date);
}

/** Days a rest token covered, for `dimension` (or any dimension when omitted). */
export function restDaySet(restDays: RestDay[], dimension?: string): Set<string> {
  return new Set(
    restDays.filter((r) => r.dimension === 'all' || dimension === undefined || r.dimension === dimension).map((r) => r.date),
  );
}
