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
export const BRANNOC_FAINTED: [number, number] = [4, 9];
const UNDER_WARDEN: [number, number] = [10, 6];

/**
 * What's said as you come up into the Colosseum, and as the Warden comes out (author, Oct 4, 2026). An
 * intro can end on a menu: `questions` (asked, then back to the menu) and `choices` (said, then the fight).
 * `{his}` is whoever you're walking as (felix-maze.ts forHero).
 */
export type PrisonIntro = {
  speaker?: string;
  lines: string[];
  questions?: { ask: string; answer: string[] }[];
  choices?: { label: string; lines: string[]; deed?: 'good' | 'bad' }[];
};
const LAST_FIGHT = [
  'BARNABY: Enough idle chat.',
  'BARNABY: Guards! Last fight before we go to the tavern! Free drinks for whoever brings me {his} head!',
  'The guards roar.',
];
const BARNABY_MENU = [
  {
    label: 'Who are you?',
    lines: [
      'BARNABY: I am the assistant warden and part-time announcer for the Colosseum!',
      "BARNABY: Sponsored by Bettor. There's no better way to bet than Bettor.",
      ...LAST_FIGHT,
    ],
  },
  { label: "You're too loud.", deed: 'bad' as const, lines: ['BARNABY: ...', ...LAST_FIGHT] },
];
const REALLY = "BARNABY: Really? You haven't been here twenty minutes, and you're causing this much trouble?";
export const PRISON_INTROS: Record<string, PrisonIntro> = {
  'pit-guards': {
    lines: [
      'GUARD: STOP RIGHT THERE!',
      'Brannoc, halfway across the sand, freezes. He goes white. Then grey. Then he faints, flat on his back, right in front of you.',
      'BARNABY: WELL, WELL! An ESCAPE! The crowd LOVES an escape!',
      "BARNABY: In this corner: one escapee, upright! One escapee, not! In the other: FIVE OF THE KING'S OWN! FIGHT!",
    ],
  },
  // the Warden, back early (the prison route: freed prisoners or not)
  'pit-warden': {
    speaker: 'Warden',
    lines: [
      'WARDEN: Having trouble, Barnaby?',
      "BARNABY: Wa... Warden! I didn't think you'd be back from your vacation so soon.",
    ],
    questions: [
      {
        ask: 'Who are you?',
        answer: [
          'WARDEN: I have never lost a match.',
          'WARDEN: The king trusts me to maintain order among the troublemakers.',
        ],
      },
    ],
    choices: [
      {
        label: 'Any chance you could let me go?',
        lines: [
          'WARDEN: Of course.',
          'WARDEN: I will let you go... to the other side of existence.',
          "WARDEN: You've already broken out of prison. There's no point in putting you back.",
        ],
      },
      {
        label: 'Your poor mother.',
        deed: 'bad',
        lines: ['WARDEN: My mother is fine. We have tea every Wednesday.', 'WARDEN: You will pay for that comment.'],
      },
    ],
  },
  // the prisoners went up ahead of you (author, Oct 4, 2026): they didn't get far, and neither did Brannoc
  'pit-guards-freed': {
    lines: ['Brannoc lies collapsed in the sand. Nails, Old Mott and Silas lie beside him, beaten.', REALLY],
    choices: BARNABY_MENU,
  },
  'pit-guards-freed-alone': {
    lines: ['Nails, Old Mott and Silas lie in the sand, beaten.', REALLY],
    choices: BARNABY_MENU,
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
  'Twenty strikes.',
  'WARDEN: That is enough. It is time I put an end to this.',
  "Behind you, Brannoc stands up. He's still asleep.",
];
/** Brannoc walks to the warden, asleep, then swings. */
export const brannocSleepwalks = (brannoc: number): Actor[] => [
  { row: brannoc, path: [BRANNOC_FAINTED, [10, 9], UNDER_WARDEN], face: 1 },
];
export const SNOT_SWING_HIT = [
  'BRANNOC SUPER SUPER SWING!',
  'The Warden goes straight through the side of the Colosseum.',
];

/**
 * The end of the warden fight (author, Oct 4, 2026), if you freed the prisoners: they get up, yell
 * FREEDOM, and run out through the hole Brannoc's swing made (they're at the Warrior City tavern after).
 */
export const PARDONED = 'prisoners-pardoned';

/**
 * Kaldor, at the end (author, Oct 4, 2026): if you freed Silas, he finally answered the king's raven:
 * they're going golfing. These take the place of the king's last line.
 */
export const SILAS_RAVEN = [
  'A raven came for me this morning. From a Silas.',
  "He finally replied. We're going golfing at four tomorrow.",
  'Unfortunately for you, you are still a threat to my rule.',
];
/** Kaldor's speech, with Silas's raven in it if you freed him. */
export const withRaven = (map: string, lines: string[], flags: string[]) =>
  map === 'war-hall' && flags.includes(FREED_FLAG) ? [...lines.slice(0, -1), ...SILAS_RAVEN] : lines;
export const FREED_ENDING = [
  'The prisoners get up.',
  'NAILS: FREEDOM!',
  'OLD MOTT: FREEDOM!',
  'SILAS: FREEDOM!',
  'They run out through the hole in the wall.',
];

/** Brannoc wakes: will you pair up? */
export const BRANNOC_OFFER = [
  'Brannoc wakes up.',
  'BRANNOC: Where am I!? What happened?',
  'He looks at the crowd. At the hole in the wall. At you.',
  'BRANNOC: Did YOU do that? By the saints, you are mighty.',
  'BRANNOC: I know not what is happening in this strange land. But if I kept to your side, I might yet live through it.',
  'BRANNOC: I am no great warrior. But my sword is yours, if you will have it.',
];
/** Coming down from the top as the Kaldorium's champion: Brannoc's heard. No mouse needed. */
export const CHAMPION_IN_CELL = [
  'BRANNOC: Hold. You are the one who felled the Warden?',
  'BRANNOC: The whole gaol speaks of it. Even Gary looked up for it.',
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
  "GUARD: Hey. Hey, buddy. We don't want any smoke with you.",
  "GUARD: You're free to leave. Please leave.",
  'You have no idea what just happened.',
];

// ---- The Maze Ward (author, Oct 3, 2026): three mazes, each with a hole in the wall by its way in
// that skips it. They look like plain wall; a Mage sees them twinkle, one at Lv 6, two at Lv 8, all
// three at Lv 10. Brannoc made them, running: they're Brannoc-shaped. Walking as Brannoc yourself,
// they're just hidden passages (he hasn't run through anything yet).

export type MazeHole = { map: string; tile: string; needs: Requirement; to: Arrival };

const MAGE = (level: number): Requirement => ({ kind: 'path', dimension: 'intellectual', level });

export const MAZE_HOLES: MazeHole[] = [
  { map: 'dungeon-mazes', tile: '6', needs: MAGE(6), to: { map: 'dungeon-mazes', x: 16, y: 6, facing: 'right' } },
  { map: 'dungeon-mazes', tile: '8', needs: MAGE(8), to: { map: 'dungeon-mazes', x: 30, y: 8, facing: 'right' } },
  { map: 'dungeon-mazes', tile: '0', needs: MAGE(10), to: { map: 'dungeon-mazes', x: 42, y: 2, facing: 'down' } },
  // the Test of the Mind's shortcut (author, Oct 4, 2026): Brannoc went through the wall, not the puzzle
  { map: 'dungeon-mind', tile: '7', needs: MAGE(8), to: { map: 'dungeon-lore', x: 3, y: 5, facing: 'up' } },
];

// ---- The statue at the Two Tunnels (author, Oct 4, 2026): it explains the two ways, and doubts you.
export const STRENGTH_TUNNEL = 'b';
export const STATUE_SURE = ["STATUE: Are you sure? You don't look very strong."];
export const FUNERAL = ["STATUE: ...Well. It's your funeral."];

// ---- Gary's keys and the jailbreak (author, Oct 4, 2026): once you've talked to all three prisoners,
// Gary will hand over the cell keys if you ask, and wander off. Unlock the cells and the three of them
// bolt for the ladder, up through the Maze Ward ahead of you, and walk straight into the Colosseum.

/** The three in the cells, by name (what talking to them is filed under in the lore journal). */
export const PRISONERS = ['Nails', 'Old Mott', 'Silas Seen'];
export const KEYS_FLAG = 'gary-keys';
export const FREED_FLAG = 'prisoners-freed';
export const KEYS_ASK = {
  ask: 'Can I have the cell keys?',
  answer: [
    '...',
    'Sure.',
    'Gary unhooks the ring of keys from his belt, drops it in your hand, and wanders off toward the ladder.',
  ],
};
/** What you think, watching him go. */
export const CHILL = ['(What a chill guy.)'];
/** Gary, wandering off: from his desk along the corridor to the ladder. */
export const garyWanders = (row: number): Actor[] => [
  {
    row,
    path: [
      [3, 7],
      [3, 8],
      [20, 8],
    ],
  },
];
/** With the keys, at any of their cells. */
export const UNLOCK = {
  ask: ['Use the keys?'],
  yes: 'Unlock the cells',
  no: 'Not yet',
  mean: 'You can all rot.',
  rot: ['NAILS: ...', 'OLD MOTT: ...', 'SILAS: ...'],
  freed: ['Click. Click. Click.', 'The three of them bolt for the ladder.'],
};
/** The three of them, out of their cells and up the ladder. */
/** The three of them, out of their cells and up the ladder: Nails, Old Mott and Silas, by walker row. */
export const prisonersBolt = (rows: [number, number, number]): Actor[] => [
  {
    row: rows[0],
    path: [
      [10, 6],
      [20, 6],
      [20, 8],
    ],
  },
  {
    row: rows[1],
    path: [
      [14, 6],
      [20, 6],
      [20, 8],
    ],
  },
  {
    row: rows[2],
    path: [
      [18, 6],
      [20, 6],
      [20, 8],
    ],
  },
];

// ---- Trap pits (author, Oct 4, 2026): a few spots on the Maze Ward's wrong turns (never on the way
// through) look like any other floor, bar a hairline crack. Step on one and you fall back down to the
// cells, where the prisoners have something to say about it: Nails the first time, Old Mott the second,
// and the third time Silas, who never answers anyone, says something.

export const PIT_TILE = 'v';
/** One flag per fall, for the first three (the comments change); after that it's whoever. */
export const fellFlag = (n: number) => `maze-fell-${n}`;
/** Where you land: the corridor in front of the cells, between Nails and Old Mott. */
export const FELL_INTO: Arrival = { map: 'kingdom-dungeon', x: 12, y: 7, facing: 'up' };
export const FALLING = ['The floor gives way!'];

/** What the cells say when you drop back in, by fall. */
export function fallLines(n: number, freed = false, garyHere = true): string[] {
  const landed = 'THUD.';
  if (freed) return [landed, 'The cells are empty. Even Gary has gone.', 'Somewhere far above, a crowd is roaring.'];
  if (n === 1) return [landed, 'NAILS: Back already?', 'NAILS: Most people take a week to miss us.'];
  if (n === 2)
    return [
      landed,
      "OLD MOTT: That's twice.",
      "OLD MOTT: Four years I've been in here, and I've never once come in through the ceiling.",
      "OLD MOTT: Mind you, I've never once got out either. So. Swings and roundabouts.",
    ];
  if (n === 3)
    return [
      landed,
      'SILAS: ...',
      'SILAS: The floor with the crack in it.',
      "SILAS: Don't step on the floor with the crack in it.",
      '...',
      'NAILS: He talks!',
      'OLD MOTT: Four years. Four years, and THAT is what he says.',
    ];
  const again = [
    [landed, 'NAILS: Again?', "NAILS: We're going to start charging you rent."],
    [landed, "OLD MOTT: I'm putting the kettle on. You might as well stay."],
    [landed, 'SILAS: ...', 'SILAS: Seen.'],
    ...(garyHere ? [[landed, "GARY: I'm not writing that down."]] : []),
  ];
  return again[n % again.length];
}

/** What your hero thinks at a twinkling hole (then "Take it?" is asked plainly, PASSAGE_LINES.ask). */
export const holeLines = (asBrannoc: boolean) =>
  asBrannoc
    ? ['(What is that shiny thing?)', "(It's a hidden passage!)"]
    : ['(What is that shiny thing?)', "(It's a hole in the wall. It is exactly Brannoc-shaped.)"];
