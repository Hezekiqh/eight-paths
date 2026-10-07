import archiveData from './maps/archive.json';
import courierRoadData from './maps/courier-road.json';
import millbrookData from './maps/millbrook.json';
import waystationData from './maps/waystation.json';
import desertersCampData from './maps/deserters-camp.json';
import cullRoadData from './maps/cull-road.json';
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
import castleGroundsData from './maps/castle-grounds.json';
import castleHallData from './maps/castle-hall.json';
import castleUpperData from './maps/castle-upper.json';
import warHallData from './maps/war-hall.json';
import fieldOfBannersData from './maps/field-of-banners.json';
import titheRoadData from './maps/tithe-road.json';
import brokenWatchData from './maps/broken-watch.json';
import kaldorholdData from './maps/kaldorhold.json';
import gutAndGauntletData from './maps/gut-and-gauntlet.json';
import hallOfKaldorData from './maps/hall-of-kaldor.json';
import ringWardData from './maps/ring-ward.json';
import kaldoriumMaximusData from './maps/kaldorium-maximus.json';
import fightersCellsData from './maps/fighters-cells.json';
import barracksWardData from './maps/barracks-ward.json';
import furyHallData from './maps/fury-hall.json';
import stitcheryData from './maps/stitchery.json';
import ironhouseData from './maps/ironhouse.json';
import frostWardData from './maps/frost-ward.json';
import iceHouseData from './maps/ice-house.json';
import felixMazeData from './maps/felix-maze.json';
import kingdomDungeonData from './maps/kingdom-dungeon.json';
import dungeonMazesData from './maps/dungeon-mazes.json';
import warriorCityData from './maps/warrior-city.json';
import southRoadData from './maps/south-road.json';
import oldMineData from './maps/old-mine.json';
import wcChapelData from './maps/wc-chapel.json';
import wcLibraryData from './maps/wc-library.json';
import wcGuildData from './maps/wc-guild.json';
import wcHospitalData from './maps/wc-hospital.json';
import wcTavernData from './maps/wc-tavern.json';
import wcStoreData from './maps/wc-store.json';
import wcBarnData from './maps/wc-barn.json';
import roomBrannocData from './maps/room-brannoc.json';
import roomYsoldeData from './maps/room-ysolde.json';
import roomQuillData from './maps/room-quill.json';
import roomWrenData from './maps/room-wren.json';
import roomOrenData from './maps/room-oren.json';
import roomPipData from './maps/room-pip.json';
import roomTamsinData from './maps/room-tamsin.json';
import roomMossData from './maps/room-moss.json';
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
  /** Fast asleep where they stand: Zs float up off their head (sleep.ts). Gary, mostly. */
  asleep?: boolean;
  /** Asleep with a snot bubble swelling and shrinking at their nose (sleep.ts): Brannoc, out cold. */
  snot?: boolean;
  /** Drawn flat on their back (head to the right) while asleep: out cold, not dozing where they stand. */
  lying?: boolean;
  /** Awake and on their feet until this story flag is set; then out cold, flat on their back (Brannoc, fainting). */
  faintsAfter?: string;
  /** Standing somewhere else once this story flag is set (carried off to the side of the sand, say). */
  movesAfter?: { flag: string; x: number; y: number };
  /**
   * Watching from the edge, never in the way: nothing bumps into them, so a fight goes exactly as it would
   * without them (the Kaloseum's Warden, and the three you let out, at the side of the sand).
   */
  passable?: boolean;
  /** Drawn this many times bigger (the Warden, standing at the head of the sand, as big as when he fights). */
  size?: number;
  /** Questions you can ask them afterwards, from a menu (plus Goodbye). */
  questions?: Question[];
  /** What they say back when you say Goodbye (Felix's adieu), before the talk closes. */
  farewell?: string[];
  /** A character from the collection: they get the standard three questions (see talk.ts). */
  character?: CharacterId;
  /** What they say instead once a story flag is set. */
  after?: { flag: string; lines: string[] };
  /** A story flag set the first time you talk to them: with `after` on it, they only tell you once (Old Morrow). */
  sets?: string;
  /** A job only one Path can do by talking to them. */
  job?: NpcJob;
  /** Gone from the map once this story flag is set. */
  goneAfter?: string;
  /** Only here once this story flag is set: beaten champions turn up at the bar. */
  comesAfter?: string;
  /**
   * One of the core eight, found here along the road (author, Oct 2, 2026):
   * talking to them the first time, they join your party (meetCharacters) and set
   * `met:<id>`, then head home to wait in the Archive.
   */
  meets?: boolean;
  /** Strolls about, at most this many tiles from where they stand (wander.ts); `along` keeps them to a row or a column. */
  wander?: number;
  along?: 'x' | 'y';
  /** Stays put but looks about now and then: a glance another way, then back (wander.ts). Ignored if they wander. */
  look?: boolean;
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
  /** Others in the fight, of another kind (the castle's throne room: Aurek, at the head of the shadows). */
  with?: { kind: string; x: number; y: number }[];
  intro?: { speaker: string | null; lines: string[] };
};

