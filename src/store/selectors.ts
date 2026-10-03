import {
  CLASSES,
  DIMENSIONS,
  SHOW_UP_MILESTONES,
  TUTORIAL_QUEST_ID,
  addDays,
  completionFor,
  monthName,
  monthOf,
  monthWeeks,
  dailyObjectives,
  isObjectiveDone,
  weeklyObjectives,
  type Objective,
  consistencyWindows,
  daysShownUp,
  nextMilestone,
  restDaySet,
  showUpStreak,
  describeSchedule,
  dimOpacityByDimension,
  dimensionStreak,
  habitOrder,
  habitStreak,
  levelFromXp,
  overallLevelFromXp,
  questsForDay,
  sortByHabitOrder,
  radarData,
  totalXp,
  xpByDimension,
  type ClassInfo,
  type Consistency,
  type Dimension,
  type Streak,
  type LevelProgress,
  type Quest,
  type RadarData,
  type RadarFilter,
  type ReminderInput,
  type PathFacts,
  type Tier,
  settleRestDays,
  usualReminderTime,
  xpForCompletion,
} from '@/game';
import { DEFAULT_PARTY, ROSTER, hasCharacter, type CharacterId, type Companion } from '@/story/companions';

import type { KeeperFacts, KeeperHero } from '@/world/keeper-advice';

import type { GameData } from './index';

export type CollectionEntry = {
  companion: Companion;
  unlocked: boolean;
  inParty: boolean;
  /** The character's own level: XP earned on their Path while in the party. */
  progress: LevelProgress;
  /** The level of the Path they walk, which is what unlocks them. */
  pathLevel: number;
  /** Shards found toward unlocking them early. */
  shards: number;
  /** How many copies the player has (any draw can be a duplicate). */
  copies: number;
};

export type Collection = {
  /** Everyone, in collection order. */
  entries: CollectionEntry[];
  party: Record<Dimension, CollectionEntry>;
  unlockedCount: number;
};

export function selectCollection(data: GameData): Collection {
  const pathXp = xpByDimension(allXp(data));
  const earned = new Map<string, number>();
  for (const c of allXp(data)) {
    const id = c.characterId ?? DEFAULT_PARTY[c.dimension];
    earned.set(id, (earned.get(id) ?? 0) + c.xp);
  }
  const entries = ROSTER.map((companion) => ({
    companion,
    unlocked: hasCharacter(companion, data.owned, pathXp[companion.dimension], data.shards[companion.id]),
    copies: data.owned?.[companion.id] ?? 0,
    shards: data.shards[companion.id] ?? 0,
    inParty: data.party[companion.dimension] === companion.id,
    progress: levelFromXp(earned.get(companion.id) ?? 0),
    pathLevel: levelFromXp(pathXp[companion.dimension]).level,
  }));
  const byId = new Map<CharacterId, CollectionEntry>(entries.map((e) => [e.companion.id, e]));
  return {
    entries,
    party: Object.fromEntries(DIMENSIONS.map((d) => [d, byId.get(data.party[d])!])) as Record<
      Dimension,
      CollectionEntry
    >,
    unlockedCount: entries.filter((e) => e.unlocked).length,
  };
}

export type DimensionStats = {
  dimension: Dimension;
  info: ClassInfo;
  xp: number;
  progress: LevelProgress;
  streak: Streak;
  /** Last 30 days. */
  consistency: Consistency;
  opacity: number;
};

export type QuestView = {
  quest: Quest;
  info: ClassInfo;
  done: boolean;
  streak: number;
  schedule: string;
};

/** Everything that counts toward levels: quest completions plus bonus XP. */
const allXp = (data: GameData) => [...data.completions, ...data.xpGrants];

/** All the player's XP, overall and per Path: what the World's gates check. */
export function selectXpTotals(data: GameData): { total: number; byPath: Record<Dimension, number> } {
  const xp = allXp(data);
  return { total: totalXp(xp), byPath: xpByDimension(xp) };
}

