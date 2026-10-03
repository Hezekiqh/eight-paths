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

/** The cocoon on this tile of this map, if there is one. */
export const cocoonAt = (map: string, tile: string) => COCOONS.find((c) => c.map === map && c.tile === tile);

/** Broken cocoons on this map, to draw as split silk. */
export const brokenCocoons = (map: string, flags: string[]) =>
  COCOONS.filter((c) => c.map === map && flags.includes(c.hatched)).map(({ x, y }) => ({ x, y }));

/**
 * Felix in Kaldor's war hall: once he's left to advise the king, two of the
 * king's guards stand with him for the fight, and Felix says why.
 */
export const ADVISED = {
  map: 'war-hall',
  flag: 'felix-left',
  guards: [
    { kind: 'raider', x: 7, y: 3 },
    { kind: 'raider', x: 11, y: 3 },
  ],
  lines: ["FELIX: I told him you'd come. I also told him to bring friends."],
} as const;

export function advisedBy(map: string, flags: string[]) {
  return map === ADVISED.map && flags.includes(ADVISED.flag) ? ADVISED : null;
}
