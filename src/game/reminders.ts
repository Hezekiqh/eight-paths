import { addDays, daysBetween, parseTime } from './dates';
import { KEEPER_LINES, fillLine, type KeeperGroup, type KeeperVars } from './keeper';
import { isDueOn } from './schedule';
import type { Dimension, Quest, RestDay } from './types';

/** iOS keeps at most 64 pending notifications per app. */
export const MAX_PENDING_REMINDERS = 64;

/** Far enough out that the weekly calls fill the queue first. */
const MAX_DAYS_AHEAD = 7 * MAX_PENDING_REMINDERS;

/** Days away on which a story drop arrives, one per `story` line, in order. */
export const STORY_DAYS = [10, 14, 21, 28, 35, 42];

/** After the last story drop, the Keeper calls once a week, forever. */
export const WEEKLY_FROM = 49;

/** 10:30 PM: the last call, when a streak would break at midnight. */
export const LAST_CALL_MINUTES = 22 * 60 + 30;

/** The last call needs this much room after the usual call, or it's skipped. */
export const LAST_CALL_GAP_MINUTES = 60;

/** A streak worth a late knock. */
export const LAST_CALL_MIN_STREAK = 3;

/** What the Keeper knows about one Path, for the personal calls. */
export type PathFacts = {
  dimension: Dimension;
  /** The class name the player knows the Path by ("Mage"). */
  name: string;
  /** The level the Path reaches next. */
  nextLevel: number;
  /** XP still needed to reach it. */
  xpToLevel: number;
  /** XP one more quest would earn today (0 once the daily cap is hit). */
  xpPerQuestToday: number;
  /** XP one quest earns on a fresh day. */
  xpPerQuest: number;
  /** A character arrives when the Path reaches `nextLevel`. */
  cocoonAtNextLevel: boolean;
};

export type ReminderInput = {
  today: string;
  /** Minutes since midnight, right now. */
  minutesNow: number;
  notificationTime: string;
  name: string;
  quests: Quest[];
  /** Quests already completed today. */
  doneToday: string[];
  /** The last day with a completion, or null if the player never completed one. */
  lastActive: string | null;
  onboardedAt: string;
  /** Rest tokens right now: what would cover today if it's missed. */
  restTokens: number;
  /** Rest tokens once tonight's midnight is settled, if nothing more is done today. */
  restTokensTomorrow: number;
  restDays: RestDay[];
  /** The current showing-up streak. */
  streak: number;
  daysShownUp: number;
  /** The next days-shown-up milestone, or null past the last one. */
  nextMilestone: number | null;
  paths: PathFacts[];
  /** Names of the heroes the player has woken, party first. */
  heroes: string[];
  /** Characters this player has yet to wake. */
  sleeping: number;
};

export type PlannedReminder = {
  date: string;
  hour: number;
  minute: number;
  lineId: string;
  group: KeeperGroup;
  /** Whole days missed before this one: 0 means they played the day before. */
  missed: number;
  body: string;
  /** Breaks through Focus (the last call only). */
  timeSensitive: boolean;
};

/** Which kind of call, by how many days in a row the player has been away. */
export function groupForMissed(missed: number): KeeperGroup | null {
  if (missed === 0) return 'usual';
  if (missed === 1) return 'rested'; // or 'reset', decided by the rest tokens
  if (missed === 5) return 'cocoon';
  if (missed >= 2 && missed <= 6) return 'away';
  if (missed === 7) return 'vigil';
  if (STORY_DAYS.includes(missed)) return 'story';
  if (missed >= WEEKLY_FROM && (missed - WEEKLY_FROM) % 7 === 0) return 'weekly';
  return null;
}

/** The first week's calls are about quests, so they skip days with none due. */
const followsSchedule = (missed: number) => missed <= 6;

const seedOf = (date: string) => Number(date.replaceAll('-', ''));

/**
 * Every call the Keeper will make if the player doesn't come back. Reminders
 * are re-planned whenever the app opens or a quest is completed, so a call
 * only arrives when the player has stayed away for exactly as long as its
 * line assumes, and each line can tell the truth.
 *
 * Walks forward a day at a time, tracking what the rest tokens and the streak
 * would be with the player gone, so rest, reset and last-call lines are only
 * ever sent when they're true.
 */
