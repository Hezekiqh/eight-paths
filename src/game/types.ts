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
  classDimension: Dimension;
  restTokens: number;
  onboardedAt: string;
  tutorialComplete: boolean;
  notificationTime: string;
};

export type Quest = {
  id: string;
  title: string;
  dimension: Dimension;
  repeatDays: number[];
  active: boolean;
  createdAt: string;
  /** Date key the quest was archived; days from then on no longer count as due. */
  archivedAt?: string;
};

export type Completion = {
  id: string;
  questId: string;
  dimension: Dimension;
  date: string;
  xp: number;
  /** Who was in this Path's party slot, and so earned the XP as well. */
  characterId?: string;
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