/** A job done by talking to someone, as one Path: it sets a story flag. */
export type NpcJob = { flag: string; path: string; done: string[]; cant: string[]; joins?: CharacterId[] };

/**
 * Something the player can ask an NPC, and the answer, a line per box. Asking
 * can set a story flag (`sets`), and leave a line of narration once the
 * conversation closes (`then`): how Nib runs off when you're mean to him.
 */
export type Question = {
  ask: string;
  answer: string[];
  sets?: string;
  then?: string[];
  /** The one answering leaves with a flourish once the talk ends (a laugh, then a dash), and then this flag is set. */
  leaves?: string;
  /**
   * A flag set only once `then` has been read to the end, so whoever goes with it (`goneAfter`) is still there while
   * it's told: the prisoners shout their confessions on the way out, and only then are the cells empty.
   */
  after?: string;
  /** A kind or a mean thing to say (honor.ts): every menu has a mean one (author, Oct 4, 2026). */
  deed?: 'good' | 'bad';
};

/** The Archive's quest board: opens the objectives. */
export type BoardObject = { id: string; type: 'board'; x: number; y: number };

/** A chest: opening it once gives its item (see items.ts), with a line or two about the spot. */
export type ChestObject = { id: string; type: 'chest'; x: number; y: number; item: string; lines: string[] };

/** A sign or inscription standing on its own tile: A reads it. */
export type SignObject = { id: string; type: 'sign'; x: number; y: number; lines: string[] };

export type MapObject = NpcObject | BoardObject | ChestObject | SignObject;

/** How a map is drawn by scripts/world-art.mjs: the Archive's rooms, the outdoors, or the dungeons. */
export type MapStyle = 'rooms' | 'outdoor' | 'dungeon';

type MapData = {
  id: string;
  name: string;
  style?: string;
  /** Tile letters you can walk on (default: the Archive's floor and rug). */
  walkable?: string[];
  /** The letter of boulders that can be pushed (the game draws them, so they can move). */
  pushable?: string;
  /** The story flag set when every pressure plate has a boulder on it. */
  platesFlag?: string;
  /** What's said as the plates go down (default: the Drill Yard's gate). */
  platesLines?: string[];
  /** The tile letter the plates raise out of the water once they're down (the Cull Road's ferry-bridge). */
  raises?: string;
  /** Tile letters you can talk across, to whoever's just the other side (a cell's bars). */
  talkThrough?: string[];
  enemies?: { kind: string; x: number; y: number }[];
  /** A boss fight here, until `flag` is set: the boss at (x, y) and the enemies that fight for them. */
  boss?: Boss;
  /** Fights one after another (the Maximus): each visit, the first one not yet won. */
  ladder?: Boss[];
  tiles: string[];
  spawn: { x: number; y: number; facing: string };
  examine: Record<string, string[]>;
  objects: { type: string }[];
  /** Said the first time you walk in (the castle's empty hall). */
  firstVisit?: string[];
};