export function planReminders(input: ReminderInput): PlannedReminder[] {
  const { hour, minute } = parseTime(input.notificationTime);
  const usualMinutes = hour * 60 + minute;
  const lastCallFits = usualMinutes <= LAST_CALL_MINUTES - LAST_CALL_GAP_MINUTES;
  const neverPlayed = input.lastActive === null;
  const playedToday = input.lastActive === input.today;
  // Onboarding day counts as a fresh start, like a day just after playing.
  const dayBeforeStart = addDays(input.onboardedAt, -1);
  const last = input.lastActive && input.lastActive > dayBeforeStart ? input.lastActive : dayBeforeStart;
  // Rotates heroes and lines so neighbouring days never say the same thing.
  const seed = seedOf(last);

  const heroAt = (i: number) =>
    input.heroes.length > 0 ? input.heroes[(seed + i) % input.heroes.length] : undefined;

  // At the start of the day being planned: tokens left, whether the streak is
  // still alive, and whether the day before was saved by a token.
  let tokens = input.restTokens;
  let alive = input.streak > 0;
  let coveredYesterday = input.restDays.some((r) => r.date === addDays(input.today, -1) && r.dimension === 'all');

  const plans: PlannedReminder[] = [];
  for (let k = 0; k <= MAX_DAYS_AHEAD && plans.length < MAX_PENDING_REMINDERS; k += 1) {
    const date = addDays(input.today, k);
    const missed = daysBetween(last, date) - 1;
    const due = input.quests.some((q) => isDueOn(q, date));
    const daySeed = seed + missed;

    // A streak worth keeping, no token to save it, and a quest due.
    const atRisk =
      !(k === 0 && playedToday) && alive && tokens === 0 && input.streak >= LAST_CALL_MIN_STREAK && due;

    // The usual call.
    let group = groupForMissed(missed);
    if (k === 0 && input.minutesNow >= usualMinutes) group = null;
    if (group !== null && followsSchedule(missed) && !due) group = null;
    if (group === 'rested') {
      // Nothing to lose before the first quest, so no talk of streaks.
      if (neverPlayed) group = 'usual';
      else group = coveredYesterday ? 'rested' : 'reset';
    }
    if (group !== null) {
      const vars: KeeperVars = {
        name: input.name,
        hero: heroAt(missed),
        hero2: input.heroes.length > 1 ? heroAt(missed + 1) : undefined,
        sleeping: input.sleeping > 0 ? input.sleeping : undefined,
      };
      const index =
        group === 'story'
          ? STORY_DAYS.indexOf(missed)
          : group === 'weekly'
            ? seed + (missed - WEEKLY_FROM) / 7
            : daySeed;
      const picked =
        (group === 'usual' ? pickPersonal(input, date, k === 0, atRisk, daySeed, vars) : null) ??
        pickLine(group, index, vars, group === 'away' && missed === 3 ? 'e4' : undefined) ??
        // A group whose every line needs something missing (a hero) falls back to a plain call.
        pickLine('usual', daySeed, vars);
      if (picked) plans.push({ date, hour, minute, missed, ...picked, timeSensitive: false });
    }

    // The last call.
    const lastCallAhead = k > 0 || input.minutesNow < LAST_CALL_MINUTES;
    if (atRisk && lastCallFits && lastCallAhead) {
      const picked = pickLine('lastCall', daySeed, { name: input.name, streak: input.streak });
      if (picked) {
        plans.push({
          date,
          hour: Math.floor(LAST_CALL_MINUTES / 60),
          minute: LAST_CALL_MINUTES % 60,
          missed,
          ...picked,
          timeSensitive: true,
        });
      }
    }

    // Midnight, with the player away (unless today is already played).
    if (k === 0) {
      coveredYesterday = !playedToday && input.restTokens > 0;
      alive = alive && (playedToday || input.restTokens > 0);
      tokens = input.restTokensTomorrow;
    } else {
      coveredYesterday = tokens > 0;
      alive = alive && tokens > 0;
      tokens = Math.max(0, tokens - 1);
    }
  }
  return plans.slice(0, MAX_PENDING_REMINDERS);
}

