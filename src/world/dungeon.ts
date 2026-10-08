import { GONE, type Actor } from './march';
import type { Arrival, Requirement } from './progress';

// The Kingdom Dungeon (author, Oct 3, 2026), under the Kaloseum: thrown in by Felix's guards,
// you're marched down to a cell where Brannoc is cowering in the corner. Ask him to break out
// and a mouse squeaks: he bolts straight through the bars and up the ladder. Gary, the one guard
// left (the rest are at the Kaloseum for the big fight), sees it and decides he didn't.

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

/** The door at the top of the guards' stair (tile 3): open while the guards bring you down, then locked behind them. */
export const STAIR_DOOR = { x: 21, y: 1 };

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
  // the sentence (author, Oct 7, 2026): Barnaby hands them out, at the king's bidding
  door: [
    'GUARD: Plotting to overtake the throne, huh? Five life sentences will teach you.',
    "GUARD: Barnaby's sentence, by order of the king. In you go.",
  ],
  // the cell door, shut on you as the guards step back
  clang: ['CLANG.'],
  // the guards gone and the stair door locked: a look round
  cell: [
    'Stone walls. Iron bars. Straw that smells of other people.',
    'In the corner, someone is trying very hard to look like part of the wall.',
  ],
  // walking as Brannoc himself: nobody in the corner but you
  alone: ['Stone walls. Iron bars. Straw that smells of other people.'],
  // the guards gone back up the stair: they lock the door behind them
  locked: ['Up the stair, the door slams. A key turns in the lock.'],
};

/**
 * Brannoc, out of the corner: through the bars, along the corridor and up the ladder. He goes round you (along the
 * back of the cell if you're on the front row, or the front if you're at the back), and if you're standing in the
 * gap at the bars, you step aside for him. `you`: your tile.
 */
export const brannocBolts = (brannoc: number, you: [number, number] = [6, 4]): Actor[] => {
  const [x, y] = you;
  // across the cell on whichever row you're not on, then down to the bars (5, 5)
  const row = y === 3 ? 4 : 3;
  const run: [number, number][] = [
    [2, 4],
    ...(row === 3 ? ([[2, 3]] as [number, number][]) : []),
    [5, row],
    ...(row === 3 ? ([[5, 4]] as [number, number][]) : []),
    [5, 5],
    [5, 6],
    [20, 6],
    [20, 8],
    [21, 8],
  ];
  // in his way at the bars: a step to the side, into the cell's far corner of that row
  const inWay = x === 5 && (y === 3 || y === 4);
  const step: [number, number][] = inWay
    ? [
        [x, y],
        [6, y],
      ]
    : [[x, y]];
  return [
    { row: brannoc, path: run, face: GONE },
    { row: -1, path: step, face: inWay ? 2 : x < 5 ? 3 : 2 },
  ];
};

/** Gary, at his table, as Brannoc goes by. */
export const GARY_STARTLED = [
  'GARY: ...',
  'GARY: I did not see that.',
  'GARY: ... I do not get paid enough to have seen that.',
];

// ---- Up the ladder, into the Kaloseum (author, Oct 3, 2026). Brannoc got there first, and the guards
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

/** Where you meet Brannoc and he can join you (said yes to): the cell, the Kaloseum sand, his cell again. */
export const BRANNOC_SCENES = ['brannoc-cell', 'brannoc-awake', 'brannoc-sulk'];

/** What the camera looks at when Barnaby speaks: his box, at the top of the stands, with a little of the sand. */
export const BARNABY_BOX = [15 * 16 + 8, 6 * 16];
/** Where Brannoc lies, fainted, just off the ladder. */
// (the Kaloseum, author, Oct 6, 2026: a wide oval of sand; you come up through the trapdoor at its bottom left,
// and Brannoc is three tiles on, room enough to faint without landing on you)
export const BRANNOC_FAINTED: [number, number] = [11, 14];
/** The middle of the sand, on the way from the trapdoor to the gate. */
export const SAND_MIDDLE: [number, number] = [15, 14];
const TRAPDOOR: [number, number] = [7, 14];

