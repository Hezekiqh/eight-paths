import type { CharacterId } from '@/story/companions';

import type { MapId } from './maps';
import { describeRequirement, type Requirement } from './progress';

// Hidden memories (author, Oct 4, 2026): one a season, tucked somewhere out of
// the way, each a flashback to the three friends as children. A spot shimmers
// once your real habits have earned it, and what you see there is written in
// the World menu's Memories scroll. They're never needed to finish anything.
//
// SECRET (LORE.md section 42): the girl, Kairos, is the player. The two boys
// are the Shadow Monarch and the Keeper. None of that is said here, ever.

export type Memory = {
  id: string;
  /** Which season it belongs to, for the scroll's blank entries. */
  season: number;
  title: string;
  /** Where it's hidden, in tiles: you face the spot and press A. */
  map: MapId;
  x: number;
  y: number;
  /** What it takes to remember it. Until then nothing shimmers. */
  needs: Requirement;
  /** The flashback, a box each; "NAME: words" for speech, everything else is narration. */
  lines: string[];
  /**
   * Someone's own memory, not the season's hidden one (author, Oct 7, 2026): Brannoc's, in the places he
   * ran through. It only comes back with them in your party, it never shimmers or says what it needs before
   * then, and it isn't one of the season's eight in the scroll.
   */
  whose?: CharacterId;
  /** Said at the spot once it's earned but they aren't with you: a thought. */
  waiting?: string[];
  /** A story flag set once it has played (Brannoc's dream waits on his school). */
  sets?: string;
};

/** One memory a season, eight seasons in all. */
export const SEASONS = 8;

export const MEMORIES: Memory[] = [
  {
    id: 'schoolyard',
    season: 1,
    title: 'The schoolyard',
    // the far corner of the old mine, off the south road, away from the way in
    map: 'old-mine',
    x: 1,
    y: 3,
    needs: { kind: 'path', dimension: 'physical', level: 6 },
    lines: [
      'The lamp light swims. For a moment you are somewhere else entirely.',
      'A courtyard of floating glass. Older students in white robes stand in neat rows.',
      'YOUNG KAIROS: You guys are so boring! Why do we have to follow the rules every single time?',
      'OLDER STUDENT: Because it is our divine duty. Some of us were made to keep order.',
      'OLDER STUDENT: And some of us, evidently, were made to be kept in it.',
      'Kairos shoves him. Robes fly, someone shouts, and the neat rows come apart.',
      'A quiet boy steps between them.',
      'QUIET BOY: Enough.',
      'Everyone stops. The older students back away.',
      'A shy boy hurries over, wringing his hands.',
      'SHY BOY: Are you all right? …You always do this.',
      'The memory fades, and you are back in the dark of the mine.',
    ],
  },
  // Brannoc's (author, Oct 7, 2026): the school first, then the forest he ran into. Told, every word, and no
  // further: the shadows closing round him are all he remembers.
  {
    id: 'brannoc-school',
    season: 1,
    title: "The painters' school",
    // the master's stool, facing the wall the paintings hang on (painters-school.ts)
    map: 'painters-school',
    x: 8,
    y: 5,
    needs: {
      kind: 'flag',
      flag: 'paintings-hung',
      label: 'Hang the paintings back',
      hint: 'They came down off the wall. They go back up in an order.',
    },
    whose: 'brannoc',
    waiting: ['The paintings hang in order. Nothing happens. The room seems to be waiting for someone who was here.'],
    sets: 'brannoc-flashback',
    lines: [
      'The dust lifts, and the paint is wet again. Somewhere a bell goes for the end of lessons.',
      'A boy sits at the back of the room with charcoal on his fingers. The other students have gone home.',
      'BRANNOC: Master? Can I tell you something?',
      'THE MASTER: You can tell me anything. I may not agree with it.',
      "BRANNOC: I'm not a great warrior. I'm not any sort of warrior. I faint at nosebleeds. Mostly my own.",
      'THE MASTER: You are a great warrior.',
      'BRANNOC: …Have you seen me with a sword?',
      "THE MASTER: Yearning for battle doesn't make one a great warrior.",
      "The boy frowns at that for a long time. He doesn't understand it. Not yet.",
      'BRANNOC: My father and mother want me to lead their army. Into battle. Soon, they say.',
      'The old man smiles, and goes on cleaning his brush.',
      'THE MASTER: The responsibilities of the crown are heavy.',
      '…',
      'Black.',
      'A board nailed across the school door. CLOSED.',
      'The master, on the floor of this room. Someone came in the night. He is still breathing. Only just.',
      "The memory lets go, and you're back in the dust.",
    ],
  },
  {
    id: 'brannoc-forest',
    season: 1,
    title: 'The forest',
    // the old husk in the ring of dead grass, at the forest's heart (royal-forest.json)
    map: 'royal-forest',
    x: 3,
    y: 12,
    needs: { kind: 'overall', level: 0 },
    whose: 'brannoc',
    waiting: [
      'The husk of an old cocoon, split down the middle and gone grey, half sunk into the earth.',
      'Whoever was in it left a long time ago.',
      'Someone ran this far. Whoever it was would remember the rest.',
    ],
    lines: [
      "The dead grass crunches. For a moment it's green, and it's night, and you are running.",
      'Branches in your face. Your lungs on fire. Behind you, the school, and the master on the floor.',
      'You cut a picture into a tree as you pass, and another, and another, so someone could follow. So you could find your way back.',
      'The trees open. A clearing. You stop.',
      'Shadows. In front. Behind. On every side, rising out of the ground like smoke, and closing.',
      'BRANNOC: …Please.',
      'They close.',
      "And that's all. That's all there is.",
      "The grass is dead again, and it's day, and you're you.",
    ],
  },
];

