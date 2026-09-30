import archiveData from './maps/archive.json';
import courierRoadData from './maps/courier-road.json';
import millbrookData from './maps/millbrook.json';
import waystationData from './maps/waystation.json';
import desertersCampData from './maps/deserters-camp.json';
import barracksHallData from './maps/barracks-hall.json';
import barracksArmouryData from './maps/barracks-armoury.json';
import officersMessData from './maps/officers-mess.json';
import barracksYardData from './maps/barracks-yard.json';
import pitBelowData from './maps/pit-below.json';
import lowerBarracksData from './maps/lower-barracks.json';
import sleepingKeepData from './maps/sleeping-keep.json';
import marchRoadData from './maps/march-road.json';
import kingdomTownData from './maps/kingdom-town.json';
import candleInnData from './maps/candle-inn.json';
import forgeData from './maps/forge.json';
import chapelData from './maps/chapel.json';
import oldKingsCryptData from './maps/old-kings-crypt.json';
import hedgeMazeData from './maps/hedge-maze.json';
import thePitData from './maps/the-pit.json';
import warDoorsData from './maps/war-doors.json';
import warHallData from './maps/war-hall.json';
import fieldOfBannersData from './maps/field-of-banners.json';
import type { CharacterId } from '@/story/companions';

import { ENEMY_KINDS, type EnemyKind } from './combat';

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
  /** What they say instead once a story flag is set. */
  after?: { flag: string; lines: string[] };
  /** A job only one Path can do by talking to them. */
  job?: NpcJob;
};

/**
 * A fight here until `flag` is set: whoever stands at (x, y), and the enemies
 * (of `kind`, default the sofa-bearers) who fight for them. `intro` is said as you come in.
 */
export type Boss = {
  flag: string;
  x: number;
  y: number;
  bearers: number[][];
  kind?: string;
  intro?: { speaker: string | null; lines: string[] };
};

/** A job done by talking to someone, as one Path: it sets a story flag. */
export type NpcJob = { flag: string; path: string; done: string[]; cant: string[]; joins?: CharacterId[] };

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
  /** The letter of boulders that can be pushed (the game draws them, so they can move). */
  pushable?: string;
  /** The story flag set when every pressure plate has a boulder on it. */
  platesFlag?: string;
  enemies?: { kind: string; x: number; y: number }[];
  /** A boss fight here, until `flag` is set: the boss at (x, y) and the enemies that fight for them. */
  boss?: Boss;
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
  /** Pushable boulders where they start, and the pressure plates ('P'), as y * width + x. */
  boulders: number[];
  plates: number[];
  platesFlag?: string;
  /** Who's waiting to fight you in here, in tiles. They're back each visit. */
  enemies: { kind: EnemyKind; x: number; y: number }[];
  boss?: Boss;
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

function letterTiles(tiles: string[], letter: string): number[] {
  const width = tiles[0].length;
  const out: number[] = [];
  tiles.forEach((row, y) => [...row].forEach((c, x) => c === letter && out.push(y * width + x)));
  return out;
}

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
    boulders: data.pushable ? letterTiles(data.tiles, data.pushable) : [],
    plates: letterTiles(data.tiles, 'P'),
    platesFlag: data.platesFlag,
    boss: data.boss,
    enemies: (data.enemies ?? []).filter((e): e is { kind: EnemyKind; x: number; y: number } =>
      (ENEMY_KINDS as readonly string[]).includes(e.kind),
    ),
    image,
    spawn: { ...data.spawn, facing: data.spawn.facing as Facing },
    examine: data.examine,
    objects,
    npcs,
  };
}

/** The map with every tile of these letters walkable: doorways and holes that are open to you. */
export function withOpenTiles(map: WorldMap, letters: string[]): WorldMap {
  if (letters.length === 0) return map;
  const walkable = [...map.walkable, ...letters];
  return { ...map, walkable, solid: solidFor(map.tiles, walkable, map.npcs) };
}

/** Every tile (as y * width + x) with one of these letters. */
export function tilesOf(map: WorldMap, letters: string[]): number[] {
  const out: number[] = [];
  map.tiles.forEach((row, y) => [...row].forEach((c, x) => letters.includes(c) && out.push(y * map.width + x)));
  return out;
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
  millbrook: build(millbrookData, require('@/assets/world/millbrook.png')),
  waystation: build(waystationData, require('@/assets/world/waystation.png')),
  'deserters-camp': build(desertersCampData, require('@/assets/world/deserters-camp.png')),
  'barracks-hall': build(barracksHallData, require('@/assets/world/barracks-hall.png')),
  'barracks-armoury': build(barracksArmouryData, require('@/assets/world/barracks-armoury.png')),
  'officers-mess': build(officersMessData, require('@/assets/world/officers-mess.png')),
  'barracks-yard': build(barracksYardData, require('@/assets/world/barracks-yard.png')),
  'pit-below': build(pitBelowData, require('@/assets/world/pit-below.png')),
  'lower-barracks': build(lowerBarracksData, require('@/assets/world/lower-barracks.png')),
  'sleeping-keep': build(sleepingKeepData, require('@/assets/world/sleeping-keep.png')),
  'march-road': build(marchRoadData as MapData, require('@/assets/world/march-road.png')),
  'kingdom-town': build(kingdomTownData as MapData, require('@/assets/world/kingdom-town.png')),
  'candle-inn': build(candleInnData as MapData, require('@/assets/world/candle-inn.png')),
  forge: build(forgeData as MapData, require('@/assets/world/forge.png')),
  chapel: build(chapelData as MapData, require('@/assets/world/chapel.png')),
  'old-kings-crypt': build(oldKingsCryptData as MapData, require('@/assets/world/old-kings-crypt.png')),
  'hedge-maze': build(hedgeMazeData as MapData, require('@/assets/world/hedge-maze.png')),
  'the-pit': build(thePitData as MapData, require('@/assets/world/the-pit.png')),
  'war-doors': build(warDoorsData as MapData, require('@/assets/world/war-doors.png')),
  'war-hall': build(warHallData as MapData, require('@/assets/world/war-hall.png')),
  'field-of-banners': build(fieldOfBannersData as MapData, require('@/assets/world/field-of-banners.png')),
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