export type WorldMap = {
  id: string;
  name: string;
  style: MapStyle;
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
  platesLines?: string[];
  /** Drawn raised over the picture once `platesFlag` is set: a bridge brought up out of the river. */
  raises?: string;
  /** Tile letters you can talk across, to whoever's just the other side (a cell's bars). */
  talkThrough?: string[];
  /** Who's waiting to fight you in here, in tiles. They're back each visit. */
  /** `hp`: tougher (or weaker) than the kind usually is, for this fight (the castle's shadows, castle.ts). */
  enemies: { kind: EnemyKind; x: number; y: number; hp?: number }[];
  boss?: Boss;
  /** Fights one after another, a visit each; see withLadder. */
  ladder?: Boss[];
  /** The baked picture from scripts/world-art.mjs, one pixel per art pixel. */
  image: number;
  /** A second picture to flick to and back, a few times a second: the Kaloseum's crowd, on its feet, cheering. */
  cheer?: number;
  /** Where a new game starts, in tiles. */
  spawn: { x: number; y: number; facing: Facing };
  /** What the player reads on examining a tile, by its letter in `tiles`. */
  examine: Record<string, string[]>;
  objects: MapObject[];
  npcs: NpcObject[];
  /** Said the first time you walk in. */
  firstVisit?: string[];
};

/** Floor you can walk on unless a map says otherwise; every other tile letter is solid. */
const WALKABLE = ['.', 'r'];

function letterTiles(tiles: string[], letter: string): number[] {
  const width = tiles[0].length;
  const out: number[] = [];
  tiles.forEach((row, y) => [...row].forEach((c, x) => c === letter && out.push(y * width + x)));
  return out;
}

/** Everything that stands on a tile and blocks it: people, chests, signs. */
type Standing = { x: number; y: number };

function solidFor(tiles: string[], walkable: string[], standing: Standing[]): number[] {
  const width = tiles[0].length;
  const solid = tiles.flatMap((row) => [...row].map((c) => (walkable.includes(c) ? 0 : 1)));
  for (const n of standing) solid[n.y * width + n.x] = 1;
  return solid;
}

const blocking = (objects: MapObject[]): Standing[] =>
  objects.filter((o) => o.type !== 'board' && !(o.type === 'npc' && o.passable));

function build(data: MapData, image: number, cheer?: number): WorldMap {
  const width = data.tiles[0].length;
  const height = data.tiles.length;
  const objects = data.objects as MapObject[];
  const npcs = objects.filter((o): o is NpcObject => o.type === 'npc');
  const walkable = data.walkable ?? WALKABLE;
  return {
    id: data.id,
    name: data.name,
    style: data.style === 'outdoor' || data.style === 'dungeon' ? data.style : 'rooms',
    width,
    height,
    tiles: data.tiles,
    solid: solidFor(data.tiles, walkable, blocking(objects)),
    walkable,
    boulders: data.pushable ? letterTiles(data.tiles, data.pushable) : [],
    plates: letterTiles(data.tiles, 'P'),
    platesFlag: data.platesFlag,
    platesLines: data.platesLines,
    raises: data.raises,
    talkThrough: data.talkThrough,
    boss: data.boss,
    ladder: data.ladder,
    enemies: (data.enemies ?? []).filter((e): e is { kind: EnemyKind; x: number; y: number } =>
      (ENEMY_KINDS as readonly string[]).includes(e.kind),
    ),
    image,
    cheer,
    spawn: { ...data.spawn, facing: data.spawn.facing as Facing },
    examine: data.examine,
    objects,
    npcs,
    firstVisit: data.firstVisit,
  };
}

/** The map with every tile of these letters walkable: doorways and holes that are open to you. */
export function withOpenTiles(map: WorldMap, letters: string[]): WorldMap {
  if (letters.length === 0) return map;
  const walkable = [...map.walkable, ...letters];
  return { ...map, walkable, solid: solidFor(map.tiles, walkable, blocking(map.objects)) };
}

