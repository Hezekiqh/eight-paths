import type { Dimension } from '@/game';

import type { MapId } from './maps';
import type { Arrival, Requirement } from './progress';

// Felix's boulder maze, between the Courier Road and the deserters' camp
// (author, Oct 3, 2026). Anyone can solve it; push a boulder the wrong way and
// you're stuck, so you walk back out to the road and in again, which puts every
// boulder back. A Mage of Lv 6 sees a hidden passage instead: it leads to the
// Mirror Room, where the Keeper waits, and its green candle sets you down past
// the maze. Either way you walk into Felix framing you to the king's guards.

export const MAZE = 'felix-maze';
/** Set once you're past the boulders (or the guards took you): they stay rolled aside after that. */
export const MAZE_SOLVED = 'felix-maze-solved';
/** The guard scene is over, however it went: Felix and the guards are gone. */
export const FRAMED = 'felix-framed';
/** You promised the guards a drink. They'll remember. */
export const OWES_GUARDS = 'owes-guards-a-drink';
/** "What king?": you were thrown in the dungeon, next to Brannoc. */
export const JAILED = 'jailed-with-brannoc';
/** You've come to in the cell (said once). */
export const JAIL_WOKE = 'jail-woke';

/** The tree that hides the passage, and the tile you step onto past the maze (where the scene starts). */
export const PASSAGE_TILE = 'Z';
export const CLEARING_TILE = 'X';
/** The green candle in the Mirror Room. */
export const GREEN_CANDLE = 'g';

/** Intellect (the Mage's Path) to notice the passage. */
export const PASSAGE: Requirement = { kind: 'path', dimension: 'intellectual', level: 6 };
/** The level each clever answer to the guards needs. */
export const ANSWER_LEVEL = 10;

export const INTO_MIRROR_ROOM: Arrival = { map: 'mirror-room', x: 6, y: 6, facing: 'up' };
/** Out of the green candle: in front of Felix and the guards, one tile between you and him. */
export const PAST_THE_MAZE: Arrival = { map: 'felix-maze', x: 22, y: 4, facing: 'right' };
/** Under the guards' stair: the guards march you down to the cell from here (dungeon.ts). */
export const INTO_THE_CELL: Arrival = { map: 'kingdom-dungeon', x: 21, y: 3, facing: 'down' };

/**
 * Ways between places that aren't doors: the hidden passage (a Mage of Lv 6),
 * the green candle, and the guards' "What king?" (any answer can be the wrong one).
 */
export const SIDE_WAYS: { from: MapId; tile: string; to: Arrival }[] = [
  { from: 'felix-maze', tile: PASSAGE_TILE, to: INTO_MIRROR_ROOM },
  { from: 'mirror-room', tile: GREEN_CANDLE, to: PAST_THE_MAZE },
  { from: 'felix-maze', tile: CLEARING_TILE, to: INTO_THE_CELL },
];

/** Where the boulders end up once the maze is solved, so the road stays open both ways. */
export const CLEARED_BOULDERS: [number, number][] = [
  [10, 2],
  [18, 2],
  [16, 3],
  [17, 4],
  [7, 7],
  [11, 7],
];

/** The boulders are rolled aside: solved, or you've already been beyond (a save from before the maze). */
export const mazeCleared = (flags: string[], discovered: string[]) =>
  flags.includes(MAZE_SOLVED) || discovered.includes('deserters-camp');

/** The guards are waiting with Felix: he's out of his cocoon, and it hasn't happened yet. */
export const scenePending = (flags: string[]) => flags.includes('felix-hatched') && !flags.includes(FRAMED);

export const PASSAGE_LINES = {
  // thoughts, in brackets: the player never says anything out loud except through a choice
  notice: ["(What's that?)"],
  found: ["(It's a hidden passage!)", 'Take it?'],
  plain: ['Old trees, packed close.'],
};

/** The Keeper, as you touch the green flame. */
export const KEEPER_PARTING = [
  'THE KEEPER: Wait...',
  'THE KEEPER: Remember. You can do whatever you want in the Other World...',
  'THE KEEPER: But you are the grand sum of your good and bad deeds...',
  'THE KEEPER: People will remember your actions, too...',
  'THE KEEPER: Ta-ta for now.',
  'The green flame swallows the room.',
];

export const SCENE_OPEN = [
  'FELIX: That one, sir! That is the one plotting to take the throne!',
  "You have no idea what's happening.",
  "GUARD: Is this true? Here, it's guilty until proven innocent! Explain yourself.",
];

export type Answer = {
  label: string;
  /** The Path and level it takes (null: anyone can say it). */
  path: Dimension | null;
  lines: string[];
  /** Story flags it sets, beyond FRAMED. */
  sets?: string[];
  /** Thrown in the dungeon instead of let go. */
  jailed?: boolean;
};

/** The guards' question: three clever answers (Lv 10 in their Path, greyed out until then), a bribe anyone can make, and the wrong one. */
export const ANSWERS: Answer[] = [
  {
    label: 'Warrior: "Say that again. Slower."',
    path: 'physical',
    lines: [
      'You crack your knuckles. Then your neck. Then, somehow, a nearby log.',
      'GUARD: ...Right. Well. Nobody\'s accusing anybody of anything. Carry on, citizen.',
    ],
  },
  {
    label: 'Mage: "Plots take weeks. I woke up today."',
    path: 'intellectual',
    lines: [
      "You explain: you've been awake a matter of days, you don't know where the throne is, and you'd need a map, a plan, and allies, which you also don't have.",
      'GUARD: ...That is a very good point.',
      'GUARD: He does have a lot of maps, though. The mustache one.',
    ],
  },
  {
    label: 'Bard: "Take a throne? I can\'t even take a compliment."',
    path: 'social',
    lines: [
      'The guards look at each other. One of them snorts.',
      'GUARD: Ha! Can\'t take a compliment. That\'s good. I\'m stealing that.',
      'GUARD: Go on, get out of here.',
    ],
  },
  {
    label: '"I\'ll buy you both a drink later."',
    path: null,
    lines: [
      'GUARD: ...A drink?',
      "GUARD: Now you're talking. The Candle Inn, when you're in town. Don't forget.",
      'GUARD: You owe us.',
    ],
    sets: [OWES_GUARDS],
  },
  {
    label: '"What king?"',
    path: null,
    lines: ['GUARD: Do not insult our lord! Seize them!', 'Rough hands. A sack over your head. A long, bumpy walk.'],
    sets: [JAILED],
    jailed: true,
  },
];

/** Felix, let off the hook: then he laughs, and he's gone. */
export const FELIX_FOILED = [
  'FELIX: What? No! You were meant to be outraged! Dragged off! Weeping!',
  'FELIX: Hmph. Fine. FINE. This round is yours, mon ami.',
  'FELIX: But my next trap? Magnifique. Truly. You will see. Au revoir!',
];

