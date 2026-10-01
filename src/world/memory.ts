import { CLASSES, DIMENSIONS, levelFromXp, type Dimension } from '@/game';
import { daysBetween } from '@/game/dates';
import { daysShownUp } from '@/game/milestones';
import { showUpStreak } from '@/game/streaks';
import type { GameData } from '@/store';
import { selectXpTotals } from '@/store/selectors';

// What the Other World remembers of your real habits, for the Keeper and the
// end of the season to speak of. Only ever pride, never blame: a gap is
// remembered as the comeback that ended it.

export type HabitMemory = {
  /** Habits kept, all time, and days with at least one. */
  habits: number;
  days: number;
  /** The current run of days shown up, and the best ever. */
  streak: number;
  best: number;
  /** Your strongest Path: its class name ("Warrior") and level. */
  strongest: { dimension: Dimension; name: string; level: number } | null;
  /** The longest gap you came back from: days away, and the month you came back in (null if none). */
  comeback: { gap: number; month: string; endedDaysAgo: number } | null;
  /** Days since you started. */
  since: number;
};

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** A gap has to be this long to be a comeback worth remembering. */
export const COMEBACK_DAYS = 4;

export function habitMemory(data: GameData, today: string): HabitMemory {
  const start = data.player?.onboardedAt ?? today;
  const { current, best } = showUpStreak(data.completions, data.restDays, start, today);
  const byPath = selectXpTotals(data).byPath;
  let strongest: HabitMemory['strongest'] = null;
  for (const d of DIMENSIONS) {
    const level = levelFromXp(byPath[d] ?? 0).level;
    if ((byPath[d] ?? 0) > 0 && (!strongest || level > strongest.level)) {
      strongest = { dimension: d, name: CLASSES[d].className, level };
    }
  }
  // The longest stretch between two days shown up, remembered by the day you came back.
  const dates = [...new Set(data.completions.map((c) => c.date))].sort();
  let comeback: HabitMemory['comeback'] = null;
  for (let i = 1; i < dates.length; i++) {
    const gap = daysBetween(dates[i - 1], dates[i]) - 1;
    if (gap >= COMEBACK_DAYS && (!comeback || gap >= comeback.gap)) {
      comeback = { gap, month: MONTHS[Number(dates[i].slice(5, 7)) - 1], endedDaysAgo: daysBetween(dates[i], today) };
    }
  }
  return {
    habits: data.completions.length,
    days: daysShownUp(data.completions),
    streak: current,
    best,
    strongest,
    comeback,
    since: Math.max(0, daysBetween(start, today)),
  };
}

/** Fills {placeholders} in a line from the memory; null if a placeholder has nothing to fill it. */
export function fill(line: string, values: Record<string, string | number | undefined>): string | null {
  let missing = false;
  const out = line.replace(/\{(\w+)\}/g, (_, key: string) => {
    const v = values[key];
    if (v === undefined) missing = true;
    return String(v ?? '');
  });
  return missing ? null : out;
}
