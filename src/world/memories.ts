import type { MapId } from './maps';
import type { Requirement } from './progress';

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
