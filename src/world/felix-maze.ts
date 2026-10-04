import type { Dimension } from '@/game';
import type { CharacterId } from '@/story/companions';

import keeperWelcome from './keeper-welcome.json';

import type { MapId } from './maps';
import type { Arrival, Requirement } from './progress';

// Felix's boulder maze, between the Courier Road and the deserters' camp
// (author, Oct 3, 2026). Anyone can solve it; push a boulder the wrong way and
// you're stuck, so you walk back out to the road and in again, which puts every
// boulder back. A Mage of Lv 6 sees a hidden passage instead: it leads to the
// Archive, where the Keeper waits, and its green candle sets you down past
// the maze. Either way you walk into Felix framing you to the king's guards.

export const MAZE = 'felix-maze';
/** Set once you're past the boulders (or the guards took you): they stay rolled aside after that. */
export const MAZE_SOLVED = 'felix-maze-solved';
/** The guard scene is over, however it went: Felix and the guards are gone. */
export const FRAMED = 'felix-framed';
/** You promised the guards a drink. They'll remember. */
export const OWES_GUARDS = 'owes-guards-a-drink';
/** A wrong answer to Sir Himothy: you were thrown in the dungeon, next to Brannoc. */
export const JAILED = 'jailed-with-brannoc';
/** You've come to in the cell (said once). */
export const JAIL_WOKE = 'jail-woke';
/** Called him Timmy: knocked out at the maze, so no escort down; you wake already in the cell. */
export const KNOCKED_OUT = 'himothy-knockout';

/** The tree that hides the passage, and the tile you step onto past the maze (where the scene starts). */
export const PASSAGE_TILE = 'Z';
export const CLEARING_TILE = 'X';
/** The Archive's green candle: lit only while it has somewhere to take you (past the maze). */
export const GREEN_CANDLE = 'g';
/** You took the hidden passage: the green candle in the Archive is lit until you've used it. */
export const PASSAGE_TAKEN = 'felix-passage';
/** The green candle is lit: you came through the passage, and haven't gone on past the maze yet. */
export const greenLit = (flags: string[]) => flags.includes(PASSAGE_TAKEN) && !flags.includes(MAZE_SOLVED);

/** Intellect (the Mage's Path) to notice the passage. */
export const PASSAGE: Requirement = { kind: 'path', dimension: 'intellectual', level: 6 };
/** The level each clever answer to the guards needs. */
export const ANSWER_LEVEL = 10;

/** Back through the passage the way you came: at the foot of the hidden tree, by the maze's start. */
export const PASSAGE_RETURN: Arrival = { map: 'felix-maze', x: 2, y: 2, facing: 'down' };
/** Out of the passage: the Archive, a step in front of the Keeper. */
export const INTO_THE_ARCHIVE: Arrival = { map: 'archive', x: 20, y: 6, facing: 'up' };
/** Out of the green candle: in front of Felix and the guards, one tile between you and him. */
export const PAST_THE_MAZE: Arrival = { map: 'felix-maze', x: 22, y: 4, facing: 'right' };
/** Under the guards' stair: the guards march you down to the cell from here (dungeon.ts). */
export const INTO_THE_CELL: Arrival = { map: 'kingdom-dungeon', x: 21, y: 3, facing: 'down' };
/** Knocked out: you come to on the straw, inside the cell (where shovedIn leaves you). */
export const KNOCKED_IN: Arrival = { map: 'kingdom-dungeon', x: 6, y: 4, facing: 'down' };
/** Coming to in the cell after Himothy's whole name. */
export const KNOCKED_WAKE = [
  'You wake up on straw. Your head is ringing. Somewhere far above, someone is still saying "the Third."',
  'Stone walls. Iron bars. Straw that smells of other people.',
];

/**
 * Ways between places that aren't doors: the hidden passage (a Mage of Lv 6),
 * the green candle, and a wrong answer to the guards (straight to the cells).
 */
export const SIDE_WAYS: { from: MapId; tile: string; to: Arrival }[] = [
  { from: 'felix-maze', tile: PASSAGE_TILE, to: INTO_THE_ARCHIVE },
  { from: 'archive', tile: GREEN_CANDLE, to: PAST_THE_MAZE },
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
  notice: ['(What is that shiny thing?)'],
  found: ["(It's a hidden passage!)"],
  // the choice is put plainly, by nobody: your hero thinks, you decide
  ask: ['Take it?'],
  plain: ['Old trees, packed close.'],
};

// The Keeper, as you come out of the passage (author, Oct 3, 2026). The words live in
// keeper-welcome.json, so the episodes (scripts/episode-video.mjs) say exactly the same.
export const KEEPER_WELCOME = keeperWelcome.welcome;
/** Yes, cards: you sit on the floor and deal, and he talks while you play. */
export const KEEPER_CARDS = keeperWelcome.cards;
export const KEEPER_NO_CARDS = keeperWelcome.noCards;
/** What you can ask him: all of them, before he gets to the candle. */
export const KEEPER_ASKS: { ask: string; answer: string[] }[] = keeperWelcome.asks;
/** Your hero, once he's answered everything: left wondering (thoughts, in brackets). */
export const KEEPER_AFTERTHOUGHTS = keeperWelcome.afterThoughts;
/** Then he points at the green candle. */
export const KEEPER_CANDLE = keeperWelcome.candle;
/** You've won (or lost) the hand, and he's said his piece. */
export const KEEPER_CARDS_END = keeperWelcome.cardsEnd;
/** The green candle, unlit or lit. */
export const GREEN_CANDLE_LINES = {
  unlit: ['A candle with a green wick, unlit.', 'The Keeper says it burns only when it has somewhere to carry you.'],
  lit: [
    'A candle burning green, not orange like the others.',
    "The flame leans east, as if it already knows where it's going.",
  ],
};

