/**
 * The Dopamine Regulator: super stimuli and the Health Points bar they wear
 * down. A super stimulus spikes the baseline, then drops it below where it
 * started; habits kept, and time itself, bring it back. Pure rules, no
 * storage: the bar is replayed from the moment the player started, so
 * changing a past answer just changes the result.
 *
 * Tone: a slip is data, not a verdict. Big spikes sting, but a good day or
 * two should always bring the bar back.
 */

import { addDays } from './dates';

export type RegulatorMode = 'easy' | 'hard';

export type Stimulus = {
  id: string;
  name: string;
  /** 1–10. */
  severity: number;
  /** Named by the player. */
  custom?: boolean;
};

/** What a morning survey records about one day: stimulus id → times (0 = not at all). */
export type DayReport = Record<string, number>;

export const MAX_HP = 100;
/**
 * HP a single day of super stimuli can take, however many there were. High
 * enough that a heavy day can drop the bar below 20 (and earn the Keeper's
 * potion) despite the bar climbing 48 HP a day on its own.
 */
export const DAILY_DRAIN_CAP = 90;
/** HP each habit kept gives back. */
export const HP_PER_HABIT = 5;
/** The most HP habits can give back in a day. */
export const DAILY_RESTORE_CAP = 30;
/** For a day reported with nothing on it. */
export const CLEAN_DAY_BONUS = 10;
/** The most times Hard mode takes for one stimulus in a day. */
export const MAX_COUNT = 20;

export const PHONE_CHECK_ID = 'phone-morning';

/** The usual suspects, strongest first. */
export const DEFAULT_STIMULI: Stimulus[] = [
  { id: 'adult', name: '18+ content', severity: 10 },
  { id: 'betting', name: 'Betting', severity: 9 },
  { id: 'nicotine', name: 'Nicotine / vaping', severity: 8 },
  { id: 'short-video', name: 'Short-form video', severity: 7 },
  { id: 'alcohol', name: 'Alcohol', severity: 7 },
  { id: 'weed', name: 'Weed', severity: 6 },
  { id: 'fast-food', name: 'Fast food', severity: 4 },
  { id: 'sugar', name: 'Sugar / sweets', severity: 3 },
];

/** The optional check: a small one, but the first spike of the day. */
export const PHONE_CHECK: Stimulus = {
  id: PHONE_CHECK_ID,
  name: 'Phone within 30 minutes of waking',
  severity: 2,
};

export const BUILT_IN_STIMULI: Stimulus[] = [...DEFAULT_STIMULI, PHONE_CHECK];

export const clampSeverity = (n: number) => Math.min(10, Math.max(1, Math.round(n)));

/** HP one go of a stimulus costs. */
export const stimulusCost = (severity: number) => clampSeverity(severity) * 2;

/** What a day's report costs, before the cap. Easy mode counts any "yes" once. */
export function rawDrain(report: DayReport, stimuli: Stimulus[], mode: RegulatorMode): number {
  let total = 0;
  for (const s of stimuli) {
    const times = Math.min(MAX_COUNT, Math.max(0, Math.floor(report[s.id] ?? 0)));
    if (times === 0) continue;
    total += stimulusCost(s.severity) * (mode === 'easy' ? 1 : times);
  }
  return total;
}

/** What a day's report costs: never more than the daily cap. */
export function dayDrain(report: DayReport, stimuli: Stimulus[], mode: RegulatorMode): number {
  return Math.min(DAILY_DRAIN_CAP, rawDrain(report, stimuli, mode));
}

/** A day reported, and nothing on it. */
export function isCleanDay(report: DayReport | undefined, stimuli: Stimulus[]): boolean {
  if (!report) return false;
  return stimuli.every((s) => !(report[s.id] > 0));
}

/** The stimuli that came up on a day, by id. */
export function slipsOn(report: DayReport | undefined, stimuli: Stimulus[]): Stimulus[] {
  if (!report) return [];
  return stimuli.filter((s) => report[s.id] > 0);
}

export const dayRestore = (habitsDone: number) => Math.min(DAILY_RESTORE_CAP, Math.max(0, habitsDone) * HP_PER_HABIT);

/** HP that comes back on its own every hour, asleep or awake: a night's sleep is worth 16 or more. */
export const REGEN_PER_HOUR = 2;
/** Below this, the Keeper steps in with a potion... */
export const POTION_BELOW = 20;
/** ...that brings the bar back up to here. */
export const POTION_TO = 50;

const HOUR_MS = 60 * 60 * 1000;

/** Local midnight of a date key, plus `minutes`, in milliseconds. */
export function localTime(date: string, minutes = 0): number {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d, 0, minutes).getTime();
}

export type HpEvent = { at: number; change: number };

/**
 * Everything that moves the bar, in time order: each check-in's drain (or its
 * clean-day bonus) at the moment it was answered, and each habit kept at the
 * time it was done (only the first few a day count). Nothing before `startAt`.
 */
export function hpEvents(input: {
  startAt: number;
  reports: Record<string, DayReport>;
  reportedAt: Record<string, number>;
  stimuli: Stimulus[];
  mode: RegulatorMode;
  /** Habits kept: their date, and minutes after midnight when known. */
  habits: { date: string; at?: number }[];
}): HpEvent[] {
  const { startAt, reports, reportedAt, stimuli, mode, habits } = input;
  const events: HpEvent[] = [];
  for (const [date, report] of Object.entries(reports)) {
    // An answer without a time counts from the next morning.
    const at = Math.max(startAt, reportedAt[date] ?? localTime(date, 24 * 60 + 8 * 60));
    const drain = dayDrain(report, stimuli, mode);
    events.push({ at, change: drain > 0 ? -drain : isCleanDay(report, stimuli) ? CLEAN_DAY_BONUS : 0 });
  }
  const byDay = new Map<string, number[]>();
  for (const h of habits) {
    // Habits from before v9 have no time: call them midday.
    const at = localTime(h.date, h.at ?? 12 * 60);
    if (at < startAt) continue;
    byDay.set(h.date, [...(byDay.get(h.date) ?? []), at]);
  }
  const perDay = DAILY_RESTORE_CAP / HP_PER_HABIT;
  for (const times of byDay.values()) {
    for (const at of times.sort((a, b) => a - b).slice(0, perDay)) events.push({ at, change: HP_PER_HABIT });
  }
  return events.sort((a, b) => a.at - b.at);
}

