import type { CharacterId } from '@/story/companions';
export const DIMENSIONS = [
  'physical',
  'financial',
  'intellectual',
  'spiritual',
  'emotional',
  'social',
  'occupational',
  'environmental',
] as const;

export type Dimension = (typeof DIMENSIONS)[number];

export type Player = {
  name: string;
  /**
   * Who the player woke as: their answer to the Keeper's "Which hero do you look
   * like?" (one of STARTERS). Unset until asked, on the first trip into the
   * Other World. It wakes with the first habit and never changes.
   */
  origin?: CharacterId;
  classDimension: Dimension;
  restTokens: number;
  onboardedAt: string;
  tutorialComplete: boolean;
  notificationTime: string;
  /** Vibration on taps, typing and level-ups. */
  hapticsEnabled: boolean;
  /** Objectives tab turns sideways like a handheld console; upright by default. */
  objectivesLandscape: boolean;
  /** The Keeper calls at the player's usual time, learned from their quests, instead of `notificationTime`. */
  smartReminders: boolean;
  /** Calls during the day while habits are left: noon and 9 PM, plus check-ins every few hours, or off. */
  dayReminders: DayReminders;
};

/** "bookends" is noon and 9 PM only; a number adds a check-in that many hours apart in between. */
export const DAY_REMINDERS = ['off', 'bookends', '4', '2', '1'] as const;
export type DayReminders = (typeof DAY_REMINDERS)[number];

export type Quest = {
  id: string;
  title: string;
  dimension: Dimension;
  repeatDays: number[];
  active: boolean;
  createdAt: string;
  /** Date key the quest was archived; days from then on no longer count as due. */
  archivedAt?: string;
  /** Date keys the player skipped it: those days it isn't due at all. */
  skippedOn?: string[];
};

export type Completion = {
  id: string;
  questId: string;
  dimension: Dimension;
  date: string;
  xp: number;
  /** Who was in this Path's party slot, and so earned the XP as well. */
  characterId?: string;
  /** Local minutes since midnight when it was done. Missing on completions from before v9. */
  at?: number;
};

export type RestDay = { date: string; dimension: Dimension | 'all' };

/** XP that didn't come from a quest: objective drops and finished goals. */
export type XpGrant = {
  id: string;
  date: string;
  dimension: Dimension;
  xp: number;
  characterId?: string;
  source: 'drop' | 'goal';
};

/** Double XP on one Path for the rest of `date`. */
export type Boost = { date: string; dimension: Dimension };

/** A goal the player wrote for themselves. */
export type Goal = {
  id: string;
  title: string;
  /** The Path it belongs to; finishing it earns XP there. */
  dimension?: Dimension;
  dueDate?: string;
  createdAt: string;
  completedAt?: string;
};