/** The Keeper, as you touch the green flame. */
export const KEEPER_PARTING = [
  'THE KEEPER: Wait...',
  'THE KEEPER: Remember. You may do whatever you wish in the Other World...',
  'THE KEEPER: But you are the sum of your good deeds and your bad...',
  'THE KEEPER: And people will remember what you have done...',
  `THE KEEPER: ${keeperWelcome.confronted}`,
  'The green flame flashes, and the room is gone.',
];

/** The guard who does the talking: a captain, and very proud of it (author, Oct 3, 2026). */
export const HIMOTHY = 'SIR HIMOTHY THE THIRD';

// He insists on all of it (author, Oct 4, 2026): he gives his name, you try to shorten it, he cuts you
// off, and it's straight to the answers. `{he is}` is whoever you're walking as (forHero).
export const SCENE_OPEN = [
  'FELIX: There {he is}, officers! That one, plotting to take the throne!',
  `${HIMOTHY}: Plotting against the king? Here, it's guilty until proven innocent.`,
  `${HIMOTHY}: The name is Sir Himothy the Third. And you have to say the whole thing.`,
];
/** What you try to call him (the only thing you can say, and the wrong one). */
export const MISTER = '"Mr. Himothy, I..."';
export const CUT_OFF = [`${HIMOTHY}: SAY. THE WHOLE. THING.`];

/** Who the guards are after, for "Seize him!": they only want you. ('them' for anyone not listed.) */
export const PRONOUN: Record<string, 'him' | 'her' | 'them'> = {
  brannoc: 'him',
  pip: 'him',
  moss: 'him',
  ysolde: 'her',
  quill: 'him',
  oren: 'her',
  wren: 'her',
  tamsin: 'her',
};

export type Answer = {
  label: string;
  /** The Path and level it takes (null: anyone can say it). Shown with that Path's icon. */
  path: Dimension | null;
  /** `{them}` becomes him or her (PRONOUN) for whoever you're walking as. */
  lines: string[];
  /** Story flags it sets, beyond FRAMED. */
  sets?: string[];
  /** Thrown in the dungeon instead of let go. */
  jailed?: boolean;
  /** Knocked out instead of marched off: you wake in the cell (KNOCKED_IN). */
  knockout?: boolean;
  /** Kind or mean (honor.ts). */
  deed?: 'good' | 'bad';
  /** Said when a party member of that Path steps out and says it for you, in their own voice (author, Oct 4, 2026). */
  by?: Partial<Record<CharacterId, string[]>>;
};

const SUBJECT = { him: 'he is', her: 'she is', them: 'they are' } as const;
const POSSESSIVE = { him: 'his', her: 'her', them: 'their' } as const;
/** A line for whoever you're walking as: `{them}` (him/her), `{he is}` (he is/she is), `{his}` (his/her). */
export const forHero = (line: string, hero: string) => {
  const p = PRONOUN[hero] ?? 'them';
  return line.replace('{them}', p).replace('{he is}', SUBJECT[p]).replace('{his}', POSSESSIVE[p]);
};

/**
 * The guards' question, four answers at most like every menu (author, Oct 4, 2026): two clever ones
 * (Lv 10 in their Path, greyed out with just the Path's icon until then) that talk you free, and two
 * anyone can say that land you in the cells: the plea he's heard a thousand times, and the mean one,
 * which gets you knocked out.
 */
export const ANSWERS: Answer[] = [
  {
    label: '"Plots take weeks. I woke up today."',
    path: 'intellectual',
    lines: [
      "You explain: you've been awake a matter of days, you don't know where the throne is, and you'd need a map, a plan, and allies, which you also don't have.",
      `${HIMOTHY}: ...That is a very good point.`,
    ],
    by: {
      quill: [
        "QUILL: Plots take weeks. Months, if they're any good. I've been awake for about four days.",
        "QUILL: I don't know where the throne is. I'd need a map, a plan and allies, and I have, let me check... a pencil.",
        `${HIMOTHY}: ...That is a very good point.`,
      ],
    },
  },
  {
    label: '"Let me buy you both a drink."',
    path: 'social',
    lines: [
      `${HIMOTHY}: ...A drink?`,
      `${HIMOTHY}: Now you're talking. The Candle Inn, when you're in town. Don't forget.`,
      `${HIMOTHY}: You owe us.`,
    ],
    by: {
      pip: [
        'PIP: Gentlemen! You look thirsty. Arresting people is thirsty work. Let me buy you both a drink!',
        `${HIMOTHY}: ...A drink?`,
        `${HIMOTHY}: Now you're talking. The Candle Inn, when you're in town. Don't forget.`,
        `${HIMOTHY}: You owe us.`,
      ],
    },
    sets: [OWES_GUARDS],
  },
  {
    // the mean one (honor.ts; author, Oct 4, 2026): no escort for this, he knocks you out cold
    label: '"Your name is stupid, Timmy."',
    path: null,
    deed: 'bad',
    lines: [
      `${HIMOTHY}: ...Timmy.`,
      `${HIMOTHY}: Nobody has called me Timmy since the academy.`,
      'GUARD: Oh no. Sir, remember what the healer said about your temper—',
      `${HIMOTHY}: SIR. HIMOTHY. THE. THIRD.`,
      'He hits you with the whole name. Every syllable lands.',
    ],
    sets: [JAILED, KNOCKED_OUT],
    jailed: true,
    knockout: true,
  },
  {
    label: '"I\'m innocent!"',
    path: null,
    lines: [`${HIMOTHY}: Innocent, huh? Sounds like something a guilty person would say.`, `${HIMOTHY}: Seize {them}!`],
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
