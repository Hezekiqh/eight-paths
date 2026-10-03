import { consistency, type Consistency } from './consistency';
import { addDays, dayOfWeek } from './dates';
import { isDueOn, restDaySet } from './schedule';
import type { Completion, Dimension, Quest, RestDay } from './types';
import { DIMENSIONS } from './types';

// The Stats tab: how reliably the player kept what they scheduled over a week,
// a month or a year, by Path, over time, by weekday and by hour, and the few
// things worth pointing out (most improved, most consistent, needs tending).
// Everything is a completion rate from consistency(), so rest days, skips and
// archived habits count the same way they do everywhere else.

export type StatsPeriod = 'week' | 'month' | 'year';

export const PERIOD_DAYS: Record<StatsPeriod, number> = { week: 7, month: 30, year: 365 };

/** Below this many due quest-days a Path's rate says too little to call it out. */
const ENOUGH = 3;

export type PathStat = {
  dimension: Dimension;
  current: Consistency;
  previous: Consistency;
  /** Points gained since the period before (current rate − previous rate), or null without both. */
  change: number | null;
};

export type Bar = { label: string; rate: number | null; done: number; due: number };

export type HabitStat = { quest: Quest; rate: number; done: number; due: number };

export type Stats = {
  period: StatsPeriod;
  overall: { current: Consistency; previous: Consistency; change: number | null };
  paths: PathStat[];
  mostImproved: PathStat | null;
  mostConsistent: PathStat | null;
  needsTending: PathStat | null;
  /** The period in slices: days for a week, weeks for a month, months for a year. */
  timeline: Bar[];
  /** Monday first. */
  weekdays: Bar[];
  bestDay: Bar | null;
  /** When in the day quests get done, from completions that know their time. */
  timeOfDay: { label: string; count: number }[];
  /** Habits kept best this period (best first), and the one slipping most. */
  topHabits: HabitStat[];
  slipping: HabitStat | null;
  questsDone: number;
};

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Morning, afternoon, evening and night, by the minute of the day a quest was done. */
export const TIMES_OF_DAY: { label: string; from: number; to: number }[] = [
  { label: 'Morning', from: 5 * 60, to: 12 * 60 },
  { label: 'Afternoon', from: 12 * 60, to: 17 * 60 },
  { label: 'Evening', from: 17 * 60, to: 22 * 60 },
  { label: 'Night', from: 22 * 60, to: 29 * 60 },
];

const change = (now: Consistency, before: Consistency) =>
  now.rate !== null && before.rate !== null ? now.rate - before.rate : null;

