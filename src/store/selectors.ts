import {
  CLASSES,
  DIMENSIONS,
  TUTORIAL_QUEST_ID,
  completionFor,
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
  type Dimension,
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
  streak: number;
  opacity: number;
};

export type QuestView = {
  quest: Quest;
  info: ClassInfo;
  doneToday: boolean;
  streak: number;
  schedule: string;
};

export function selectDimensionStats(data: GameData, today: string): DimensionStats[] {
  const xp = xpByDimension(data.completions);
  const since = data.player?.onboardedAt ?? today;
  const opacity = dimOpacityByDimension(data.completions, since, today);
  return DIMENSIONS.map((dimension) => ({
    dimension,
    info: CLASSES[dimension],
    xp: xp[dimension],
    progress: levelFromXp(xp[dimension]),
    streak: dimensionStreak(data.completions, data.restDays, dimension, today),
    opacity: opacity[dimension],
  }));
}

export function selectOverallProgress(data: GameData): LevelProgress {
  return overallLevelFromXp(totalXp(data.completions));
}

function toQuestView(data: GameData, quest: Quest, today: string): QuestView {
  return {
    quest,
    info: CLASSES[quest.dimension],
    doneToday: completionFor(data.completions, quest.id, today) !== undefined,
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
