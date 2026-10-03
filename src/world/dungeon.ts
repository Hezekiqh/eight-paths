import type { Actor } from './march';
import type { Arrival, Requirement } from './progress';

// The Kingdom Dungeon (author, Oct 3, 2026), under the Kaldorium: thrown in by Felix's guards,
// you're marched down to a cell where Brannoc is cowering in the corner. Ask him to break out
// and a mouse squeaks: he bolts straight through the bars and up the ladder. Gary, the one guard
// left (the rest are at the Kaldorium for the big fight), sees it and decides he didn't.

/** He's gone through the bars: they're bent open (also a job anyone can do at the bars, see jobs.ts). */
export const BARS_BENT = 'cell-bars-bent';
/** You asked Brannoc to break out: once the talk ends, the mouse. */
export const BRANNOC_BOLTS = 'brannoc-bolts';

/** The guards' row in the walker sheet is looked up by the caller; these are the paths, in tiles. */
const DOOR = [21, 2] as [number, number];
/** Under the guards' stair, where you arrive: the march starts here. */
export const ESCORT_START = { x: 21, y: 3 };

/** Down from the guards' stair and along the corridor to the cell door: a guard ahead, you, a guard behind. */
export const escortIn = (guard: number): Actor[] => [
  { row: guard, path: [[21, 4], [21, 6], [5, 6]], face: 1 },
  { row: -1, path: [[21, 3], [21, 6], [6, 6]], face: 1 },
  { row: guard, path: [DOOR, [21, 6], [7, 6]], face: 1 },
];

/** The cell door open (tile 4, at 6, 5): you're shoved in. */
export const CELL_DOOR = { x: 6, y: 5 };
export const shovedIn = (guard: number): Actor[] => [
  { row: guard, path: [[5, 6]], face: 1 },
  { row: -1, path: [[6, 6], [6, 4]], face: 0 },
  { row: guard, path: [[7, 6]], face: 1 },
];

/** CLANG. They stomp back up the stair. */
export const guardsLeave = (guard: number): Actor[] => [
  { row: guard, path: [[5, 6], [21, 6], DOOR] },
  { row: -1, path: [[6, 4]], face: 0 },
  { row: guard, path: [[7, 6], [21, 6], DOOR] },
];

export const ESCORT_LINES = {
  door: ['GUARD: In you go.'],
  // after the door slams and the guards have gone
  cell: [
    'CLANG.',
    'Stone walls. Iron bars. Straw that smells of other people.',
    'In the corner, someone is trying very hard to look like part of the wall.',
  ],
  // walking as Brannoc himself: nobody in the corner but you
  alone: ['CLANG.', 'Stone walls. Iron bars. Straw that smells of other people.'],
};

/** Brannoc, out of the corner: past you, through the bars, along the corridor and up the ladder. */
export const brannocBolts = (brannoc: number): Actor[] => [
  { row: brannoc, path: [[2, 4], [5, 4], [5, 5], [5, 6], [20, 6], [20, 8]] },
  { row: -1, path: [[6, 4]], face: 2 },
];

/** Gary, at his table, as Brannoc goes by. */
export const GARY_STARTLED = [
  'GARY: !',
  'GARY: ...',
  "GARY: I didn't see that.",
  "GARY: I don't get paid enough to have seen that.",
];

// ---- Up the ladder, into the Kaldorium (author, Oct 3, 2026). Brannoc got there first, and the guards
// have him. He faints. Five guards, then the warden, who can't be hurt: twenty strikes and he hasn't
// noticed. Then Brannoc gets up, fast asleep, a snot bubble swelling and shrinking, and swings.
// Walking as Brannoc yourself, you faint at the sight of the warden, and you do the swing.

/** The prison route: you came up from the cells (or walked in after), and the warden isn't beaten yet. */
export const prisonRoute = (map: string, flags: string[]) =>
  map === 'the-pit' && flags.includes(BARS_BENT) && !flags.includes('pit-champion');

/** Strikes the warden shrugs off before Brannoc's swing ends it (he has 30; he never gets near 0). */
export const WARDEN_SHRUGS = 20;
/** Brannoc's answer at the end: either way the scene's over, so he's gone from the sand. */
export const BRANNOC_WOKE = 'brannoc-woke';
/** You said no: he's back sulking in his cell, waiting for you to ask again. */
export const BRANNOC_DECLINED = 'brannoc-declined';
/** You said yes (here, or back in the cell later). */
export const BRANNOC_JOINED = 'brannoc-joined';

/** Where you meet Brannoc and he can join you (said yes to): the cell, the Kaldorium sand, his cell again. */
export const BRANNOC_SCENES = ['brannoc-cell', 'brannoc-awake', 'brannoc-sulk'];

/** Where Brannoc lies, fainted, just off the ladder; and where he walks to swing. */
export const BRANNOC_FAINTED: [number, number] = [4, 9];
const UNDER_WARDEN: [number, number] = [10, 6];

export const PRISON_INTROS: Record<string, { speaker?: string; lines: string[] }> = {
  'pit-guards': {
    lines: [
      'GUARD: STOP RIGHT THERE!',
      "Brannoc, halfway across the sand, freezes. He goes white. Then grey. Then he faints, flat on his back, right in front of you.",
      'BARNABY: WELL, WELL! An ESCAPE! The crowd LOVES an escape!',
      "BARNABY: In this corner: one escapee, upright! One escapee, not! In the other: FIVE OF THE KING'S OWN! FIGHT!",
    ],
  },
  'pit-warden': {
    lines: [
      'The floor shakes. Then it shakes again.',
      'BARNABY: Oh, you have done it now. Everybody, please welcome... THE WARDEN!',
      "BARNABY: Nobody's ever hurt him. Nobody's ever hurt his feelings either. Mostly because he hasn't got any. FIGHT!",
    ],
  },
  // walking as Brannoc: nobody on the sand but you
  'pit-guards-alone': {
    lines: [
      'GUARD: STOP RIGHT THERE!',
      'BARNABY: WELL, WELL! An ESCAPE! The crowd LOVES an escape!',
      "BARNABY: In the other corner: FIVE OF THE KING'S OWN! FIGHT!",
    ],
  },
};