/** The season's hidden memory (one of the scroll's eight), not anybody's own. */
export const seasonMemory = (season: number) => MEMORIES.find((m) => m.season === season && !m.whose);

/** Someone's own memories (Brannoc's), in the order they're listed. */
export const ownMemories = () => MEMORIES.filter((m) => m.whose);

/**
 * What pressing A at a memory's spot does: 'play' it, say these lines, or nothing (null: the spot is just
 * whatever's there). `met`: its `needs` are met; `party`: who's with you (see partyWithYou).
 */
export function memoryCall(
  m: Memory,
  seen: readonly string[],
  met: boolean,
  party: readonly string[],
): 'play' | string[] | null {
  if (seen.includes(m.id)) return SEEN_LINES;
  if (m.whose) {
    if (!met) return null;
    return party.includes(m.whose) ? 'play' : (m.waiting ?? null);
  }
  return met ? 'play' : notYetLines(describeRequirement(m.needs));
}

/** True if its spot should shimmer: earned, not yet seen, and (someone's own) they're with you. */
export const memoryReady = (m: Memory, seen: readonly string[], met: boolean, party: readonly string[]) =>
  memoryCall(m, seen, met, party) === 'play';

/** The memory hidden at this tile, if any. */
export function memoryAt(map: string, x: number, y: number): Memory | undefined {
  return MEMORIES.find((m) => m.map === map && m.x === x && m.y === y);
}

/** What you sense at a memory's spot before you've earned it: a pull, and what it takes. */
export function notYetLines(needed: string): string[] {
  return ['You feel as though you have stood here before. The feeling slips away.', `(${needed} to remember.)`];
}

/** Said at a memory's spot once it's been seen: it lives in the scroll now. */
export const SEEN_LINES = ['Nothing stirs here now. What you saw is written in your Memories scroll.'];

/** How the World looks under a memory's line: washed out in the past, gone dark for a moment, or back to now. */
export type Shade = 'past' | 'dark' | null;

/** Lines where the memory goes black (the school shut up; the shadows closing on the boy in the forest). */
const DARK = ['…', 'Black.', 'They close.', "And that's all. That's all there is."];

/**
 * The shade under line `index` of a memory as it plays: the past, washed out, from its first line; dark for a moment
 * where it says so; and the room as it is for the last line, which brings you back.
 */
export function memoryShade(m: Memory, index: number): Shade {
  if (index >= m.lines.length - 1) return null;
  return DARK.includes(m.lines[index]) ? 'dark' : 'past';
}

/** The forest's line where the shadows rise all round you (a dark puff on every side). */
export const SHADOWS_RISE = /^Shadows\. In front\./;
