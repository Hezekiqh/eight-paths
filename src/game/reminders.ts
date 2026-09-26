import { addDays, parseTime } from './dates';

/** iOS keeps at most 64 pending notifications; two weeks is plenty. */
export const REMINDER_DAYS_AHEAD = 14;

export const REMINDER_MESSAGES = [
  'Your quests are waiting — one small step counts.',
  'The party is resting by the fire. One quest before you join them?',
  'Even a single quest keeps the path lit tonight.',
  'A little progress still counts as progress. Your quests are here when you are.',
  'Your journey continues whenever you are ready — one small step is enough.',
];

export type PlannedReminder = {
  date: string;
  hour: number;
  minute: number;
  body: string;
};

/**
 * The evening nudges to schedule, one per day starting today. Today is
 * skipped when the player has already completed a quest or the time has
 * passed, so nobody is nudged after they've played.
 */
export function planReminders(
  today: string,
  notificationTime: string,
  playedToday: boolean,
  minutesNow: number,
  days = REMINDER_DAYS_AHEAD,
): PlannedReminder[] {
  const { hour, minute } = parseTime(notificationTime);
  const todayPassed = minutesNow >= hour * 60 + minute;
  const skipToday = playedToday || todayPassed;

  const plans: PlannedReminder[] = [];
  for (let i = skipToday ? 1 : 0; i <= days; i += 1) {
    const date = addDays(today, i);
    const dayNumber = Number(date.replaceAll('-', ''));
    plans.push({ date, hour, minute, body: REMINDER_MESSAGES[dayNumber % REMINDER_MESSAGES.length] });
  }
  return plans;
}
