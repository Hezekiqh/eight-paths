import { monthOf, monthWeeks } from './calendar';
import { consistency, type Consistency } from './consistency';
import { addDays, dayOfWeek } from './dates';
import { createdDay, isScheduledOn, isSkippedOn, questLiveOn, restedHabitDays } from './schedule';
import { runStreak, type Streak } from './streaks';
import { WEEKDAY_NAMES } from './stats';
import type { Completion, Quest, RestDay } from './types';

// One habit's own stats, for the sheet you get by holding it on the Quests screen
// (author, Oct 7, 2026): when you usually do it, the weekday you keep it best,
// how reliably you keep it, and a month of hits and misses with the time of each.

/** Hits, misses and everything else a day of one habit's calendar can be. */
export type HabitDayStatus =
  /** Done; `at` says when, if the completion knows its time. */
  | 'hit'
  /** Due, not done, and the day is over. */
  | 'miss'
  /** Due today, not done yet. */
  | 'open'
  /** Skipped, or saved by a rest token: excused. */
  | 'excused'
  /** Not scheduled that weekday, before the habit existed, after it was archived, or still to come. */
  | 'off';

export type HabitDay = { date: string; day: number; status: HabitDayStatus; at?: number };

export type HabitStats = {
  /** Mean time of day it gets done, as minutes after midnight (late-night times count as after midnight). Null without timed completions. */
  averageTime: number | null;
  /** How many completions that average is drawn from. */
  timed: number;
  /** The weekday it's kept best (at least two due days), by rate then by count. */
  bestDay: { name: string; rate: number; done: number; due: number } | null;
  /** Kept as scheduled over the last 30 days. */
  last30: Consistency;
  /** Since the habit began. */
  allTime: Consistency;
  streak: Streak;
  /** Every completion, ever. */
  total: number;
  /** The month asked for, Sunday first, padded with nulls like monthWeeks(). */
  month: { month: string; weeks: (HabitDay | null)[][]; hits: number; misses: number };
};

/** Before 5 AM counts as the night before: 1:30 AM is later than 11 PM, not earlier. */
const DAY_STARTS = 5 * 60;
const MINUTES = 24 * 60;

/** The mean of the times, with times before 5 AM counted as the end of the day before. */
export function averageMinute(times: number[]): number | null {
  if (times.length === 0) return null;
  const shifted = times.map((t) => (t < DAY_STARTS ? t + MINUTES : t));
  const mean = Math.round(shifted.reduce((a, b) => a + b, 0) / shifted.length);
  return mean % MINUTES;
}

/** "7:05 AM" for minutes after midnight. */
export function clockTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

/** What `quest` was on `day`: hit, miss, still open, excused or nothing at all. */
function dayStatus(
  quest: Quest,
  day: string,
  today: string,
  doneAt: Map<string, number | undefined>,
  rest: Set<string>,
): HabitDayStatus {
  if (doneAt.has(day)) return 'hit';
  if (day > today || !questLiveOn(quest, day)) return 'off';
  if (!isScheduledOn(quest, day)) return 'off';
  if (isSkippedOn(quest, day) || rest.has(day)) return 'excused';
  return day === today ? 'open' : 'miss';
}

/** Everything on one habit's stats sheet, with `month` ('YYYY-MM') as its calendar. */
export function habitStats(
  quest: Quest,
  completions: Completion[],
  restDays: RestDay[],
  today: string,
  month: string = monthOf(today),
): HabitStats {
  const mine = completions.filter((c) => c.questId === quest.id);
  const doneAt = new Map<string, number | undefined>();
  for (const c of mine) {
    const before = doneAt.get(c.date);
    // the earliest time it was done that day, if any completion knows it
    if (!doneAt.has(c.date) || (c.at !== undefined && (before === undefined || c.at < before)))
      doneAt.set(c.date, c.at);
  }
  const rest = restedHabitDays(restDays, quest);
  const timedTimes = mine.filter((c) => c.at !== undefined).map((c) => c.at!);

  const start = [createdDay(quest), ...doneAt.keys()].sort()[0];
  const weekdays = [0, 1, 2, 3, 4, 5, 6].map(() => ({ done: 0, due: 0 }));
  for (let day = start; day <= today; day = addDays(day, 1)) {
    const status = dayStatus(quest, day, today, doneAt, rest);
    if (status !== 'hit' && status !== 'miss') continue;
    const w = weekdays[dayOfWeek(day)];
    w.due += 1;
    if (status === 'hit') w.done += 1;
  }
  const best = weekdays
    .map((w, i) => ({ name: WEEKDAY_NAMES[i], rate: w.due ? w.done / w.due : 0, ...w }))
    .filter((w) => w.due >= 2 && w.done > 0)
    .sort((a, b) => b.rate - a.rate || b.done - a.done)[0];

  const streak =
    quest.repeatDays.length === 0 || doneAt.size === 0
      ? { current: 0, best: 0 }
      : runStreak(start, today, (day) => {
          const s = dayStatus(quest, day, today, doneAt, rest);
          return s === 'hit' ? 'hit' : s === 'miss' ? 'miss' : 'skip';
        });

  let hits = 0;
  let misses = 0;
  const weeks = monthWeeks(month).map((week) =>
    week.map((date) => {
      if (!date) return null;
      const status = dayStatus(quest, date, today, doneAt, rest);
      if (status === 'hit') hits += 1;
      if (status === 'miss') misses += 1;
      return { date, day: Number(date.slice(8, 10)), status, at: doneAt.get(date) };
    }),
  );

  return {
    averageTime: averageMinute(timedTimes),
    timed: timedTimes.length,
    bestDay: best ?? null,
    last30: consistency([quest], completions, restDays, addDays(today, -29), today, today, quest.dimension),
    allTime: consistency([quest], completions, restDays, start, today, today, quest.dimension),
    streak,
    total: mine.length,
    month: { month, weeks, hits, misses },
  };
}
