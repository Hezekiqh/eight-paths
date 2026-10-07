import type { CharacterId } from '@/story/companions';

import type { MapId } from './maps';

/**
 * Cocoons you can break open in the World. Each holds someone chosen for the
 * story at that spot (never one of the core eight): breaking it plays their
 * hatch, they step out and talk, then go somewhere that matters, to help you
 * or get in your way. `hatched` is set when it breaks; `left` when they go.
 */
export type Cocoon = {
  map: MapId;
  /** The tile it stands on, and the letter it's drawn as. */
  x: number;
  y: number;
  tile: string;
  character: CharacterId;
  hatched: string;
  left: string;
  /** What you see once it's broken. */
  empty: string[];
};

export const COCOONS: Cocoon[] = [
  {
    // The first one you find: open to anyone, to show what cocoons are. Felix Rook,
    // the Academy's strategist, goes to advise Kaldor (see advisedBy).
    map: 'courier-road',
    x: 8,
    y: 6,
    tile: 'J',
    character: 'felix',
    hatched: 'felix-hatched',
    left: 'felix-left',
    empty: ['The split silk of an empty cocoon. Whoever was inside is long gone.'],
  },
];

/**
 * You can't walk on past Felix's cocoon without breaking it (author, Oct 7, 2026): an invisible wall across the
 * road, east of the Waystation, and a thought each time you try it, the last one for good. Felix frames you, and
 * that's how the story gets you into the cells.
 */
export const COCOON_WALL = {
  map: 'courier-road',
  x: 27,
  until: 'felix-hatched',
  lines: [
    'I wonder what that cocoon is over there.',
    'I should probably check out that cocoon.',
    'Cocoooooooooooooooon.',
    'There is absolutely no way I could ever move forward without checking out that cocoon.',
  ],
} as const;

/** The cocoon on this tile of this map, if there is one. */
export const cocoonAt = (map: string, tile: string) => COCOONS.find((c) => c.map === map && c.tile === tile);

/** Broken cocoons on this map, to draw as split silk. */
export const brokenCocoons = (map: string, flags: string[]) =>
  COCOONS.filter((c) => c.map === map && flags.includes(c.hatched)).map(({ x, y }) => ({ x, y }));

/**
 * Felix in Kaldor's war hall: once he's left to advise the king, two more of the
 * king's shadows stand with him for the fight, and Felix says why.
 */
export const ADVISED = {
  map: 'war-hall',
  flag: 'felix-left',
  guards: [
    { kind: 'shadow', x: 8, y: 3 },
    { kind: 'shadow', x: 14, y: 3 },
  ],
  lines: ['FELIX: Ah, voilà, you came! I told him you would. I also told him to bring friends. Many friends.'],
} as const;

export function advisedBy(map: string, flags: string[]) {
  return map === ADVISED.map && flags.includes(ADVISED.flag) ? ADVISED : null;
}