export function selectDimensionStats(data: GameData, today: string): DimensionStats[] {
  const xp = xpByDimension(allXp(data));
  const since = data.player?.onboardedAt ?? today;
  const opacity = dimOpacityByDimension(data.quests, data.completions, data.restDays, today);
  return DIMENSIONS.map((dimension) => ({
    dimension,
    info: CLASSES[dimension],
    xp: xp[dimension],
    progress: levelFromXp(xp[dimension]),
    streak: dimensionStreak(data.completions, data.restDays, data.quests, dimension, since, today),
    consistency: consistencyWindows(data.quests, data.completions, data.restDays, 30, today, dimension).current,
    opacity: opacity[dimension],
  }));
}

export type ProgressSummary = {
  daysShownUp: number;
  showUp: Streak;
  nextMilestone: number | null;
  week: { current: Consistency; previous: Consistency };
  month: { current: Consistency; previous: Consistency };
};

export function selectProgressSummary(data: GameData, today: string): ProgressSummary {
  const since = data.player?.onboardedAt ?? today;
  const days = daysShownUp(data.completions);
  return {
    daysShownUp: days,
    showUp: showUpStreak(data.completions, data.restDays, since, today),
    nextMilestone: nextMilestone(days),
    week: consistencyWindows(data.quests, data.completions, data.restDays, 7, today),
    month: consistencyWindows(data.quests, data.completions, data.restDays, 30, today),
  };
}

export type WindowComparison = {
  daysShownUp: [number, number];
  completions: [number, number];
  consistency: [Consistency, Consistency];
};

/** The last 30 days next to the 30 before them. */
export function selectMonthComparison(data: GameData, today: string): WindowComparison {
  const start = addDays(today, -29);
  const prevStart = addDays(start, -30);
  const inRange = (from: string, to: string) => data.completions.filter((c) => c.date >= from && c.date <= to);
  const current = inRange(start, today);
  const previous = inRange(prevStart, addDays(start, -1));
  const windows = consistencyWindows(data.quests, data.completions, data.restDays, 30, today);
  return {
    daysShownUp: [daysShownUp(current), daysShownUp(previous)],
    completions: [current.length, previous.length],
    consistency: [windows.current, windows.previous],
  };
}

export type CalendarDay = {
  date: string;
  /** Day of the month, 1–31. */
  day: number;
  count: number;
  rest: boolean;
  /** After today, or before the game started: nothing could happen then. */
  outside: boolean;
};

export type CalendarMonth = {
  month: string;
  title: string;
  /** Sunday-first rows; null pads the days of neighbouring months. */
  weeks: (CalendarDay | null)[][];
  /** Days shown up this month, out of the days that have happened since starting. */
  shownUp: number;
  possible: number;
  /** The first month with any play, so the calendar knows where to stop. */
  firstMonth: string;
  currentMonth: string;
};

export function selectCalendar(data: GameData, month: string, today: string): CalendarMonth {
  const counts = new Map<string, number>();
  for (const c of data.completions) counts.set(c.date, (counts.get(c.date) ?? 0) + 1);
  const rest = restDaySet(data.restDays);
  const since = data.completions.reduce((min, c) => (c.date < min ? c.date : min), data.player?.onboardedAt ?? today);
  const weeks = monthWeeks(month).map((week) =>
    week.map((date) =>
      date
        ? {
            date,
            day: Number(date.slice(8)),
            count: counts.get(date) ?? 0,
            rest: rest.has(date),
            outside: date > today || date < since,
          }
        : null,
    ),
  );
  const days = weeks.flat().filter((d): d is CalendarDay => d !== null && !d.outside);
  return {
    month,
    title: monthName(month),
    weeks,
    shownUp: days.filter((d) => d.count > 0).length,
    possible: days.length,
    firstMonth: monthOf(since),
    currentMonth: monthOf(today),
  };
}

export type MilestoneView = { days: number; reached: boolean };

