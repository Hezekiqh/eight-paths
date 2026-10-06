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

/** At the foot of the guards' stair, before the march: a guard either side of you, standing. */
export const escortStand = (guard: number): Actor[] => [
  { row: guard, path: [[21, 4]], face: 1 },
  { row: -1, path: [[21, 3]], face: 0 },
  { row: guard, path: [DOOR], face: 0 },
];

/** Down from the guards' stair and along the corridor to the cell door: a guard ahead, you, a guard behind. */
export const escortIn = (guard: number): Actor[] => [
  {
    row: guard,
    path: [
      [21, 4],
      [21, 6],
      [5, 6],
    ],
    face: 1,
  },
  {
    row: -1,
    path: [
      [21, 3],
      [21, 6],
      [6, 6],
    ],
    face: 1,
  },
  { row: guard, path: [DOOR, [21, 6], [7, 6]], face: 1 },
];

/** The cell door open (tile 4, at 6, 5): you're shoved in. */
export const CELL_DOOR = { x: 6, y: 5 };
export const shovedIn = (guard: number): Actor[] => [
  { row: guard, path: [[5, 6]], face: 1 },
  {
    row: -1,
    path: [
      [6, 6],
      [6, 4],
    ],
    face: 0,
  },
  { row: guard, path: [[7, 6]], face: 1 },
];

/** CLANG. They stomp back up the stair. */
export const guardsLeave = (guard: number): Actor[] => [
  { row: guard, path: [[5, 6], [21, 6], DOOR] },
  { row: -1, path: [[6, 4]], face: 0 },
  { row: guard, path: [[7, 6], [21, 6], DOOR] },
];

export const ESCORT_LINES = {
  // at the foot of the guards' stair, before they march you down
  start: ['GUARD: Walk. And no plotting.'],
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
  {
    row: brannoc,
    path: [
      [2, 4],
      [5, 4],
      [5, 5],
      [5, 6],
      [20, 6],
      [20, 8],
    ],
  },
  { row: -1, path: [[6, 4]], face: 2 },
];