/**
 * The bar at `now`: full at the start, back up by 2 HP every hour, moved by
 * each event, and kept between 0 and 100. Whenever it falls below 20 the
 * Keeper's potion lifts it straight to 50.
 */
export function simulateHp(startAt: number, now: number, events: HpEvent[]): { hp: number; potions: number } {
  let hp = MAX_HP;
  let t = startAt;
  let potions = 0;
  for (const e of events) {
    if (e.at > now) break;
    hp = Math.min(MAX_HP, hp + (REGEN_PER_HOUR * Math.max(0, e.at - t)) / HOUR_MS);
    hp = Math.min(MAX_HP, Math.max(0, hp + e.change));
    if (hp < POTION_BELOW) {
      hp = POTION_TO;
      potions += 1;
    }
    t = Math.max(t, e.at);
  }
  hp = Math.min(MAX_HP, hp + (REGEN_PER_HOUR * Math.max(0, now - t)) / HOUR_MS);
  return { hp: Math.floor(hp), potions };
}

/** Pokémon colours: green while healthy, yellow below half, red below a fifth. */
export function hpTone(hp: number): 'high' | 'mid' | 'low' {
  if (hp > MAX_HP / 2) return 'high';
  if (hp > MAX_HP / 5) return 'mid';
  return 'low';
}

/** Clean-day streaks, counting back from the latest reported day. Unreported days break nothing and count for nothing. */
export function cleanStreaks(
  reports: Record<string, DayReport>,
  stimuli: Stimulus[],
): { current: number; best: number } {
  const dates = Object.keys(reports).sort();
  let best = 0;
  let run = 0;
  for (const d of dates) {
    run = isCleanDay(reports[d], stimuli) ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return { current: run, best };
}

/** What a new player has to answer this morning: yesterday, if it's in play and not answered yet. */
export function surveyDue(start: string | null, today: string, reports: Record<string, DayReport>): string | null {
  if (!start) return null;
  const yesterday = addDays(today, -1);
  if (yesterday < start || reports[yesterday]) return null;
  return yesterday;
}

/**
 * A little more on each built-in super stimulus, for the dropdowns. Plain
 * and kind: what it does, and why it's hard, never who you are.
 */
export const STIMULUS_NOTES: Record<string, { short: string; more: string }> = {
  adult: {
    short: 'Novelty on tap. The strongest spike there is, and the steepest drop after.',
    more: 'Endless novelty is the hook: every click promises something new, so the brain keeps chasing the next one. Over time ordinary closeness can feel flat by comparison. Many people notice more energy, focus and patience within a couple of weeks away from it.',
  },
  betting: {
    short: 'The maybe is the hook. Not knowing spikes harder than winning.',
    more: 'Uncertain rewards release more dopamine than certain ones, which is why near-misses feel like almost-wins and keep you playing. Apps make it instant and always in your pocket. Notice the urge before the bet, not just the bet.',
  },
  nicotine: {
    short: 'A fast lift, then a slow pull back for the next one.',
    more: 'Nicotine reaches the brain in seconds, so the relief is quick and the craving that follows is quick too. Much of what feels like calm is the last craving easing. Cravings usually crest and pass in a few minutes if you ride them out.',
  },
  'short-video': {
    short: 'Swipe, spike, swipe. Every flick is a tiny lottery.',
    more: 'Short videos give a new reward every few seconds and never reach an end, so stopping feels like losing something. Afterwards, slower things like reading or a conversation can feel dull. A screen-time limit or keeping the app off your home screen adds a useful pause.',
  },
  alcohol: {
    short: 'Loosens you up tonight, and leaves you lower tomorrow.',
    more: 'Alcohol lifts mood at first, then the brain rebounds the other way: poorer sleep, more anxiety and a flatter mood the next day. Many people find the next morning is the clearest place to see its real cost.',
  },
  weed: {
    short: 'Takes the edge off, and the edge of motivation with it.',
    more: 'Regular use can blunt how rewarding everyday things feel, and make it easier to sit out of things you used to enjoy. Sleep and dreams often change for a while after cutting back; that settles.',
  },
  'fast-food': {
    short: 'Built to hit salt, fat and sugar all at once.',
    more: 'These foods are engineered to be more rewarding than anything found in nature, so plain food can start to taste boring. The crash afterwards is real, too: tired, heavy, and wanting the next hit.',
  },
  sugar: {
    short: 'Quick sweetness, then a dip that asks for more.',
    more: 'A fast rise in blood sugar is followed by a drop that often feels like low energy or a craving for another snack. Small and common, but it adds up across a day.',
  },
  [PHONE_CHECK_ID]: {
    short: 'The first spike of the day sets the tone for the rest.',
    more: "Reaching for the phone first thing hands your attention to everyone else's priorities before your own. Waking up without it, even for half an hour, makes the slower things in your morning feel worth doing.",
  },
};

export const CUSTOM_NOTE = {
  short: 'One you named yourself. You know its pull better than anyone.',
  more: 'Watch for the moment the urge shows up: the time of day, the feeling, the place. That moment is where the change happens, not the slip itself.',
};