/**
 * The map with its pushable boulders out of the way, for working out where you
 * can get to: every boulder puzzle can be solved (see boulders.test.ts).
 */
export function withBouldersMoved(map: WorldMap): WorldMap {
  if (map.boulders.length === 0) return map;
  const solid = map.solid.slice();
  for (const b of map.boulders) solid[b] = 0;
  return { ...map, solid };
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
  return { ...map, objects, npcs, solid: solidFor(map.tiles, map.walkable, blocking(objects)) };
}

const away = (n: NpcObject, flags: string[]) =>
  (!!n.goneAfter && flags.includes(n.goneAfter)) || (!!n.comesAfter && !flags.includes(n.comesAfter));

/**
 * The map without anyone who isn't here: who has left for good (NpcObject.goneAfter)
 * or hasn't come yet (comesAfter). The same map if everybody's here.
 */
export function withoutGone(map: WorldMap, flags: string[]): WorldMap {
  if (!map.npcs.some((n) => away(n, flags))) return map;
  const objects = map.objects.filter((o) => o.type !== 'npc' || !away(o, flags));
  const npcs = objects.filter((o): o is NpcObject => o.type === 'npc');
  return { ...map, objects, npcs, solid: solidFor(map.tiles, map.walkable, blocking(objects)) };
}

/**
 * Everyone as the story has left them: out cold once they've fainted (`faintsAfter`), and wherever they were
 * moved to (`movesAfter`).
 */
export function withStoryPoses(map: WorldMap, flags: string[]): WorldMap {
  if (!map.npcs.some((n) => n.faintsAfter || n.movesAfter)) return map;
  const pose = (n: NpcObject): NpcObject => {
    let out = n;
    if (n.faintsAfter) {
      const fainted = flags.includes(n.faintsAfter);
      out = { ...out, asleep: fainted, lying: fainted };
    }
    if (n.movesAfter && flags.includes(n.movesAfter.flag)) out = { ...out, x: n.movesAfter.x, y: n.movesAfter.y };
    return out;
  };
  const objects = map.objects.map((o) => (o.type === 'npc' ? pose(o) : o));
  const npcs = objects.filter((o): o is NpcObject => o.type === 'npc');
  return { ...map, objects, npcs, solid: solidFor(map.tiles, map.walkable, blocking(objects)) };
}

/** The map without these people (by id): who's out of their room today, say (hero-rooms.ts). */
export function withoutNpcs(map: WorldMap, ids: string[]): WorldMap {
  if (!map.npcs.some((n) => ids.includes(n.id))) return map;
  const objects = map.objects.filter((o) => o.type !== 'npc' || !ids.includes(o.id));
  const npcs = objects.filter((o): o is NpcObject => o.type === 'npc');
  return { ...map, objects, npcs, solid: solidFor(map.tiles, map.walkable, blocking(objects)) };
}

/** A ladder's fight for this visit: the first not yet won (the last, already won, once you've climbed it). */
export function withLadder(map: WorldMap, flags: string[]): WorldMap {
  if (!map.ladder || map.ladder.length === 0) return map;
  const next = map.ladder.find((b) => !flags.includes(b.flag)) ?? map.ladder[map.ladder.length - 1];
  return { ...map, boss: next };
}