// ---- Up into the Kaloseum after the prison break (author, Episode 13, Oct 6, 2026): the three you let out got
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
/** Walking as Brannoc (author, Oct 7, 2026): the same verdict, and your own "500!?". You sway, but you stay up:
 * your faint is saved for the Warden (ALONE_WARDEN). */
export const ARENA_VERDICT_AS_BRANNOC = [
  ...ARENA_VERDICT.slice(0, 4),
  '* You sway. The sand tilts. Somehow, you stay on your feet. For now.',
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
/** Walking as Brannoc, with the three let out: their excuses, and nobody to carry, so they keep well out of it. */
export const ARENA_FIGHT_AS_BRANNOC = [
  ...ARENA_FIGHT.slice(0, 3),
  '* Old Mott, Nails and Silas Seen stay well out of it, at the side of the sand.',
  'BARNABY: FINISH THEM!',
];

/**
 * What's said as you come up into the Kaloseum, and as the Warden comes out (author, Oct 4, 2026). An
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
      'BARNABY: I am the assistant warden and part-time announcer for the Kaloseum!',
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
  // the Warden, Balderek (author, Oct 4, 2026), back early (the prison route: freed prisoners or not). A working man
  // who wants the job done (author, Oct 7, 2026): no speeches, and no patience for Barnaby's show.
  'pit-warden': {
    speaker: 'Balderek',
    // his every footfall shakes the Kaloseum, and Barnaby announces him like a champion (author, Oct 8, Episode 14)
    lines: [
      '* STOMP. STOMP.',
      "BARNABY: You're in for it now! The second greatest champion... aside from the king, of course...",
      '* STOMP.',
      'BARNABY: BALDEREK!!!!',
      "* Out of the dark of the fighters' tunnel he comes, twice the size of anyone, and every stride shakes the sand.",
      'BALDEREK: Barnaby. Prisoners loose on my sand, and you are up there with a horn.',
      "BARNABY: I didn't think you'd be back from your vacation so soon.",
      'BALDEREK: It was not a vacation. The east gate was off its hinges. Somebody had to hang it.',
      'BALDEREK: Put the horn down, Barnaby. I will take it from here.',
    ],
    // (Barnaby's just told you who he is; four to a menu)
    questions: [
      {
        ask: "What's wrong with Barnaby?",
        answer: [
          'BALDEREK: Five hundred years in this place, and his hands have never been dirty once.',
          'BALDEREK: He sells the fight. I finish it.',
          'BARNABY: I am RIGHT HERE, Balderek.',
          'BALDEREK: I know. I can hear you.',
        ],
      },
    ],
    choices: [
      // Episode 14's answer (author, Oct 8, 2026)
      { label: "How's the weather up there?", lines: ['BALDEREK: Cloudy... with a chance of pain.'] },
      {
        label: 'Any chance you could let me go?',
        lines: [
          'BALDEREK: No.',
          'BALDEREK: You broke out. I put you back down. Nothing personal. It is the job.',
        ],
      },
      {
        label: 'Your poor mother.',
        deed: 'bad',
        lines: [
          'BALDEREK: My mother is fine. We have tea every Wednesday.',
          'BALDEREK: Now. Let us get this done.',
        ],
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
  // Barnaby lays into them (author, Oct 8, 2026, Episode 14)
  "BARNABY: UNACCEPTABLE! Five of the king's finest, bested by a lone escapee! What do we pay you for?",
  // one of them, flat on the sand, gets it out (author, Oct 8, 2026): the guards have never been paid
  "GUARD: You don't pay us at all.",
  // the Kaloseum's tiny medics clear the sand (Episode 14)
  "* The Kaloseum's medics run on with cots, two to a guard, and hurry all five of them off into the fighters' tunnel.",
  "* STOMP. The whole Kaloseum shakes. STOMP. Something very big is coming up the fighters' tunnel.",
];

/** Twenty strikes in: Balderek has had enough, and Brannoc gets up, asleep. */
export const SNOT_SWING = [
  'Twenty strikes.',
  'BALDEREK: Alright. Enough. Time to finish this and get back to work.',
  "Behind you, Brannoc stands up. He's still asleep.",
];
// Brannoc's sleepwalk to the warden, the swing and the flight are in swing.ts (they follow the warden, wherever
// the fight left him).

// ---- Carried off (author, Oct 7, 2026, as in Episode 13): Brannoc faints, and once the three have made their
// excuses they rush over, pick him up (Old Mott at his feet, Nails at his head, Silas Seen leading the way), and
// carry him off to the side of the sand, out of the way of the fight.

/** Set once he's fainted (the verdict's been read): he lies flat on his back from then on (`faintsAfter`). */
export const ARENA_FAINTED = 'arena-fainted';
/** Set once they've carried him off: everyone stands where they put him down (`movesAfter`). */
export const ARENA_CARRIED = 'arena-carried';
/** Where they put him down, on the right of the sand: Old Mott at his feet, Nails at his head, Silas ahead. */
export const CARRIED_TO: Record<'mott' | 'brannoc' | 'nails' | 'silas', [number, number]> = {
  mott: [20, 14],
  brannoc: [21, 14],
  nails: [22, 14],
  silas: [23, 13],
};
/** The walker rows of the three, and Brannoc's. */
type Carriers = { mott: number; nails: number; silas: number; brannoc: number };
/** The rush: round you and over to him (Old Mott below, Nails up and over, Silas ahead), Brannoc out cold. */
export const arenaRush = (r: Carriers): Actor[] => [
  { row: r.brannoc, path: [BRANNOC_FAINTED], face: 4, snot: true },
  {
    row: r.mott,
    path: [
      [6, 12],
      [10, 12],
      [10, 14],
    ],
    face: 3,
  },
  {
    row: r.nails,
    path: [
      [7, 12],
      [7, 11],
      [12, 11],
      [12, 14],
    ],
    face: 2,
  },
  {
    row: r.silas,
    path: [
      [8, 12],
      [13, 12],
      [13, 13],
    ],
    face: 3,
  },
];
/** ...and off they go with him, held up between them, to the side of the sand. */
export const arenaCarry = (r: Carriers): Actor[] => [
  { row: r.mott, path: [[10, 14], CARRIED_TO.mott], face: 3 },
  { row: r.brannoc, path: [BRANNOC_FAINTED, CARRIED_TO.brannoc], face: 5, snot: true },
  { row: r.nails, path: [[12, 14], CARRIED_TO.nails], face: 2 },
  { row: r.silas, path: [[13, 13], CARRIED_TO.silas], face: 2 },
];
// Balderek goes over the banners, not through the wall (STORY.md: he lands on the bakery, and the swing kills him);
// the hole he leaves is drawn in the banner he went through (swing.ts, world-view Breach).
// (author, Oct 8, 2026, Episode 15: he doesn't shout it; he just swings, and the slash says it for him; and Barnaby has
// heard of that move)
export const SNOT_SWING_HIT = [
  'His eyes are shut. A snot bubble swells from his nose, and shrinks, and swells.',
  '* Brannoc swings his sword, without a word, and a slash of light as big as a house tears across the sand.',
  'Balderek goes up, up, over the banners, and out of the Kaloseum. Somewhere in town, a roof gives way.',
  'BARNABY: *GASP*',
  'BARNABY: That move... I thought it was a fairytale.',
];

/**
 * The end of the warden fight (author, Oct 4, 2026), if you freed the prisoners: they get up, yell
 * FREEDOM, and run out through the hole Brannoc's swing made in the banners (they're at the Warrior City tavern after).
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
  'They scramble up the stands, and out through the hole in the banners.',
];

/** The line the swing lands on (world.tsx plays it with the blow). */
export const SWING_LINE = SNOT_SWING_HIT.findIndex((l) => l.startsWith('* Brannoc swings his sword'));

/** The snot bubble's popped: he's awake (the-pit.json's brannoc-awake dozes until then). */
export const BRANNOC_BLINKED = 'brannoc-blinked';
/** Brannoc wakes: will you pair up? */
export const BRANNOC_OFFER = [
  'Brannoc wakes up.',
  'BRANNOC: Where am I!? What happened?',
  'He looks at the crowd. At the hole in the wall. At you.',
  'BRANNOC: Did YOU do that? By the saints, you are mighty.',
  'BRANNOC: I know not what is happening in this strange land. But if I kept to your side, I might yet live through it.',
  'BRANNOC: I am no great warrior. But my sword is yours, if you will have it.',
];
/** Coming down from the top as the Kaloseum's champion: Brannoc's heard. No mouse needed. */
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
/** Where Brannoc wakes after his swing (the-pit.json's brannoc-awake). */
const BRANNOC_WAKES: [number, number] = [15, 10];
/**
 * Back to the ladder, very slowly: down to the bottom of the sand and along it to the trapdoor, round you if you're
 * in the way (a row or a column over). `you`: your tile; `free`: whether a tile can be walked.
 */
export const brannocShuffles = (
  brannoc: number,
  you: [number, number] = [-1, -1],
  free: (x: number, y: number) => boolean = () => true,
): Actor[] => {
  const [wx, wy] = BRANNOC_WAKES;
  const routes: [number, number][][] = [];
  for (const row of [14, 13, 12, 11])
    for (const col of [wx, wx + 1, wx - 1, wx + 2])
      routes.push([BRANNOC_WAKES, [col, wy], [col, row], [8, row], [8, 14], TRAPDOOR]);
  const crosses = (path: [number, number][]) =>
    path.some((p, i) => {
      if (i === 0) return false;
      const [ax, ay] = path[i - 1];
      const [bx, by] = p;
      for (let k = 0; k <= Math.abs(bx - ax) + Math.abs(by - ay); k++) {
        const x = ax + Math.sign(bx - ax) * k;
        const y = ay + Math.sign(by - ay) * k;
        if ((x === you[0] && y === you[1]) || (!free(x, y) && !(x === TRAPDOOR[0] && y === TRAPDOOR[1]))) return true;
      }
      return false;
    });
  const path = routes.find((p) => !crosses(p)) ?? routes[0];
  // drop the steps that go nowhere (a column over of zero, a row down of zero)
  const steps = path.filter((p, i) => i === 0 || p[0] !== path[i - 1][0] || p[1] !== path[i - 1][1]);
  return [{ row: brannoc, path: steps, face: GONE }];
};

/** Walking as Brannoc: the warden drops in, and you faint at the sight of him. `freed`: the three are watching. */
export const aloneWarden = (freed: boolean) => {
  const lines = [...ALONE_WARDEN];
  if (freed) lines.splice(lines.indexOf(ALONE_GUARD_LINE), 0, ...ALONE_WITNESSES);
  return lines;
};
const ALONE_GUARD_LINE = "GUARD: Hey. Hey, buddy. We don't want any smoke with you.";
const ALONE_WITNESSES = ["OLD MOTT: Don't look at us. We were over there.", 'NAILS: Way over there.'];
const ALONE_WARDEN = [
  'The floor shakes. Then it shakes again.',
  'BARNABY: Oh, you have done it now. Everybody, please welcome... THE WARDEN!',
  'He is enormous. He is right in front of you. He smiles.',
  'You go white. Then grey.',
  '...',
  '* You swing, fast asleep, without a word, and a slash of light as big as a house tears across the sand.',
  '...',
  'You wake up on the sand. Your sword is in your hand. There is a warden-shaped hole in the banners.',
  ALONE_GUARD_LINE,
  "GUARD: You're free to leave. Please leave.",
  'You have no idea what just happened.',
];

// ---- The Maze Ward (author, Oct 3, 2026; reworked Oct 7): three mazes, each harder than the last.
// The first is the one Brannoc ran through: short, and it has a Brannoc-shaped hole in the wall by its
// way in that skips it (a Mage of Lv 6 sees it twinkle; walking as Brannoc, it's just a hidden passage).
// It also has the pothole, three steps in (below): you fall through to the cells, and climb back up.
// After that the hole stays open, and there's a notch in the wall above it, so you walk round it.
// The second and third mazes have no way round: you solve them.

export type MazeHole = { map: string; tile: string; needs: Requirement; to: Arrival };

const MAGE = (level: number): Requirement => ({ kind: 'path', dimension: 'intellectual', level });

/** The Brannoc-shaped hole: the first maze only, out at the start of the second. */
export const MAZE_HOLES: MazeHole[] = [
  { map: 'dungeon-mazes', tile: '6', needs: MAGE(6), to: { map: 'dungeon-mazes', x: 14, y: 14, facing: 'right' } },
  // the Test of the Mind's shortcut (author, Oct 4, 2026): Brannoc went through the wall, not the puzzle
  { map: 'dungeon-mind', tile: '7', needs: MAGE(8), to: { map: 'dungeon-lore', x: 3, y: 5, facing: 'up' } },
];

// ---- The statue at the Two Tunnels (author, Oct 4, 2026): it explains the two ways, and doubts you.
export const STRENGTH_TUNNEL = 'b';
export const STATUE_SURE = ["STATUE: Are you sure? You don't look very strong."];
export const FUNERAL = ["STATUE: ...Well. It's your funeral."];

// ---- Gary's keys and the jailbreak (author, Oct 4, 2026): once you've talked to all three prisoners,
// Gary will hand over the cell keys if you ask, and wander off. Unlock the cells and the three of them
// bolt for the ladder, up through the Maze Ward ahead of you, and walk straight into the Kaloseum.

/** The three in the cells, by name (what talking to them is filed under in the lore journal). */
export const PRISONERS = ['Nails', 'Old Mott', 'Silas Seen'];
export const KEYS_FLAG = 'gary-keys';
/** Same as CELLS_FREED below (both sides of a merge built the jailbreak; GitHub's Episode 12 version won). */
export const FREED_FLAG = 'cells-freed';
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

// ---- The pothole (author, Episode 11, Oct 6, 2026): three steps into the Maze Ward the floor gives way, and you
// drop back into the Deep Cells, on your butt, right outside Silas Seen's cell. Once only: after that it stays
// open, and you walk round it (the notch in the wall above it).

/** You've fallen through it: it's an open hole now, and you go round. */
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

/** The three cell doors Gary's keys open (tile p), left to right: Old Mott's, Nails's, Silas Seen's. */
export const CELL_DOORS = [
  { x: 10, y: 5 },
  { x: 14, y: 5 },
  { x: 18, y: 5 },
];
/** The ladder up out of the cells (tile 1). */
const CELLS_LADDER: [number, number] = [21, 8];
/**
 * Out of their cells and up the ladder, confessing at the tops of their voices: Silas Seen first (he's nearest),
 * then Nails, then Old Mott, along the top of the corridor (clear of you, below Silas's door) and gone.
 */
export const prisonersLeave = (r: { mott: number; nails: number; silas: number }): Actor[] =>
  (
    [
      [r.silas, 18],
      [r.nails, 14],
      [r.mott, 10],
    ] as [number, number][]
  ).map(([row, x]) => ({
    row,
    path: [[x, 4], [x, 6], [20, 6], [20, 8], CELLS_LADDER],
    face: GONE,
  }));

/** With Gary's keys, straight along the cells: out past him, every door in turn, ending clear of the way to the ladder. */
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
        [18, 8],
      ],
      face: 1,
    },
  ];
};