export function selectMilestones(data: GameData): MilestoneView[] {
  const days = daysShownUp(data.completions);
  const next = nextMilestone(days);
  return SHOW_UP_MILESTONES.filter((m) => m <= days || m === next).map((m) => ({ days: m, reached: m <= days }));
}

export function selectOverallProgress(data: GameData): LevelProgress {
  return overallLevelFromXp(totalXp(allXp(data)));
}

function toQuestView(data: GameData, quest: Quest, today: string): QuestView {
  return {
    quest,
    info: CLASSES[quest.dimension],
    done: completionFor(data.completions, quest.id, today) !== undefined,
    streak: habitStreak(quest, data.completions, data.restDays, today),
    schedule: describeSchedule(quest.repeatDays),
  };
}

function groupByDimension(views: QuestView[]) {
  return DIMENSIONS.map((dimension) => ({
    dimension,
    info: CLASSES[dimension],
    quests: views.filter((v) => v.quest.dimension === dimension),
  })).filter((g) => g.quests.length > 0);
}

export type QuestGroup = ReturnType<typeof groupByDimension>[number];

/**
 * Today's quests as one list. Once the player has dragged them into their own
 * order, that order; until then, the order they usually do them in (learned
 * from past days only, so it shifts day to day, not mid-session). Either way,
 * quests with no place yet follow, oldest first, so new ones land at the bottom.
 */
export function selectTodayQuests(data: GameData, today: string): QuestView[] {
  const byAge = questsForDay(data.quests, today).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const views = byAge.map((q) => toQuestView(data, q, today));
  if (data.questOrder) {
    const index = new Map(data.questOrder.map((id, i) => [id, i]));
    return sortByHabitOrder(views, (v) => index.get(v.quest.id));
  }
  const order = habitOrder(data.completions, today);
  return sortByHabitOrder(views, (v) => order.get(v.quest.id));
}

export function selectAllQuestGroups(data: GameData, today: string): QuestGroup[] {
  return groupByDimension(
    data.quests.filter((q) => q.active && q.id !== TUTORIAL_QUEST_ID).map((q) => toQuestView(data, q, today)),
  );
}

export function selectRadar(data: GameData, filter: RadarFilter, today: string): RadarData {
  return radarData(data.completions, filter, today);
}

export function selectClassInfo(data: GameData): ClassInfo | null {
  return data.player ? CLASSES[data.player.classDimension] : null;
}

/** The pinned tutorial quest while onboarding is unfinished, else null. */
export function selectTutorialQuest(data: GameData, today: string): QuestView | null {
  if (!data.player || data.player.tutorialComplete) return null;
  const quest = data.quests.find((q) => q.id === TUTORIAL_QUEST_ID);
  return quest ? toQuestView(data, quest, today) : null;
}

export function selectQuest(data: GameData, id: string | undefined): Quest | null {
  return data.quests.find((q) => q.id === id) ?? null;
}

/**
 * The time the Keeper calls: learned from the player's quests when "at my
 * usual time" is on and there's enough to learn from, otherwise the set time.
 */
export function selectReminderTime(data: GameData): string | null {
  if (!data.player) return null;
  if (!data.player.smartReminders) return data.player.notificationTime;
  return usualReminderTime(data.completions);
}

/** What the Keeper's calls depend on; the clock time is added when they're planned. */
export type ReminderState = Omit<ReminderInput, 'minutesNow'>;