export const MAPS = {
  archive: build(archiveData, require('@/assets/world/archive.png')),
  'courier-road': build(courierRoadData, require('@/assets/world/courier-road.png')),
  millbrook: build(millbrookData, require('@/assets/world/millbrook.png')),
  waystation: build(waystationData, require('@/assets/world/waystation.png')),
  'deserters-camp': build(desertersCampData, require('@/assets/world/deserters-camp.png')),
  'cull-road': build(cullRoadData as MapData, require('@/assets/world/cull-road.png')),
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
  'the-pit': build(
    thePitData as MapData,
    require('@/assets/world/the-pit.png'),
    require('@/assets/world/the-pit-cheer.png'),
  ),
  'castle-grounds': build(castleGroundsData as MapData, require('@/assets/world/castle-grounds.png')),
  'castle-hall': build(castleHallData as MapData, require('@/assets/world/castle-hall.png')),
  'castle-upper': build(castleUpperData as MapData, require('@/assets/world/castle-upper.png')),
  'war-hall': build(warHallData as MapData, require('@/assets/world/war-hall.png')),
  'field-of-banners': build(fieldOfBannersData as MapData, require('@/assets/world/field-of-banners.png')),
  'tithe-road': build(titheRoadData as MapData, require('@/assets/world/tithe-road.png')),
  'broken-watch': build(brokenWatchData as MapData, require('@/assets/world/broken-watch.png')),
  kaldorhold: build(kaldorholdData as MapData, require('@/assets/world/kaldorhold.png')),
  'gut-and-gauntlet': build(gutAndGauntletData as MapData, require('@/assets/world/gut-and-gauntlet.png')),
  'hall-of-kaldor': build(hallOfKaldorData as MapData, require('@/assets/world/hall-of-kaldor.png')),
  'ring-ward': build(ringWardData as MapData, require('@/assets/world/ring-ward.png')),
  'kaldorium-maximus': build(kaldoriumMaximusData as MapData, require('@/assets/world/kaldorium-maximus.png')),
  'fighters-cells': build(fightersCellsData as MapData, require('@/assets/world/fighters-cells.png')),
  'barracks-ward': build(barracksWardData as MapData, require('@/assets/world/barracks-ward.png')),
  'fury-hall': build(furyHallData as MapData, require('@/assets/world/fury-hall.png')),
  stitchery: build(stitcheryData as MapData, require('@/assets/world/stitchery.png')),
  ironhouse: build(ironhouseData as MapData, require('@/assets/world/ironhouse.png')),
  'frost-ward': build(frostWardData as MapData, require('@/assets/world/frost-ward.png')),
  'ice-house': build(iceHouseData as MapData, require('@/assets/world/ice-house.png')),
  'felix-maze': build(felixMazeData as MapData, require('@/assets/world/felix-maze.png')),
  'kingdom-dungeon': build(kingdomDungeonData as MapData, require('@/assets/world/kingdom-dungeon.png')),
  'dungeon-mazes': build(dungeonMazesData as MapData, require('@/assets/world/dungeon-mazes.png')),
  'warrior-city': build(warriorCityData as MapData, require('@/assets/world/warrior-city.png')),
  'south-road': build(southRoadData as MapData, require('@/assets/world/south-road.png')),
  'old-mine': build(oldMineData as MapData, require('@/assets/world/old-mine.png')),
  'wc-chapel': build(wcChapelData as MapData, require('@/assets/world/wc-chapel.png')),
  'wc-library': build(wcLibraryData as MapData, require('@/assets/world/wc-library.png')),
  'wc-guild': build(wcGuildData as MapData, require('@/assets/world/wc-guild.png')),
  'wc-hospital': build(wcHospitalData as MapData, require('@/assets/world/wc-hospital.png')),
  'wc-tavern': build(wcTavernData as MapData, require('@/assets/world/wc-tavern.png')),
  'wc-store': build(wcStoreData as MapData, require('@/assets/world/wc-store.png')),
  'wc-barn': build(wcBarnData as MapData, require('@/assets/world/wc-barn.png')),
  'room-brannoc': build(roomBrannocData as MapData, require('@/assets/world/room-brannoc.png')),
  'room-ysolde': build(roomYsoldeData as MapData, require('@/assets/world/room-ysolde.png')),
  'room-quill': build(roomQuillData as MapData, require('@/assets/world/room-quill.png')),
  'room-wren': build(roomWrenData as MapData, require('@/assets/world/room-wren.png')),
  'room-oren': build(roomOrenData as MapData, require('@/assets/world/room-oren.png')),
  'room-pip': build(roomPipData as MapData, require('@/assets/world/room-pip.png')),
  'room-tamsin': build(roomTamsinData as MapData, require('@/assets/world/room-tamsin.png')),
  'room-moss': build(roomMossData as MapData, require('@/assets/world/room-moss.png')),
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
