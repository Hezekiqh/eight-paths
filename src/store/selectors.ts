import {
  CLASSES,
  DIMENSIONS,
  SHOW_UP_MILESTONES,
  TUTORIAL_QUEST_ID,
  addDays,
  completionFor,
  consistencyWindows,
  daysShownUp,
  nextMilestone,
  questsDueOn,
  restDaySet,
  showUpStreak,
  describeSchedule,
  dimOpacityByDimension,
  dimensionStreak,
  habitStreak,
  levelFromXp,
  overallLevelFromXp,
  questsForDay,
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
} from '@/game';

import type { GameData } from './index';

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
  /** Done on the day being viewed (today, or yesterday while backfilling). */
  done: boolean;
  streak: number;
  schedule: string;
};

export function selectDimensionStats(data: GameData, today: string): DimensionStats[] {
  const xp = xpByDimension(data.completions);
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

export type HistoryDay = {
  date: string;
  count: number;
  rest: boolean;
  /** After today, or before the game started. */
  outside: boolean;
};

/** `weeks` full weeks (Sunday to Saturday) ending with the current one. */
export function selectHistory(data: GameData, today: string, weeks: number): HistoryDay[][] {
  const counts = new Map<string, number>();
  for (const c of data.completions) counts.set(c.date, (counts.get(c.date) ?? 0) + 1);
  const rest = restDaySet(data.restDays);
  const since = data.completions.reduce((min, c) => (c.date < min ? c.date : min), data.player?.onboardedAt ?? today);
  const weekday = new Date(`${today}T12:00:00`).getDay();
  const firstSunday = addDays(today, -weekday - 7 * (weeks - 1));
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = addDays(firstSunday, w * 7 + d);
      return { date, count: counts.get(date) ?? 0, rest: rest.has(date), outside: date > today || date < since };
    }),
  );
}

export type MilestoneView = { days: number; reached: boolean };

export function selectMilestones(data: GameData): MilestoneView[] {
  const days = daysShownUp(data.completions);
  const next = nextMilestone(days);
  return SHOW_UP_MILESTONES.filter((m) => m <= days || m === next).map((m) => ({ days: m, reached: m <= days }));
}

export function selectOverallProgress(data: GameData): LevelProgress {
  return overallLevelFromXp(totalXp(data.completions));
}

function toQuestView(data: GameData, quest: Quest, today: string, day = today): QuestView {
  return {
    quest,
    info: CLASSES[quest.dimension],
    done: completionFor(data.completions, quest.id, day) !== undefined,
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

export function selectTodayQuestGroups(data: GameData, today: string): QuestGroup[] {
  return groupByDimension(questsForDay(data.quests, today).map((q) => toQuestView(data, q, today)));
}

/** Quests that were due yesterday, for logging them late. */
export function selectYesterdayQuestGroups(data: GameData, today: string): QuestGroup[] {
  const yesterday = addDays(today, -1);
  return groupByDimension(questsDueOn(data.quests, yesterday).map((q) => toQuestView(data, q, today, yesterday)));
}

export function selectAllQuestGroups(data: GameData, today: string): QuestGroup[] {
  return groupByDimension(
    data.quests
      .filter((q) => q.active && q.id !== TUTORIAL_QUEST_ID)
      .map((q) => toQuestView(data, q, today)),
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

export function selectPlayedToday(data: GameData, today: string): boolean {
  return data.completions.some((c) => c.date === today);
}
