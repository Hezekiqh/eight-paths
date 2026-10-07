import type { Dialogue } from '@/components/world/dialogue-box';

import { tilesOf, type WorldMap } from './maps';

// The Painters' School (author, Oct 7, 2026): off the South Road, by the Royal Garden, boarded up for five
// hundred years. Brannoc's teacher taught here, a painter and a philosopher. His paintings have come down
// off the wall: four of them, the story of a boy and a sword. Look at each where it fell, then hang them
// back on the hooks in order (a menu at the wall, one hook at a time). Once they hang right, Brannoc's
// memory of the school is there to be had, if he's with you (memories.ts 'brannoc-school'). No fights:
// it's quiet on purpose.

export const SCHOOL = 'painters-school';
/** Set once the four hang in the right order. */
export const PAINTINGS_HUNG = 'paintings-hung';
/** The wall of hooks you hang them on. */
export const HOOK_TILE = 'H';

export type Painting = {
  /** The tile it lies on, fallen (its letter in painters-school.json; examining it says what it shows). */
  tile: string;
  /** What the menu calls it. */
  title: string;
};

/** The four, in the order they hang: I. WONDER, II. DUTY, III. DOUBT, IV. PEACE (the hooks' brass plates). */
export const PAINTINGS: Painting[] = [
  { tile: 'y', title: 'The boy at the window' },
  { tile: 'z', title: 'The boy and the balcony' },
  { tile: 'x', title: 'The boy and the old man' },
  { tile: 'w', title: 'The field' },
];

/** The brass plate under each hook, I to IV. */
export const PLATES = ['WONDER', 'DUTY', 'DOUBT', 'PEACE'];

const ORDINAL = ['first', 'second', 'third', 'fourth'];

/** True if the paintings, by tile, are in the order they hang. */
export const rightOrder = (tiles: readonly string[]) =>
  tiles.length === PAINTINGS.length && PAINTINGS.every((p, i) => p.tile === tiles[i]);

/** The hooks, left to right: the lower of the wall's two rows, where a painting hangs. */
function hooks(map: WorldMap): { x: number; y: number }[] {
  return tilesOf(map, [HOOK_TILE])
    .map((t) => ({ x: t % map.width, y: Math.floor(t / map.width) }))
    .filter((h) => map.tiles[h.y + 1]?.[h.x] !== HOOK_TILE)
    .sort((a, b) => a.x - b.x);
}

/**
 * The paintings as they are now, drawn live over the room (world-view.tsx): on the floor where they fell, or
 * on their hooks once they're hung. `scene` is each one's place in the story, 0 to 3, for how it's drawn.
 */
export type Shown = { x: number; y: number; hung: boolean; scene: number };

export function paintingsShown(map: WorldMap, flags: readonly string[]): Shown[] {
  if (map.id !== SCHOOL) return [];
  const hung = flags.includes(PAINTINGS_HUNG);
  const on = hooks(map);
  return PAINTINGS.flatMap((p, scene): Shown[] => {
    if (hung) return [{ ...on[scene], hung, scene }];
    const at = tilesOf(map, [p.tile])[0];
    return at === undefined ? [] : [{ x: at % map.width, y: Math.floor(at / map.width), hung, scene }];
  });
}

/** Where one lay, once it's back on the wall. */
const LAIN = ['Just a clean square in the dust, where a painting lay.'];

/** A fallen painting's spot once they're hung: it isn't there any more. Null for anything else. */
export function fallenLines(tile: string, flags: readonly string[]): string[] | null {
  if (!flags.includes(PAINTINGS_HUNG) || !PAINTINGS.some((p) => p.tile === tile)) return null;
  return LAIN;
}

export const HUNG_LINES = [
  'Four paintings, hung straight.',
  'A boy who drew birds. A sword he was handed. An old man who asked him a question. A field, and the sword left in it.',
];

const SOLVED_LINES = ['You hang the last one and step back.', ...HUNG_LINES.slice(1), 'It reads, now.'];

const WRONG_LINES = [
  "You hang them and step back. It doesn't read. The boy's all over the place.",
  'You take them down again.',
];

/** What the wall's menu needs from the World: open the next box, hang them for good, and what follows. */
export type Hanging = {
  say: (d: Dialogue) => void;
  /** They're up, in the right order: set the flag. */
  hang: () => void;
  /** Once the lines close: the memory, if Brannoc's here to have it (or a thought, if he isn't). */
  after: () => void;
};

/** Pressing A at the hooks: hang the paintings back, a hook at a time, or (hung) look at them. */
export function hookDialogue(flags: readonly string[], h: Hanging, look: string[]): Dialogue {
  if (flags.includes(PAINTINGS_HUNG)) return { lines: HUNG_LINES, then: h.after };
  return {
    lines: [...look, 'Hang the paintings back up?'],
    choices: [
      { label: 'Hang them back up.', then: () => h.say(pick([], h)) },
      { label: 'Leave them.', then: () => {} },
    ],
  };
}

/** The next hook: which painting goes on it. The last one goes on the last hook by itself. */
function pick(chosen: string[], h: Hanging): Dialogue {
  const n = chosen.length;
  const left = PAINTINGS.filter((p) => !chosen.includes(p.tile));
  return {
    lines: [`The ${ORDINAL[n]} hook. Its plate says ${PLATES[n]}.`],
    choices: left.map((p) => ({
      label: p.title,
      then: () => {
        const next = [...chosen, p.tile];
        const rest = PAINTINGS.filter((q) => !next.includes(q.tile));
        if (rest.length > 1) return h.say(pick(next, h));
        const all = [...next, ...rest.map((q) => q.tile)];
        if (!rightOrder(all)) return h.say({ lines: WRONG_LINES });
        h.hang();
        h.say({ lines: SOLVED_LINES, then: h.after });
      },
    })),
  };
}