type Picked = { lineId: string; group: KeeperGroup; body: string };

/**
 * A usual-time call about something real (a streak, a level, a cocoon, the
 * quests left, a milestone), or null to use a plain line. Rotates between
 * whatever is true today, plain lines included, so it never nags about the
 * same thing every night.
 */
function pickPersonal(
  input: ReminderInput,
  date: string,
  isToday: boolean,
  atRisk: boolean,
  seed: number,
  base: KeeperVars,
): Picked | null {
  const left = input.quests.filter((q) => isDueOn(q, date) && !(isToday && input.doneToday.includes(q.id)));
  const topics: { ids: string[]; vars: KeeperVars }[] = [];

  if (input.streak >= 3) {
    // b3 says the streak is only safe until midnight, so only when no token would save it.
    const ids = ['b1', ...(input.streak >= 7 ? ['b2'] : []), ...(atRisk ? ['b3'] : [])];
    topics.push({ ids, vars: { streak: input.streak } });
  }

  // One quest from a level: a Path with a quest still due whose next quest would level it.
  const oneAway = input.paths.filter((p) => {
    const perQuest = isToday ? p.xpPerQuestToday : p.xpPerQuest;
    return perQuest > 0 && p.xpToLevel <= perQuest && left.some((q) => q.dimension === p.dimension);
  });
  const levelPath = oneAway.find((p) => !p.cocoonAtNextLevel) ?? oneAway[0];
  if (levelPath) {
    const quest = left.find((q) => q.dimension === levelPath.dimension)!;
    topics.push({
      ids: ['b4', 'b5', 'b6'],
      vars: { path: levelPath.name, level: levelPath.nextLevel, quest: quest.title },
    });
  }
  const cocoonPath = oneAway.find((p) => p.cocoonAtNextLevel);
  if (cocoonPath) topics.push({ ids: ['b7', 'b8', 'b9'], vars: { path: cocoonPath.name } });

  if (left.length === 1) topics.push({ ids: ['b10', 'b12'], vars: { quest: left[0].title } });
  if (left.length >= 2) {
    topics.push({
      ids: ['b11'],
      vars: { n: left.length, quests: left.slice(0, 2).map((q) => q.title).join(' and ') },
    });
  }

  if (input.nextMilestone !== null) {
    const need = input.nextMilestone - input.daysShownUp;
    if (need === 2) topics.push({ ids: ['b13', 'b14'], vars: { n: need, milestone: input.nextMilestone } });
    if (need === 3) topics.push({ ids: ['b13'], vars: { n: need, milestone: input.nextMilestone } });
  }

  // One slot in the rotation stays plain.
  const choice = seed % (topics.length + 1);
  if (choice === topics.length) return null;
  const topic = topics[choice];
  const vars = { ...base, ...topic.vars };
  const options = topic.ids
    .map((id) => KEEPER_LINES.find((l) => l.id === id)!)
    .map((l) => ({ lineId: l.id, group: l.group, body: fillLine(l.text, vars) }))
    .filter((o): o is Picked => o.body !== null);
  return options.length > 0 ? options[Math.floor(seed / (topics.length + 1)) % options.length] : null;
}

function pickLine(group: KeeperGroup, index: number, vars: KeeperVars, prefer?: string): Picked | null {
  const options = KEEPER_LINES.filter((l) => l.group === group)
    .map((l) => ({ lineId: l.id, group, body: fillLine(l.text, vars) }))
    .filter((o): o is Picked => o.body !== null);
  if (options.length === 0) return null;
  const preferred = prefer ? options.find((o) => o.lineId === prefer) : undefined;
  if (preferred) return preferred;
  // e4 names the third day, so it's only ever used there.
  const pool = group === 'away' ? options.filter((o) => o.lineId !== 'e4') : options;
  return pool[index % pool.length] ?? options[0];
}