/** The fifth guard down: the warden's coming (as the front-door fight, but Brannoc is still out cold). */
export const PRISON_GUARDS_DOWN = [
  'The fifth guard hits the sand.',
  'Behind you, Brannoc snores.',
  'Then the floor shakes. Something very big is walking up the tunnel.',
];

/** Twenty strikes in: the warden yawns, raises his club, and Brannoc gets up. */
export const SNOT_SWING = [
  "Twenty strikes. The warden hasn't noticed a single one.",
  'He yawns. He raises his club.',
  'Behind you: a snore. A big one.',
];
/** Brannoc walks to the warden, asleep, then swings. */
export const brannocSleepwalks = (brannoc: number): Actor[] => [
  { row: brannoc, path: [BRANNOC_FAINTED, [10, 9], UNDER_WARDEN], face: 1 },
];
export const SNOT_SWING_HIT = [
  "Brannoc is on his feet. His eyes are shut. A snot bubble swells from his nose, and shrinks, and swells.",
  'He lifts his sword.',
  'BRANNOC: Zzz... five more minutes...',
  'BRANNOC SUPER SUPER SWING!',
  'The warden goes up, up, over the banners, and out of the Kaldorium. Somewhere in town, a roof gives way.',
  'Silence.',
  "GUARD: Whoa. Whoa, whoa, whoa. Okay. You're good. You're good to go.",
  "GUARD: We won't bother you any more. Strength is valued more than anything here.",
  "GUARD: We don't get paid enough for this.",
];

/** Brannoc wakes: will you pair up? */
export const BRANNOC_OFFER = [
  'The snot bubble pops. Brannoc blinks.',
  'BRANNOC: Whoa. Where am I?',
  'He looks around. At the crowd. At the hole in the banners. At you.',
  "BRANNOC: Whoa. Did YOU do that? You're incredibly strong.",
  'BRANNOC: Do you mind if we pair up? I have no idea what is going on here. If I stuck by you, I might make it out of this.',
  "BRANNOC: I'm not very strong. But I'll offer you my sword.",
];
/** Coming down from the top as the Kaldorium's champion: Brannoc's heard. No mouse needed. */
export const CHAMPION_IN_CELL = [
  'BRANNOC: Wait. Wait wait wait. You beat the warden?',
  "BRANNOC: Everyone's talking about it. Even Gary woke up for it.",
  "BRANNOC: Do you mind if we pair up? I'm not very strong. But I'll offer you my sword.",
];
export const BRANNOC_YES = ['BRANNOC: Really? REALLY? Okay! Okay. I won\'t let you down. Probably.', 'Brannoc joins you.'];
export const BRANNOC_NO = ['BRANNOC: Oh.', 'BRANNOC: No, that\'s... that\'s fine. That\'s fine.', 'He shuffles off, very slowly, the way you came.'];
/** Back to the ladder, very slowly. */
export const brannocShuffles = (brannoc: number): Actor[] => [
  { row: brannoc, path: [UNDER_WARDEN, [10, 9], [3, 9], [2, 9]] },
];

/** Walking as Brannoc: the warden drops in, and you faint at the sight of him. */
export const ALONE_WARDEN = [
  'The floor shakes. Then it shakes again.',
  'BARNABY: Oh, you have done it now. Everybody, please welcome... THE WARDEN!',
  'He is enormous. He is right in front of you. He smiles.',
  'You go white. Then grey.',
  '...',
  'BRANNOC SUPER SUPER SWING!',
  '...',
  'You wake up on the sand. Your sword is in your hand. There is a warden-shaped hole in the banners.',
  'GUARD: Hey. Hey, buddy. We don\'t want any smoke with you.',
  "GUARD: You're free to leave. Please leave.",
  'You have no idea what just happened.',
];

// ---- The Maze Ward (author, Oct 3, 2026): three mazes, each with a hole in the wall by its way in
// that skips it. They look like plain wall; a Mage sees them twinkle, one at Lv 6, two at Lv 8, all
// three at Lv 10. Brannoc made them, running: they're Brannoc-shaped. Walking as Brannoc yourself,
// they're just hidden passages (he hasn't run through anything yet).

export type MazeHole = { tile: string; needs: Requirement; to: Arrival };

const MAGE = (level: number): Requirement => ({ kind: 'path', dimension: 'intellectual', level });

export const MAZE_HOLES: MazeHole[] = [
  { tile: '6', needs: MAGE(6), to: { map: 'dungeon-mazes', x: 16, y: 6, facing: 'right' } },
  { tile: '8', needs: MAGE(8), to: { map: 'dungeon-mazes', x: 30, y: 8, facing: 'right' } },
  { tile: '0', needs: MAGE(10), to: { map: 'dungeon-mazes', x: 42, y: 2, facing: 'down' } },
];

/** What your hero thinks at a twinkling hole. */
export const holeLines = (asBrannoc: boolean) =>
  asBrannoc
    ? ["(What's that?)", "(It's a hidden passage!)", 'Take it?']
    : ["(What's that?)", "(It's a hole in the wall. It is exactly Brannoc-shaped.)", 'Take it?'];
