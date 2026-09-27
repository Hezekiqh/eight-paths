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
};

export type RestDay = { date: string; dimension: Dimension | 'all' };
