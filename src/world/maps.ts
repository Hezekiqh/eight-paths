import archiveData from './maps/archive.json';
import courierRoadData from './maps/courier-road.json';
import type { CharacterId } from '@/story/companions';

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
  /** What they say when you first talk to them. */
  lines: string[];
  /** Questions you can ask them afterwards, from a menu (plus Goodbye). */
  questions?: Question[];
  /** A character from the collection: they get the standard three questions (see talk.ts). */
  character?: CharacterId;
};

/** Something the player can ask an NPC, and the answer, a line per box. */
export type Question = { ask: string; answer: string[] };

/** The Archive's quest board: opens the objectives. */
export type BoardObject = { id: string; type: 'board'; x: number; y: number };

export type MapObject = NpcObject | BoardObject;

type MapData = {
  id: string;
  name: string;
  /** Tile letters you can walk on (default: the Archive's floor and rug). */
  walkable?: string[];
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
  /** Tile letters you can walk on. */
  walkable: string[];
  /** The baked picture from scripts/world-art.mjs, one pixel per art pixel. */
  image: number;
  /** Where a new game starts, in tiles. */
  spawn: { x: number; y: number; facing: Facing };
  /** What the player reads on examining a tile, by its letter in `tiles`. */
  examine: Record<string, string[]>;
  objects: MapObject[];
  npcs: NpcObject[];
};

/** Floor you can walk on unless a map says otherwise; every other tile letter is solid. */
const WALKABLE = ['.', 'r'];

function solidFor(tiles: string[], walkable: string[], npcs: NpcObject[]): number[] {
  const width = tiles[0].length;
  const solid = tiles.flatMap((row) => [...row].map((c) => (walkable.includes(c) ? 0 : 1)));
  for (const n of npcs) solid[n.y * width + n.x] = 1;
  return solid;
}

function build(data: MapData, image: number): WorldMap {
  const width = data.tiles[0].length;
  const height = data.tiles.length;
  const objects = data.objects as MapObject[];
  const npcs = objects.filter((o): o is NpcObject => o.type === 'npc');
  const walkable = data.walkable ?? WALKABLE;
  return {
    id: data.id,
    name: data.name,
    width,
    height,
    tiles: data.tiles,
    solid: solidFor(data.tiles, walkable, npcs),
    walkable,
    image,
    spawn: { ...data.spawn, facing: data.spawn.facing as Facing },
    examine: data.examine,
    objects,
    npcs,
  };
}

/** The map without a character standing in it: they're the one walking the World. */
export function withoutCharacter(map: WorldMap, id: string): WorldMap {
  if (!map.npcs.some((n) => n.character === id)) return map;
  const objects = map.objects.filter((o) => o.type !== 'npc' || o.character !== id);
  const npcs = objects.filter((o): o is NpcObject => o.type === 'npc');
  return { ...map, objects, npcs, solid: solidFor(map.tiles, map.walkable, npcs) };
}

export const MAPS = {
  archive: build(archiveData, require('@/assets/world/archive.png')),
  'courier-road': build(courierRoadData, require('@/assets/world/courier-road.png')),
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
