import { TILE, type MapId, type WorldMap } from './maps';

// How each place feels, drawn live over its baked picture: how dark it is,
// what drifts in the air, and where flames flicker and throw light.

export type Motes = 'dust' | 'pollen' | null;
export type Ambience = { darkness: number; motes: Motes };

const BY_STYLE: Record<WorldMap['style'], Ambience> = {
  rooms: { darkness: 0.18, motes: 'dust' },
  outdoor: { darkness: 0, motes: 'pollen' },
  dungeon: { darkness: 0.32, motes: 'dust' },
};

/** Places darker (or lighter) than their style. */
const DARKER: Partial<Record<MapId, number>> = {
  'war-hall': 0.45,
  'old-kings-crypt': 0.6,
  'pit-below': 0.55,
  'lower-barracks': 0.45,
  'sleeping-keep': 0.4,
  chapel: 0.4,
  'the-pit': 0.2,
  'candle-inn': 0.2,
  forge: 0.25,
  waystation: 0.1,
};

export function ambienceOf(map: WorldMap): Ambience {
  const base = BY_STYLE[map.style];
  return { ...base, darkness: DARKER[map.id as MapId] ?? base.darkness };
}

/**
 * Every flame on a map, in art pixels: where it burns (x, y, the flame's
 * tip) and how far its light reaches. By tile letter and how the map's drawn
 * (see the candle and torch art in scripts/world-art.mjs).
 */
const FLAMES: Record<WorldMap['style'], Record<string, { dx: number; dy: number; reach: number }[]>> = {
  rooms: {
    c: [
      { dx: 4, dy: 1, reach: 0 },
      { dx: 7, dy: -1, reach: 44 },
      { dx: 11, dy: 1, reach: 0 },
    ],
  },
  outdoor: { c: [{ dx: 7, dy: 2, reach: 40 }] },
  dungeon: { k: [{ dx: 7, dy: 1, reach: 48 }] },
};

/** A flame: [x, y, how far its light reaches (0: none of its own)]. */
export function flamesOn(map: WorldMap): number[][] {
  const kinds = FLAMES[map.style];
  const out: number[][] = [];
  map.tiles.forEach((row, ty) =>
    [...row].forEach((c, tx) => {
      for (const f of kinds[c] ?? []) out.push([tx * TILE + f.dx, ty * TILE + f.dy, f.reach]);
    }),
  );
  return out;
}

/** How many of the war hall's torches can gutter out in Kaldor's fight (one stays lit, to fight by). */
export const WAR_HALL_TORCHES = 6;
export const MAX_GUTTERED = WAR_HALL_TORCHES - 1;
