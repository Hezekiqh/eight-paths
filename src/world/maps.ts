import archiveData from './maps/archive.json';
import type { WalkerId } from './walkers';

export const TILE = 16;

export const FACINGS = ['down', 'up', 'left', 'right'] as const;
export type Facing = (typeof FACINGS)[number];

export type NpcObject = {
  id: string;
  type: 'npc';
  x: number;
  y: number;
  sprite: WalkerId;
  facing: Facing;
  name: string;
  lines: string[];
};

/** The Archive's quest board: opens the objectives. */
export type BoardObject = { id: string; type: 'board'; x: number; y: number };

export type MapObject = NpcObject | BoardObject;

type MapData = {
  id: string;
  name: string;
  tiles: string[];
  spawn: { x: number; y: number; facing: string };
  examine: Record<string, string[]>;
  objects: { type: string }[];
};

export type WorldMap = {
  id: string;
  name: string;
  /** Size in tiles. */
  width: number;
  height: number;
  tiles: string[];
  /** 1 where nobody can walk, row by row: walls, furniture and standing NPCs. */
  solid: number[];
  /** The baked picture from scripts/world-art.mjs, one pixel per art pixel. */
  image: number;
  /** Where a new game starts, in tiles. */
  spawn: { x: number; y: number; facing: Facing };
  /** What the player reads on examining a tile, by its letter in `tiles`. */
  examine: Record<string, string[]>;
  objects: MapObject[];
  npcs: NpcObject[];
};

/** Floor you can walk on; every other tile letter is solid. */
const WALKABLE = new Set(['.', 'r']);

function build(data: MapData, image: number): WorldMap {
  const width = data.tiles[0].length;
  const height = data.tiles.length;
  const objects = data.objects as MapObject[];
  const npcs = objects.filter((o): o is NpcObject => o.type === 'npc');
  const solid = data.tiles.flatMap((row) => [...row].map((c) => (WALKABLE.has(c) ? 0 : 1)));
  for (const n of npcs) solid[n.y * width + n.x] = 1;
  return {
    id: data.id,
    name: data.name,
    width,
    height,
    tiles: data.tiles,
    solid,
    image,
    spawn: { ...data.spawn, facing: data.spawn.facing as Facing },
    examine: data.examine,
    objects,
    npcs,
  };
}

export const MAPS = {
  archive: build(archiveData, require('@/assets/world/archive.png')),
} satisfies Record<string, WorldMap>;

export type MapId = keyof typeof MAPS;

export function isMapId(value: unknown): value is MapId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(MAPS, value);
}

/** What stands on a tile, if anything: an NPC or an object. */
export function objectAt(map: WorldMap, tx: number, ty: number): MapObject | undefined {
  return map.objects.find((o) => o.x === tx && o.y === ty);
}

/** The letter of a tile, or '#' (solid nothing) off the edge of the map. */
export function tileAt(map: WorldMap, tx: number, ty: number): string {
  return map.tiles[ty]?.[tx] ?? '#';
}
