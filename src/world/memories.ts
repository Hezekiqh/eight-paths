import type { CharacterId } from '@/story/companions';

import type { MapId } from './maps';
import { describeRequirement, type Requirement } from './progress';

// Hidden memories (author, Oct 4, 2026): four a season, tucked somewhere out of
// the way, each a flashback to the three friends growing up. In Season 1 they're
// about five years old; each season they're older, and so is what they think. A spot shimmers
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

/** Eight seasons, four memories each (author, Oct 4, 2026). */
export const SEASONS = 8;
export const PER_SEASON = 4;

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
      'The lamplight wavers, and the mine falls away. You stand in a time long gone.',
      'A courtyard of floating glass, where older students in white robes stand in flawless rows.',
      'BRASH YOUTH: You guys are so boring! Why do we have to follow the rules every single time?',
      'OLDER STUDENT: Because it is our divine duty. Some of us were made to keep order.',
      'OLDER STUDENT: And some of us, evidently, were made to be kept in it.',
      'The brash youth shoves him. Robes scatter, voices rise, and the flawless rows break apart.',
      'Then a quiet boy steps between them.',
      'PRODIGAL YOUTH: Enough.',
      'At that single word the courtyard stills, and the older students give way.',
      'A shy boy hurries over, wringing his hands.',
      'SHY YOUTH: Are you all right? …You always do this.',
      'The vision fades, and the dark of the mine closes around you once more.',
    ],
  },
  // Warrior City (author, Oct 4, 2026: the pranks, the food fight, and the first sign she's bored)
  {
    id: 'pranks',
    season: 1,
    title: 'The beetles',
    // between the library's last shelves
    map: 'wc-library',
    x: 15,
    y: 4,
    needs: { kind: 'path', dimension: 'intellectual', level: 6 },
    lines: [
      'Dust drifts down from the shelves, and the library gives way to another age.',
      'A classroom of floating glass. A tall teacher traces stars upon the air.',
      'Beneath the teacher’s desk crouches the brash youth, five years old, a jar of glowing beetles in her hands.',
      'BRASH YOUTH: Shh. Watch.',
      'The teacher sits. The jar tips. The stars upon the board begin to crawl.',
      'The whole class shrieks, and the shy boy hides behind his slate.',
      'TEACHER: Who did this?',
      'Every eye turns to the brash youth. Then the prodigal rises.',
      'PRODIGAL YOUTH: Me.',
      'The brash youth stares at him. He does not look back.',
      'The vision fades, and the shelves return.',
    ],
  },
  {
    id: 'food-fight',
    season: 1,
    title: 'The long hall',
    // behind the tavern's barrels
    map: 'wc-tavern',
    x: 15,
    y: 3,
    needs: { kind: 'path', dimension: 'social', level: 6 },
    lines: [
      'The smell of stew rises, and the tavern gives way to another age.',
      'A long hall of long tables, where rows of children eat in silence. No one speaks at the midday meal.',
      'BRASH YOUTH: This is so boring.',
      'She flicks a spoonful of something purple at the shy boy.',
      'SHY YOUTH: Hey!',
      'He flicks it back. It strikes the prodigal instead.',
      'For a heartbeat, nothing. Then the prodigal lifts his whole bowl.',
      'The hall erupts. The brash youth laughs until she cannot stand.',
      'And for once, the prodigal laughs too.',
      'The vision fades, and the tavern returns.',
    ],
  },
  {
    id: 'same-day',
    season: 1,
    title: 'The same sky',
    // at the end of the chapel's pews
    map: 'wc-chapel',
    x: 16,
    y: 5,
    needs: { kind: 'path', dimension: 'spiritual', level: 6 },
    lines: [
      'The candles flicker, and the chapel gives way to another age.',
      'Three small children lie upon a hill of glass grass, beneath a sky that never changes.',
      'BRASH YOUTH: Do you ever think every day is the same day?',
      'SHY YOUTH: ...I like it the same.',
      'PRODIGAL YOUTH: Same is safe.',
      'BRASH YOUTH: Same is boring.',
      'She rolls over and looks at the prodigal.',
      "BRASH YOUTH: Promise you'll never be boring.",
      'He gives no answer. The shy boy watches them both.',
      'The vision fades, and the chapel returns.',
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
      'The dust lifts, and the paint is wet again. Somewhere, a bell tolls the end of lessons.',
      'A boy sits at the back of the room, charcoal on his fingers, long after the other students have gone.',
      'BRANNOC: Master? Can I tell you something?',
      'THE MASTER: You can tell me anything. I may not agree with it.',
      "BRANNOC: I'm not a great warrior. I'm not any sort of warrior. I faint at nosebleeds. Mostly my own.",
      "BRANNOC: A true warrior yearns for war. Everyone says so. And I don't. Not at all.",
      'THE MASTER: Is that what you believe, or what you were told?',
      'The old man turns back to his canvas. The boy frowns at the question for a long time. He does not understand it. Not yet.',
      'BRANNOC: My father and mother want me to lead their army. Into battle. Soon, they say.',
      'The master smiles, and goes on cleaning his brush.',
      'THE MASTER: The responsibilities of the crown are heavy.',
      'The boy sits with those words long into the night.',
      '…',
      'Black.',
      'Morning. A board nailed across the school door. CLOSED.',
      'The master lies upon the floor of this very room. Someone came in the night. He does not wake.',
      'The memory releases you, and the dust settles once more.',
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
      'The dead grass crunches. For a moment it is green, and it is morning, and you are running.',
      'Branches lash your face. Your lungs burn. Behind you lie the school, and the master on its floor.',
      'You carve a picture into a tree as you pass, and another, and another, so that someone might follow. So that you might find your way back.',
      'The trees part. A clearing. You stop.',
      'Shadows. In front. Behind. On every side, rising from the earth like smoke, and closing in.',
      'BRANNOC: …Please.',
      'They close.',
      "And that's all. That's all there is.",
      'The grass is dead again, and it is day, and you are yourself once more.',
    ],
  },
];

/** The season's hidden memories (up to PER_SEASON of the scroll's), not anybody's own. */
export const seasonMemories = (season: number) => MEMORIES.filter((m) => m.season === season && !m.whose);

/** The season's first hidden memory. */
export const seasonMemory = (season: number): Memory | undefined => seasonMemories(season)[0];

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