export function selectReminderState(data: GameData, today: string, tier: Tier = 'free'): ReminderState | null {
  const { player } = data;
  if (!player) return null;
  const collection = selectCollection(data);
  const party = new Set(Object.values(data.party));
  const woken = collection.entries.filter((e) => e.unlocked);
  const doneToday = data.completions.filter((c) => c.date === today);
  const days = daysShownUp(data.completions);
  const pathXp = xpByDimension(allXp(data));
  const paths: PathFacts[] = DIMENSIONS.map((dimension) => {
    const progress = levelFromXp(pathXp[dimension]);
    const earnedToday = doneToday.filter((c) => c.dimension === dimension).reduce((sum, c) => sum + c.xp, 0);
    const boosted = data.boosts.some((b) => b.date === today && b.dimension === dimension);
    return {
      dimension,
      name: CLASSES[dimension].className,
      nextLevel: progress.level + 1,
      xpToLevel: progress.xpForNext - progress.xpIntoLevel,
      xpPerQuestToday: xpForCompletion(earnedToday, tier, boosted),
      xpPerQuest: xpForCompletion(0, tier),
      cocoonAtNextLevel: data.nextDraw[dimension] === progress.level + 1,
    };
  });
  // Tonight's midnight played out with nothing more done today.
  const tomorrow = settleRestDays(
    { restTokens: player.restTokens, restDays: data.restDays, lastSettledDate: data.lastSettledDate },
    data.completions,
    data.quests,
    player.onboardedAt,
    addDays(today, 1),
  );
  return {
    today,
    notificationTime: selectReminderTime(data) ?? player.notificationTime,
    name: player.name,
    quests: data.quests,
    doneToday: doneToday.map((c) => c.questId),
    lastActive: data.completions.reduce<string | null>((max, c) => (max === null || c.date > max ? c.date : max), null),
    onboardedAt: player.onboardedAt,
    restTokens: player.restTokens,
    restTokensTomorrow: tomorrow.restTokens,
    restDays: data.restDays,
    streak: showUpStreak(data.completions, data.restDays, player.onboardedAt, today).current,
    daysShownUp: days,
    nextMilestone: nextMilestone(days),
    paths,
    heroes: [
      ...woken.filter((e) => party.has(e.companion.id)),
      ...woken.filter((e) => !party.has(e.companion.id)),
    ].map((e) => e.companion.name),
    sleeping: collection.entries.length - woken.length,
  };
}

export type ObjectiveView = Objective & { claimed: boolean };

export type Objectives = {
  daily: ObjectiveView[];
  weekly: ObjectiveView[];
  /** Finished but not yet claimed, for the tab badge. */
  unclaimed: number;
  /** Paths with double XP for the rest of today. */
  boosted: Dimension[];
};

export function selectObjectives(data: GameData, today: string): Objectives {
  const view = (o: Objective): ObjectiveView => ({ ...o, claimed: data.claimed.includes(o.id) });
  const daily = data.player
    ? dailyObjectives(data.quests, data.completions, today, data.player.classDimension).map(view)
    : [];
  const weekly = data.player ? weeklyObjectives(data.quests, data.completions, today).map(view) : [];
  return {
    daily,
    weekly,
    unclaimed: [...daily, ...weekly].filter((o) => isObjectiveDone(o) && !o.claimed).length,
    boosted: data.boosts.filter((b) => b.date === today).map((b) => b.dimension),
  };
}

/** What the Keeper knows about you when you talk to him in the Archive (see keeper-talk.ts). */
export function selectKeeperFacts(data: GameData, today: string): KeeperFacts | null {
  const { player } = data;
  if (!player) return null;
  const collection = selectCollection(data);
  const hero = (e: CollectionEntry): KeeperHero => ({
    name: e.companion.name,
    level: e.progress.level,
    path: CLASSES[e.companion.dimension].className,
    dimension: e.companion.dimension,
  });
  const summary = selectProgressSummary(data, today);
  // A Path slips when at least a few of its quests were due and under half got done.
  const dusty = selectDimensionStats(data, today)
    .filter((d) => d.consistency.due >= 3 && (d.consistency.rate ?? 1) < 0.5)
    .sort((a, b) => (a.consistency.rate ?? 1) - (b.consistency.rate ?? 1))[0];
  return {
    today,
    name: player.name,
    streak: summary.showUp.current,
    best: summary.showUp.best,
    week: summary.week,
    party: DIMENSIONS.map((d) => hero(collection.party[d])),
    bench: collection.entries.filter((e) => e.unlocked && !e.inParty).map(hero),
    dusty: dusty ? { path: dusty.info.className, hero: collection.party[dusty.dimension].companion.name } : null,
  };
}
