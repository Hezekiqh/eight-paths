import {
  BASE_XP,
  CLASSES,
  levelFromXp,
  overallLevelFromXp,
  tasksToNextOverallLevel,
  xpToNextLevel,
  type Dimension,
} from '@/game';

import type { MapId } from './maps';

// The World's only gates are the player's real levels (WORLDS.md): the road
// onward opens with the overall level, and hard-to-reach places need a Path
// level. This file says what each way out needs, and how far off the player is,
// counted in real habits.

export type Requirement = { kind: 'overall'; level: number } | { kind: 'path'; dimension: Dimension; level: number };

export type Exit = {
  id: string;
  /** The map it leads out of. */
  from: MapId;
  /** Its tile letter in that map. */
  tile: string;
  /** What the player calls it (never the name of where it goes: that's for finding out). */
  label: string;
  /** Where it leads; null while that area is still being built. */
  to: string | null;
  needs: Requirement;
};

/** The Archive's door opens onto the world once the player has levelled up once (everyone starts at Lv 5). */
export const ARCHIVE_DOOR_LEVEL = 6;

export const EXITS: Exit[] = [
  {
    id: 'archive-door',
    from: 'archive',
    tile: '=',
    label: 'The great door',
    to: null,
    needs: { kind: 'overall', level: ARCHIVE_DOOR_LEVEL },
  },
];

export type XpTotals = { total: number; byPath: Record<Dimension, number> };

export type Standing = {
  met: boolean;
  /** The player's level now, and the level needed. */
  have: number;
  need: number;
  /** Roughly how many more habits it takes, at the standard XP per habit. */
  habitsLeft: number;
  /** The class whose habits count (null: any habit counts). */
  className: string | null;
  /** How far along, 0 to 1, from where this level ladder starts. */
  fraction: number;
};

/** XP still needed to climb from `progress` to `target`, one level at a time. */
function xpToReach(level: number, xpIntoLevel: number, target: number, xpFor: (level: number) => number): number {
  let xp = -xpIntoLevel;
  for (let l = level; l < target; l++) xp += xpFor(l);
  return Math.max(0, xp);
}

/** Where the player stands against a requirement. */
export function standing(needs: Requirement, xp: XpTotals): Standing {
  const overall = needs.kind === 'overall';
  const progress = overall ? overallLevelFromXp(xp.total) : levelFromXp(xp.byPath[needs.dimension]);
  const xpFor = overall ? (l: number) => tasksToNextOverallLevel(l) * BASE_XP : xpToNextLevel;
  const left = xpToReach(progress.level, progress.xpIntoLevel, needs.level, xpFor);
  const whole = xpToReach(overallLevelFromXp(0).level, 0, needs.level, xpFor);
  return {
    met: progress.level >= needs.level,
    have: progress.level,
    need: needs.level,
    habitsLeft: Math.ceil(left / BASE_XP),
    className: overall ? null : CLASSES[needs.dimension].className,
    fraction: whole === 0 ? 1 : Math.min(1, 1 - left / whole),
  };
}

/** What a requirement is, in a few words: "Overall Lv 12" or "Warrior Lv 10". */
export function describeRequirement(needs: Requirement): string {
  return needs.kind === 'overall'
    ? `Overall Lv ${needs.level}`
    : `${CLASSES[needs.dimension].className} Lv ${needs.level}`;
}

/** What to do about it, in real life: "Finish about 6 more habits. Any habit counts." */
export function howToProgress(s: Standing): string {
  if (s.met) return 'You have the strength. It will open.';
  const plural = s.habitsLeft === 1 ? '' : 's';
  return s.className
    ? `Finish about ${s.habitsLeft} more ${s.className} habit${plural}.`
    : `Finish about ${s.habitsLeft} more habit${plural}. Any habit counts.`;
}
