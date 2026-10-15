import type { Completion, Dimension } from './types';

/**
 * How the player's hero feels on Today. Each Path done today earns its own
 * mood (Physical acts strong, Intellectual acts smart, ...); with nothing done
 * yet the hero just follows the clock: waking up, ready, winding down, asleep.
 */
export type Mood =
  | 'sleepy'
  | 'waking'
  | 'ready'
  | 'winding'
  | 'champion'
  | 'strong'
  | 'rich'
  | 'smart'
  | 'calm'
  | 'peaceful'
  | 'cheerful'
  | 'busy'
  | 'outdoorsy'
  | 'victory'
  | 'anxious'
  | 'confident'
  | 'overdrive'
  | 'cool';

export const PATH_MOODS: Record<Dimension, Mood> = {
  physical: 'strong',
  financial: 'rich',
  intellectual: 'smart',
  spiritual: 'calm',
  emotional: 'peaceful',
  social: 'cheerful',
  occupational: 'busy',
  environmental: 'outdoorsy',
};

export const MOOD_LABELS: Record<Mood, string> = {
  sleepy: 'Sleepy',
  waking: 'Waking up',
  ready: 'Ready',
  winding: 'Winding down',
  champion: 'Champion',
  strong: 'Strong',
  rich: 'Prosperous',
  smart: 'Smart',
  calm: 'Blessed',
  peaceful: 'At peace',
  cheerful: 'Cheerful',
  busy: 'Hard at work',
  outdoorsy: 'Outdoorsy',
  victory: 'Level up!',
  anxious: 'Anxious',
  confident: 'Confident',
  overdrive: 'Overdrive',
  cool: 'Too cool',
};

/** The mood the clock gives when nothing today has set one. */
export function clockMood(hour: number): Mood {
  if (hour >= 22 || hour < 5) return 'sleepy';
  if (hour < 10) return 'waking';
  if (hour < 18) return 'ready';
  return 'winding';
}

/** The day the pace is measured over: 7 AM to 10 PM. */
const DAY_START = 7 * 60;
const DAY_LENGTH = 15 * 60;
/** "A habit an hour": this many in a row, each within this many minutes of the last (and of now). */
const STEADY_RUN = 3;
const STEADY_GAP = 75;
/** A habit done this recently still shows its own Path's mood. */
const FRESH_MINUTES = 30;
/** How long a level-up's victory dance plays before the hero settles back. */
export const VICTORY_MS = 45_000;

type Pace = 'anxious' | 'confident' | 'overdrive' | null;

/**
 * Where today's habits stand against the clock: how many should be done by
 * now if they were spread evenly over the day, against how many are.
 */
export function paceMood(done: number, total: number, minutes: number): Pace {
  if (total === 0) return null;
  const expected = (total * Math.min(DAY_LENGTH, Math.max(0, minutes - DAY_START))) / DAY_LENGTH;
  const ahead = done - expected;
  if (ahead >= Math.max(3, total * 0.4)) return 'overdrive';
  if (ahead >= Math.max(1, total * 0.15)) return 'confident';
  if (-ahead >= Math.max(1.5, total * 0.25)) return 'anxious';
  return null;
}

/** A habit about every hour, still going: the last few each came within the hour-and-a-bit of the one before. */
export function onSteadyRun(times: number[], minutes: number): boolean {
  const sorted = [...times].sort((a, b) => a - b);
  if (sorted.length < STEADY_RUN || minutes - sorted[sorted.length - 1] > STEADY_GAP) return false;
  const run = sorted.slice(-STEADY_RUN);
  return run.every((t, i) => i === 0 || t - run[i - 1] <= STEADY_GAP);
}

type Today = {
  completions: Completion[];
  today: string;
  /** Minutes since local midnight. */
  minutes: number;
  done: number;
  total: number;
  /** A level-up earned this launch, today: when it happened. */
  victoryAt?: number | null;
  now?: number;
};

/**
 * Every mood earned today, newest first, and the one the hero shows now, in
 * order: a fresh level-up's victory, every quest done, way ahead of the day
 * (overdrive), a habit an hour (too cool), a habit just done (its Path's mood),
 * ahead or behind the day, the latest Path done, and otherwise the clock.
 */
export function todaysMoods({ completions, today, minutes, done, total, victoryAt = null, now = Date.now() }: Today) {
  const todays = completions.filter((c) => c.date === today).sort((a, b) => (b.at ?? 0) - (a.at ?? 0));
  const allDone = total > 0 && done >= total;
  const earned: Mood[] = [];
  if (victoryAt !== null) earned.push('victory');
  if (allDone && todays.length > 0) earned.push('champion');
  for (const c of todays) {
    const mood = PATH_MOODS[c.dimension];
    if (!earned.includes(mood)) earned.push(mood);
  }

  const latest = todays[0];
  const awake = minutes >= DAY_START && minutes < DAY_START + DAY_LENGTH;
  const times = todays.flatMap((c) => (c.at === undefined ? [] : [c.at]));
  const pick = (): Mood => {
    if (victoryAt !== null && now - victoryAt < VICTORY_MS) return 'victory';
    if (allDone && todays.length > 0) return 'champion';
    const pace = awake ? paceMood(done, total, minutes) : null;
    if (pace === 'overdrive') return pace;
    if (awake && onSteadyRun(times, minutes)) return 'cool';
    if (latest?.at !== undefined && minutes - latest.at <= FRESH_MINUTES) return PATH_MOODS[latest.dimension];
    if (pace) return pace;
    if (latest) return PATH_MOODS[latest.dimension];
    return clockMood(Math.floor(minutes / 60));
  };
  const current = pick();
  // The day's state moods (cool, ahead, behind) show as a chip too while they last.
  if (!earned.includes(current)) earned.unshift(current);
  return { current, earned };
}
