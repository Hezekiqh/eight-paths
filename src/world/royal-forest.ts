// The Royal Forest (author, Oct 7, 2026): south of Warrior City, past the Royal Garden, where Brannoc ran
// five hundred years ago. Four walls of trees stand across it, each with three gaps (north, straight on
// west, south). In every clearing he cut a picture into a tree, pointing the way he ran; the right gap
// takes you on, and the other two (EXITS 'forest-loop', tile LOOP_TILE) walk you back out where you came
// in. The pictures get wilder the deeper you go. At the heart, a ring of dead grass and an old husk, and
// Brannoc's memory of it (memories.ts 'brannoc-forest'). Shadows thicken towards the heart; they're gone
// once Kaldor is.

export const FOREST = 'royal-forest';
/** A wrong gap: step in and the forest turns you round. */
export const LOOP_TILE = 'o';
/** A gap that goes somewhere (and the right one through each wall). */
export const GAP_TILE = 'k';

export type Way = 'north' | 'west' | 'south';

/** The rows of a wall's three gaps. */
export const GAP_ROWS: Record<Way, number> = { north: 5, west: 12, south: 19 };

/**
 * The way he ran, wall by wall from the way in: the carving in the clearing before each wall (its tile
 * letter) and which gap it points to. `x` is the wall's first column coming from the east.
 */
export const TRAIL: { carving: string; way: Way; x: number }[] = [
  { carving: '1', way: 'north', x: 32 },
  { carving: '2', way: 'south', x: 24 },
  { carving: '3', way: 'west', x: 16 },
  { carving: '4', way: 'north', x: 8 },
];
