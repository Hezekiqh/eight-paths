import type { MapId } from './maps';
import type { Requirement } from './progress';

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
      'Dust drifts down from the shelves. For a moment you are somewhere else.',
      'A classroom of floating glass. A tall teacher writes stars across the air.',
      "Little Kairos, five years old, is under the teacher's desk with a jar of glowing beetles.",
      'YOUNG KAIROS: Shh. Watch.',
      'The teacher sits down. The jar tips over. The stars on the board start to crawl.',
      'The whole class shrieks. The shy boy hides behind his slate.',
      'TEACHER: Who did this?',
      'Everyone looks at Kairos. The quiet boy stands up.',
      'QUIET BOY: Me.',
      "Kairos stares at him. He doesn't look back.",
      'The memory fades, and you are back among the shelves.',
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
      'The smell of stew, and for a moment you are somewhere else.',
      'A long hall of long tables. Rows of children eat in silence. Nobody talks at lunch.',
      'YOUNG KAIROS: This is so boring.',
      'She flicks a spoonful of something purple at the shy boy.',
      'SHY BOY: Hey!',
      'He flicks it back. It hits the quiet boy instead.',
      'For a moment nothing happens. Then the quiet boy picks up his whole bowl.',
      "The hall erupts. Kairos is laughing so hard she can't stand up.",
      'For once, the quiet boy is laughing too.',
      'The memory fades, and you are back in the tavern.',
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
      'The candles flicker, and for a moment you are somewhere else.',
      'Three small children lie on a hill of glass grass, under a sky that never changes.',
      'YOUNG KAIROS: Do you ever think every day is the same day?',
      'SHY BOY: ...I like it the same.',
      'QUIET BOY: Same is safe.',
      'YOUNG KAIROS: Same is boring.',
      'She rolls over and looks at the quiet boy.',
      "YOUNG KAIROS: Promise you'll never be boring.",
      "He doesn't answer. The shy boy watches them both.",
      'The memory fades, and you are back in the chapel.',
    ],
  },
];

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