/** Gary, at his table, as Brannoc goes by. */
export const GARY_STARTLED = [
  'GARY: ...',
  'GARY: I did not see that.',
  'GARY: ... I do not get paid enough to have seen that.',
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
// (the Colosseum, author, Oct 6, 2026: a wide oval of sand; you come up through the trapdoor at its bottom left,
// and Brannoc is three tiles on, room enough to faint without landing on you)
export const BRANNOC_FAINTED: [number, number] = [11, 14];
const UNDER_WARDEN: [number, number] = [15, 10];
/** The middle of the sand, on the way from the trapdoor to the gate. */
export const SAND_MIDDLE: [number, number] = [15, 14];
const TRAPDOOR: [number, number] = [7, 14];

// ---- Up into the Kaldorium after the prison break (author, Episode 13, Oct 6, 2026): the three you let out got
// here first and lost, and Barnaby, up in his announcer's box, has been expecting whoever let them out. He has his
// say, you make your excuse (any excuse: it's UNACCEPTABLE), Brannoc faints, Barnaby is not impressed, and the three
// make their excuses for losing. The Warden stays out of sight until the five guards are down.

/** Barnaby's welcome, from his box, before you answer. */
// (a showman, author, Oct 6, 2026: "the diction of a performative guy who gets the crowd going")
export const ARENA_WELCOME = ["BARNABY: Weeell, well, well! If it isn't our troublemaking escapees!"];
/** Your excuse. It makes no difference. */
export const ARENA_EXCUSES: { label: string; deed?: 'bad' }[] = [
  { label: 'I was just going for a walk.' },
  { label: "It was Gary's idea." },
  { label: 'Death? For a walk? Bit much, big man.', deed: 'bad' },
];
/** His answer, and Brannoc's echo of it, and his faint (and his snot bubble). */
export const ARENA_VERDICT = [
  'BARNABY: THIS IS UNACCEPTABLE!!!!!',
  'BARNABY: After we were so lenient with your sentences, this is how you repay me?',
  'BARNABY: If you thought 5 life sentences were bad, try 500!',
  'BRANNOC: 500!?',
  '* Brannoc passes out, flat on his back. A snot bubble swells from his nose, and shrinks, and swells.',
];
/** Then the three who lost make their excuses on the way to the side of the sand, and it's on (author, Episode 13). */
export const ARENA_FIGHT = [
  "SILAS SEEN: You're the strong silent type. You got this.",
  "OLD MOTT: You wouldn't want an old man fighting. I'll let you have at it!",
  'NAILS: My ice cubes melted.',
  '* Old Mott, Nails and Silas Seen rush over to Brannoc, pick him up, and carry him off to the side of the sand.',
  'BARNABY: FINISH THEM!',
];
/** If you never let the three out: just you and Brannoc. */
export const ARENA_WELCOME_ALONE = ["BARNABY: Weeell, well, well! If it isn't our troublemaking runaways!"];
export const ARENA_FIGHT_ALONE = ARENA_FIGHT.filter((l) => !/silas|old mott|nails/i.test(l));

export const PRISON_INTROS: Record<string, { speaker?: string; lines: string[] }> = {
  'pit-guards': {
    lines: [
      'GUARD: STOP RIGHT THERE!',
      'Brannoc, halfway across the sand, freezes. He goes white. Then grey. Then he faints, flat on his back, right in front of you.',
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
  { row: brannoc, path: [BRANNOC_FAINTED, SAND_MIDDLE, UNDER_WARDEN], face: 1 },
];
export const SNOT_SWING_HIT = [
  'Brannoc is on his feet. His eyes are shut. A snot bubble swells from his nose, and shrinks, and swells.',
  'He lifts his sword.',
  'BRANNOC: Zzz... five more minutes, mother...',
  'BRANNOC SUPER SUPER SWING!',
  'The warden goes up, up, over the banners, and out of the Colosseum. Somewhere in town, a roof gives way.',
  'Silence.',
  "GUARD: Whoa. Whoa, whoa, whoa. Okay. You're good. You're good to go.",
  "GUARD: We won't bother you any more. Strength is valued more than anything here.",
  "GUARD: We don't get paid enough for this.",
];

/** Brannoc wakes: will you pair up? */
export const BRANNOC_OFFER = [
  'The snot bubble pops. Brannoc blinks.',
  'BRANNOC: Wha... where am I? Is it morning? Did I miss the battle?',
  'He looks at the crowd. At the hole in the banners. At you.',
  'BRANNOC: Did YOU do that? By the saints, you are mighty.',
  'BRANNOC: I know not what is happening in this strange land. But if I kept to your side, I might yet live through it.',
  'BRANNOC: I am no great warrior. But my sword is yours, if you will have it.',
];
/** Coming down from the top as the Kaldorium's champion: Brannoc's heard. No mouse needed. */
export const CHAMPION_IN_CELL = [
  'BRANNOC: Hold. You are the one who felled the Warden?',
  'BRANNOC: The whole gaol speaks of it. Even Gary woke for it.',
  'BRANNOC: I am no great warrior. But my sword is yours, if you will have it.',
];
export const BRANNOC_YES = [
  'BRANNOC: Truly? Then I am your sworn sword! I shall not fail you. Probably.',
  'Brannoc joins you.',
];
/** The mean answer (honor.ts): it hurts him, and he goes back to his cell all the same, to wait. */
export const BRANNOC_MEAN_ASK = '"A knight who faints? Hard pass."';
export const BRANNOC_MEAN = [
  'BRANNOC: ...',
  'BRANNOC: No. No, that is fair. I have heard worse. From myself, mostly.',
  'He shuffles off, very slowly, the way you came. He does not look back. He looks back once.',
];
export const BRANNOC_NO = [
  'BRANNOC: Oh.',
  'BRANNOC: No, I understand. Who would want a knight who faints.',
  'He shuffles off, very slowly, the way you came.',
];
/** Back to the ladder, very slowly. */
export const brannocShuffles = (brannoc: number): Actor[] => [
  { row: brannoc, path: [UNDER_WARDEN, SAND_MIDDLE, [8, 14], TRAPDOOR] },
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
  "GUARD: Hey. Hey, buddy. We don't want any smoke with you.",
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

/** What your hero thinks at a twinkling hole (then "Take it?" is asked plainly, PASSAGE_LINES.ask). */
export const holeLines = (asBrannoc: boolean) =>
  asBrannoc
    ? ['(What is that shiny thing?)', "(It's a hidden passage!)"]
    : ['(What is that shiny thing?)', "(It's a hole in the wall. It is exactly Brannoc-shaped.)"];

// ---- The pothole (author, Episode 11, Oct 6, 2026): three steps into the Maze Ward the floor gives way, and you
// drop back into the Deep Cells, on your butt, right outside Silas Seen's cell. Once only: after that it's floor.

/** You've fallen through it: it's just floor now. */
export const FELL_IN = 'maze-pothole-fell';
/** The Maze Ward's pothole tile, and where it drops you (in front of the third cell). */
export const POTHOLE = { tile: 'h', landing: { x: 18, y: 6 } };

/** Landing: the other two have a go, Silas Seen blames Gary, and Gary is asleep (author, Oct 6, 2026). */
export const POTHOLE_LANDING = [
  'THUD.',
  'OLD MOTT: Nice trip.',
  'NAILS: See you next fall.',
  'Old Mott and Nails laugh.',
  'SILAS SEEN: Gary was supposed to fix that hole.',
  'GARY: Zzzz',
  'GARY: Zzzzz',
];

/** Landing when the cells are already empty (you let them out first): nobody to laugh. */
export const POTHOLE_UNSEEN = ['THUD.', 'Nobody saw that. There is nobody left down here to see anything.'];

// ---- The keys (author, Episode 12, Oct 6, 2026): ask Gary nicely and he hands them over. You let the three out;
// they confess on the way up the ladder, at the tops of their voices. Turn round, and Gary's gone too.

/** The cells are empty and Gary's gone: set once the prisoners' exit has been read (kingdom-dungeon.json). */
export const CELLS_FREED = 'cells-freed';

/** With Gary's keys, straight along the cells: out past him, every door in turn, ending clear of the corridor. */
export const toTheCells = (x: number, y: number): Actor[] => {
  // directly above or below Gary, step aside first rather than walk through him
  const side = x === 3 ? 4 : x;
  return [
    {
      row: -1,
      path: [
        [x, y],
        [side, y],
        [side, 6],
        [10, 6],
        [14, 6],
        [18, 6],
        [18, 7],
      ],
      face: 1,
    },
  ];
};
