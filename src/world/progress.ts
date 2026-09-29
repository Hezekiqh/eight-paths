import {
  BASE_XP,
  CLASSES,
  levelFromXp,
  overallLevelFromXp,
  tasksToNextOverallLevel,
  xpToNextLevel,
  type Dimension,
} from '@/game';

import type { Facing, MapId } from './maps';

// The World's only gates are the player's real levels (WORLDS.md): the road
// onward opens with the overall level, and hard-to-reach places need a Path
// level. This file says what each way out needs, and how far off the player is,
// counted in real habits.

export type Requirement =
  | { kind: 'overall'; level: number }
  | { kind: 'path'; dimension: Dimension; level: number }
  /** Any one Path at this level: "level up once, any way you like". */
  | { kind: 'anyPath'; level: number };

export type Arrival = { map: MapId; x: number; y: number; facing: Facing };

export type Exit = {
  id: string;
  /** The map it leads out of. */
  from: MapId;
  /** Its tile letter in that map. */
  tile: string;
  /** What the player calls it (never the name of where it goes: that's for finding out). */
  label: string;
  /** Where you step out, in tiles; null while that area is still being built. */
  to: Arrival | null;
  needs: Requirement;
  /** The way back to somewhere you've been: never a gate, so it isn't listed as a goal. */
  back?: boolean;
};

/**
 * The Archive's door opens the first time any Path levels up (everyone starts
 * at Lv 5): one habit, the first "LEVELED UP!" a new player sees.
 */
export const ARCHIVE_DOOR_LEVEL = 6;

/**
 * After the door, the main road opens every 3 overall levels (author, Sep 29,
 * 2026): the road east at 9, then (as they're built) Plush at 12, the kingdom
 * at 15, the king at 18, and the end of Season 1 at 20. Overall, so any habit counts.
 */
export const ROAD_ONWARD_LEVEL = 9;

/**
 * Season 1 ends at this overall level (author, Sep 29, 2026): about 35 habits
 * of any kind. Later kingdoms arrive as new seasons, each with its own finish.
 */
export const FINAL_GOAL: Requirement = { kind: 'overall', level: 20 };

export const EXITS: Exit[] = [
  {
    id: 'archive-door',
    from: 'archive',
    tile: '=',
    label: 'The great door',
    to: { map: 'courier-road', x: 12, y: 2, facing: 'down' },
    needs: { kind: 'anyPath', level: ARCHIVE_DOOR_LEVEL },
  },
  {
    id: 'road-archive',
    from: 'courier-road',
    tile: '=',
    label: 'The Archive door',
    to: { map: 'archive', x: 12, y: 11, facing: 'up' },
    needs: { kind: 'overall', level: 0 },
    back: true,
  },
  {
    id: 'road-onward',
    from: 'courier-road',
    tile: '>',
    label: 'The road east',
    to: null,
    needs: { kind: 'overall', level: ROAD_ONWARD_LEVEL },
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
  // For "any Path", the Path closest to levelling counts.
  const pathXp = needs.kind === 'path' ? xp.byPath[needs.dimension] : Math.max(0, ...Object.values(xp.byPath));
  const progress = overall ? overallLevelFromXp(xp.total) : levelFromXp(pathXp);
  const xpFor = overall ? (l: number) => tasksToNextOverallLevel(l) * BASE_XP : xpToNextLevel;
  const left = xpToReach(progress.level, progress.xpIntoLevel, needs.level, xpFor);
  const whole = xpToReach(overallLevelFromXp(0).level, 0, needs.level, xpFor);
  return {
    met: progress.level >= needs.level,
    have: progress.level,
    need: needs.level,
    habitsLeft: Math.ceil(left / BASE_XP),
    className: needs.kind === 'path' ? CLASSES[needs.dimension].className : null,
    fraction: whole === 0 ? 1 : Math.min(1, 1 - left / whole),
  };
}

/** What a requirement is, in a few words: "Overall Lv 12" or "Warrior Lv 10". */
export function describeRequirement(needs: Requirement): string {
  if (needs.kind === 'overall') return `Overall Lv ${needs.level}`;
  if (needs.kind === 'anyPath') return 'Level up once';
  return `${CLASSES[needs.dimension].className} Lv ${needs.level}`;
}

/** What to do about it, in real life: "Finish about 6 more habits. Any habit counts." */
export function howToProgress(s: Standing): string {
  if (s.met) return 'You have the strength. It will open.';
  const plural = s.habitsLeft === 1 ? '' : 's';
  return s.className
    ? `Finish about ${s.habitsLeft} more ${s.className} habit${plural}.`
    : `Finish about ${s.habitsLeft} more habit${plural}. Any habit counts.`;
}