/** Everything on the Stats tab for `period`, ending today. */
export function stats(
  quests: Quest[],
  completions: Completion[],
  restDays: RestDay[],
  today: string,
  period: StatsPeriod,
): Stats {
  const days = PERIOD_DAYS[period];
  const start = addDays(today, -(days - 1));
  const prevEnd = addDays(start, -1);
  const prevStart = addDays(prevEnd, -(days - 1));
  const window = (from: string, to: string, d?: Dimension) =>
    consistency(quests, completions, restDays, from, to, today, d);

  const current = window(start, today);
  const previous = window(prevStart, prevEnd);
  const paths: PathStat[] = DIMENSIONS.map((d) => {
    const now = window(start, today, d);
    const before = window(prevStart, prevEnd, d);
    return { dimension: d, current: now, previous: before, change: change(now, before) };
  });

  // Worth calling out only with enough due days behind them.
  const judged = paths.filter((p) => p.current.due >= ENOUGH && p.current.rate !== null);
  const byRate = [...judged].sort((a, b) => b.current.rate! - a.current.rate! || b.current.done - a.current.done);
  const mostConsistent = byRate[0] ?? null;
  const improved = judged
    .filter((p) => p.change !== null && p.change > 0 && p.previous.due >= ENOUGH)
    .sort((a, b) => b.change! - a.change!);
  const mostImproved = improved[0] ?? null;
  // The weakest kept Path, if it's genuinely behind the best (never the same one).
  const weakest = byRate[byRate.length - 1];
  const needsTending =
    weakest && weakest !== mostConsistent && weakest.current.rate! < (mostConsistent?.current.rate ?? 1) ? weakest : null;

  // Each day counted once, then added up into the timeline's slices and the weekdays.
  const tally = dailyTally(quests, completions, restDays, start, today);
  const sum = (from: string, to: string, label: string): Bar => {
    let done = 0;
    let due = 0;
    for (const [day, t] of tally) {
      if (day < from || day > to) continue;
      done += t.done;
      due += t.due;
    }
    return { label, rate: due > 0 ? done / due : null, done, due };
  };
  const timeline = slices(period, start, today).map(({ label, from, to }) => sum(from, to, label));
  const weekdays = [1, 2, 3, 4, 5, 6, 0].map((wd) => {
    let done = 0;
    let due = 0;
    for (const [day, t] of tally) {
      if (dayOfWeek(day) !== wd) continue;
      done += t.done;
      due += t.due;
    }
    return { label: WEEKDAY[wd], rate: due > 0 ? done / due : null, done, due };
  });
  const bestDay =
    period === 'week'
      ? null
      : ([...weekdays].filter((w) => w.due >= 2).sort((a, b) => b.rate! - a.rate! || b.done - a.done)[0] ?? null);

  const inPeriod = completions.filter((c) => c.date >= start && c.date <= today);
  const timeOfDay = TIMES_OF_DAY.map(({ label, from, to }) => ({
    label,
    count: inPeriod.filter((c) => c.at !== undefined && ((c.at >= from && c.at < to) || (c.at + 24 * 60 >= from && c.at + 24 * 60 < to))).length,
  }));

  const habits = quests
    .filter((q) => q.active)
    .map((quest) => {
      const c = consistency([quest], completions, restDays, start, today, today);
      return { quest, rate: c.rate ?? 0, done: c.done, due: c.due };
    })
    .filter((h) => h.due >= 2);
  const ranked = [...habits].sort((a, b) => b.rate - a.rate || b.done - a.done);
  const topHabits = ranked.slice(0, 3);
  const last = ranked[ranked.length - 1];
  const slipping = last && ranked.length > 3 && last.rate < 0.5 ? last : null;

  return {
    period,
    overall: { current, previous, change: change(current, previous) },
    paths,
    mostImproved,
    mostConsistent,
    needsTending,
    timeline,
    weekdays,
    bestDay,
    timeOfDay,
    topHabits,
    slipping,
    questsDone: inPeriod.length,
  };
}

/** Due and done quest-days for each day from `start` to today, counted as consistency() counts them. */
function dailyTally(
  quests: Quest[],
  completions: Completion[],
  restDays: RestDay[],
  start: string,
  today: string,
): Map<string, { done: number; due: number }> {
  const doneKeys = new Set(completions.map((c) => `${c.questId}|${c.date}`));
  const rest = restDaySet(restDays);
  const out = new Map<string, { done: number; due: number }>();
  for (let day = start; day <= today; day = addDays(day, 1)) {
    let done = 0;
    let due = 0;
    if (!rest.has(day)) {
      for (const q of quests) {
        if (!isDueOn(q, day)) continue;
        const hit = doneKeys.has(`${q.id}|${day}`);
        if (day === today && !hit) continue;
        due += 1;
        if (hit) done += 1;
      }
    }
    out.set(day, { done, due });
  }
  return out;
}

/** "9/14" for a date key. */
const shortDate = (key: string) => `${Number(key.slice(5, 7))}/${Number(key.slice(8, 10))}`;

/** The period cut into bars: 7 days, the last 5 weeks (the month), or the last 12 months (the year). */
export function slices(period: StatsPeriod, start: string, today: string): { label: string; from: string; to: string }[] {
  if (period === 'week') {
    const out = [];
    for (let day = start; day <= today; day = addDays(day, 1)) out.push({ label: WEEKDAY[dayOfWeek(day)], from: day, to: day });
    return out;
  }
  if (period === 'month') {
    // Five 6-day slices make 30 days, oldest first.
    return [4, 3, 2, 1, 0].map((k) => {
      const to = addDays(today, -6 * k);
      const from = addDays(to, -5);
      return { label: shortDate(from), from, to };
    });
  }
  // Twelve calendar months, ending with this one.
  const [y, m] = today.split('-').map(Number);
  return Array.from({ length: 12 }, (_, i) => {
    const back = 11 - i;
    const month = ((m - 1 - back) % 12 + 12) % 12;
    const year = y + Math.floor((m - 1 - back) / 12);
    const from = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const next = month === 11 ? `${year + 1}-01-01` : `${year}-${String(month + 2).padStart(2, '0')}-01`;
    const to = back === 0 ? today : addDays(next, -1);
    return { label: MONTH[month], from, to };
  });
}
