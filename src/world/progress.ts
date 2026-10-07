import {
  BASE_XP,
  CLASSES,
  levelFromXp,
  overallLevelFromXp,
  tasksToNextOverallLevel,
  xpToNextLevel,
  type Dimension,
} from '@/game';

import { COMPANIONS, type CharacterId } from '@/story/companions';

import { GATE_FLAG } from './castle';

import type { Facing, MapId } from './maps';

// The World's only gates are the player's real levels (WORLDS.md): the road
// onward opens with the overall level, and hard-to-reach places need a Path
// level. This file says what each way out needs, and how far off the player is,
// counted in real habits.

export type Requirement =
  | { kind: 'overall'; level: number }
  | { kind: 'path'; dimension: Dimension; level: number }
  /** Any one Path at this level: "level up once, any way you like". */
  | { kind: 'anyPath'; level: number }
  /** Something done in the World (a winch pulled, a wall broken). `label` names it; `hint` says how. */
  | { kind: 'flag'; flag: string; label: string; hint: string }
  /** Every one of these. */
  | { kind: 'all'; of: Requirement[] };

export type Arrival = { map: MapId; x: number; y: number; facing: Facing };

export type Exit = {
  id: string;
  /** The map it leads out of. */
  from: MapId;
  /** Its tile letter in that map. */
  tile: string;
  /** What the player calls it (never the name of where it goes: that's for finding out). */
  label: string;
  /** Where you step out, in tiles; null while that area is still being built. */
  to: Arrival | null;
  needs: Requirement;
  /** Never a gate (the way home, a side road, a building's door), so it isn't listed as a goal. */
  back?: boolean;
  /** Walk into it to go through (doorways, holes, road ends), instead of pressing A (doors, ladders). */
  walk?: boolean;
};

/**
 * The Archive's door opens the first time any Path levels up (everyone starts
 * at Lv 5): one habit, the first "LEVELED UP!" a new player sees.
 */
export const ARCHIVE_DOOR_LEVEL = 6;

/**
 * After the door, three gates and no more (author, Oct 4, 2026: Season 1 beatable in 30 to 50
 * habits over two or three days; the story's the draw, habits are the fuel): the road north out of
 * Warrior City at Lv 10, the king at Lv 18, and the end of Season 1 at Lv 20. Overall, so any
 * habit counts. Recruiting the core eight (Lv 6 on each one's Path, see meet.ts) fills the gaps.
 */
export const NORTH_ROAD_LEVEL = 10;
export const KING_LEVEL = 18;

/**
 * To face the king you need the whole party (author, Oct 4, 2026): Brannoc above all (it's his
 * father's throne), and the other seven. Each is the `met:` flag of meet.ts, set when they join.
 */
const WHERE: Record<string, string> = {
  brannoc: 'He is in a cell under the Kaloseum, in Warrior City.',
  ysolde: "She is in Warrior City's adventurers' guild.",
  quill: "He is in Warrior City's library.",
  wren: "She is in Warrior City's chapel.",
  oren: "She is in Warrior City's hospital.",
  pip: "He is in Warrior City's tavern.",
  tamsin: 'She is down the old mine, south of Warrior City.',
  moss: "He is in Warrior City's horse barn.",
};
export const WHOLE_PARTY: Requirement[] = (Object.keys(WHERE) as CharacterId[]).map((id) => ({
  kind: 'flag',
  flag: `met:${id}`,
  label: `Bring ${COMPANIONS[id].name} into your party`,
  hint: WHERE[id],
}));

/** Set once a boulder sits on each plate by the Cull Road's river: the ferry-bridge is up for good. */
export const CULL_FERRY = 'cull-ferry';

/** Never locked. */
const OPEN: Requirement = { kind: 'overall', level: 0 };

/**
 * Season 1 ends at this overall level (author, Sep 29, 2026): 35 habits
 * of any kind. Later kingdoms arrive as new seasons, each with its own finish.
 */
export const FINAL_GOAL = { kind: 'overall', level: 20 } as const satisfies Requirement;

export const EXITS: Exit[] = [
  {
    id: 'archive-door',
    from: 'archive',
    tile: '=',
    label: 'The great door',
    to: { map: 'courier-road', x: 12, y: 2, facing: 'down' },
    needs: { kind: 'anyPath', level: ARCHIVE_DOOR_LEVEL },
  },
  {
    id: 'road-archive',
    from: 'courier-road',
    tile: '=',
    label: 'The Archive door',
    to: { map: 'archive', x: 17, y: 11, facing: 'up' },
    needs: { kind: 'overall', level: 0 },
    back: true,
  },
  {
    id: 'road-waystation',
    from: 'courier-road',
    tile: 'D',
    label: 'The Waystation',
    to: { map: 'waystation', x: 5, y: 6, facing: 'up' },
    needs: { kind: 'overall', level: 0 },
    back: true,
  },
  {
    id: 'waystation-road',
    from: 'waystation',
    tile: '=',
    label: 'The door',
    to: { map: 'courier-road', x: 18, y: 6, facing: 'down' },
    needs: { kind: 'overall', level: 0 },
    back: true,
  },
  {
    id: 'road-millbrook',
    from: 'courier-road',
    tile: '<',
    label: 'The road west',
    to: { map: 'millbrook', x: 32, y: 7, facing: 'left' },
    needs: { kind: 'overall', level: 0 },
    back: true,
  },
  {
    id: 'millbrook-road',
    from: 'millbrook',
    tile: '>',
    label: 'The road east',
    to: { map: 'courier-road', x: 1, y: 7, facing: 'right' },
    needs: { kind: 'overall', level: 0 },
    back: true,
  },
  {
    id: 'road-onward',
    from: 'courier-road',
    tile: '>',
    label: 'The road east',
    to: { map: 'felix-maze', x: 1, y: 5, facing: 'right' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    // Felix's boulder maze sits between the road and the camp (felix-maze.ts).
    id: 'maze-west',
    from: 'felix-maze',
    tile: '<',
    label: 'The road west',
    to: { map: 'courier-road', x: 38, y: 7, facing: 'left' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'maze-east',
    from: 'felix-maze',
    tile: '>',
    label: 'The road east',
    to: { map: 'warrior-city', x: 2, y: 19, facing: 'right' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  // The Cull Road (author, Oct 7, 2026), between Warrior City and the deserters' camp: the road the
  // unfit children are walked down at twelve. Tithe-takers on it, shadows at the camp's broken gate,
  // and a ferry-bridge sunk in the river that only rises with a boulder on each plate in the bank.
  // Listed before the camp's own ways, so the guide asks for the bridge before the fort in the hill.
  {
    id: 'cull-camp',
    from: 'cull-road',
    tile: '=',
    label: 'The ferry-bridge',
    to: { map: 'deserters-camp', x: 1, y: 7, facing: 'right' },
    needs: {
      // in an "all" so the bridge isn't drawn as a hole once it's up: the game draws it raised (maps.ts raises)
      kind: 'all',
      of: [
        {
          kind: 'flag',
          flag: CULL_FERRY,
          label: 'Raise the ferry-bridge',
          hint: 'Two plates in the bank, chained to it. Something heavy on each.',
        },
      ],
    },
    walk: true,
  },
  {
    id: 'cull-city',
    from: 'cull-road',
    tile: '<',
    label: 'The road back to the city',
    to: { map: 'warrior-city', x: 31, y: 2, facing: 'down' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'camp-road',
    from: 'deserters-camp',
    tile: '<',
    label: 'The road west',
    to: { map: 'cull-road', x: 31, y: 6, facing: 'left' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'camp-barracks',
    from: 'deserters-camp',
    tile: 'E',
    label: 'The fort in the hill',
    to: { map: 'barracks-hall', x: 8, y: 8, facing: 'up' },
    needs: OPEN,
    walk: true,
  },
  {
    id: 'hall-camp',
    from: 'barracks-hall',
    tile: 'E',
    label: 'The way out',
    to: { map: 'deserters-camp', x: 14, y: 4, facing: 'down' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'hall-armoury',
    from: 'barracks-hall',
    tile: '1',
    label: 'A hole in the wall',
    to: { map: 'barracks-armoury', x: 2, y: 4, facing: 'right' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'armoury-hall',
    from: 'barracks-armoury',
    tile: '1',
    label: 'The hole to the hall',
    to: { map: 'barracks-hall', x: 15, y: 5, facing: 'left' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'hall-yard',
    from: 'barracks-hall',
    tile: 'G',
    label: 'The portcullis',
    to: { map: 'barracks-yard', x: 8, y: 10, facing: 'up' },
    needs: {
      kind: 'flag',
      flag: 'hall-portcullis',
      label: 'Raise the portcullis',
      hint: 'Somewhere there must be a winch.',
    },
    walk: true,
  },
  {
    id: 'yard-hall',
    from: 'barracks-yard',
    tile: 'E',
    label: 'The way back',
    to: { map: 'barracks-hall', x: 8, y: 2, facing: 'down' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'armoury-mess',
    from: 'barracks-armoury',
    tile: 'C',
    label: 'The cracked wall',
    to: { map: 'officers-mess', x: 4, y: 4, facing: 'up' },
    needs: { kind: 'flag', flag: 'armoury-wall', label: 'Break the cracked wall', hint: 'A Warrior could break it.' },
    back: true,
    walk: true,
  },
  {
    id: 'mess-armoury',
    from: 'officers-mess',
    tile: '2',
    label: 'The broken wall',
    to: { map: 'barracks-armoury', x: 10, y: 2, facing: 'down' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'yard-lower',
    from: 'barracks-yard',
    tile: 'G',
    label: 'The yard gate',
    to: { map: 'lower-barracks', x: 3, y: 3, facing: 'down' },
    needs: {
      kind: 'flag',
      flag: 'yard-plates',
      label: 'Open the yard gate',
      hint: 'Three shields together: something heavy on every plate.',
    },
    walk: true,
  },
  {
    id: 'lower-yard',
    from: 'lower-barracks',
    tile: 'e',
    label: 'The ladder up',
    to: { map: 'barracks-yard', x: 7, y: 2, facing: 'down' },
    needs: OPEN,
    back: true,
  },
  {
    id: 'yard-pit',
    from: 'barracks-yard',
    tile: 'H',
    label: 'A ladder down',
    to: { map: 'pit-below', x: 6, y: 5, facing: 'down' },
    needs: OPEN,
    back: true,
  },
  {
    id: 'pit-yard',
    from: 'pit-below',
    tile: 'a',
    label: 'The ladder up',
    to: { map: 'barracks-yard', x: 10, y: 9, facing: 'down' },
    needs: OPEN,
    back: true,
  },
  {
    id: 'lower-keep',
    from: 'lower-barracks',
    tile: 'K',
    label: 'The great door',
    to: { map: 'sleeping-keep', x: 8, y: 7, facing: 'up' },
    needs: OPEN,
    walk: true,
  },
  {
    id: 'keep-lower',
    from: 'sleeping-keep',
    tile: 'K',
    label: 'The great door',
    to: { map: 'lower-barracks', x: 24, y: 12, facing: 'up' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'keep-exit',
    from: 'sleeping-keep',
    tile: '3',
    label: 'The hole behind the sofa',
    to: { map: 'march-road', x: 2, y: 3, facing: 'down' },
    needs: {
      kind: 'all',
      of: [
        {
          kind: 'flag',
          flag: 'plush-won',
          label: 'Win over Baron Plush',
          hint: 'The Baron is in the way. Wake him up.',
        },
      ],
    },
    walk: true,
  },
  {
    id: 'march-keep',
    from: 'march-road',
    tile: 'o',
    label: 'The hole',
    to: { map: 'sleeping-keep', x: 9, y: 2, facing: 'down' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'march-town',
    from: 'march-road',
    tile: 'G',
    label: 'The horde checkpoint',
    to: { map: 'kingdom-town', x: 1, y: 10, facing: 'right' },
    needs: {
      kind: 'flag',
      flag: 'checkpoint',
      label: 'Get past the checkpoint',
      hint: 'The raiders can be bought, or talked round.',
    },
    walk: true,
  },
  {
    id: 'town-march',
    from: 'kingdom-town',
    tile: '<',
    label: 'The gate out',
    to: { map: 'march-road', x: 28, y: 5, facing: 'left' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'town-inn',
    from: 'kingdom-town',
    tile: '5',
    label: 'The Candle Inn',
    to: { map: 'candle-inn', x: 5, y: 5, facing: 'up' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'inn-town',
    from: 'candle-inn',
    tile: '1',
    label: 'The door',
    to: { map: 'kingdom-town', x: 5, y: 5, facing: 'down' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'town-forge',
    from: 'kingdom-town',
    tile: '6',
    label: 'The forge',
    to: { map: 'forge', x: 5, y: 4, facing: 'up' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'forge-town',
    from: 'forge',
    tile: '1',
    label: 'The door',
    to: { map: 'kingdom-town', x: 13, y: 5, facing: 'down' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'town-chapel',
    from: 'kingdom-town',
    tile: '7',
    label: 'The chapel',
    to: { map: 'chapel', x: 6, y: 5, facing: 'up' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'chapel-town',
    from: 'chapel',
    tile: '1',
    label: 'The door',
    to: { map: 'kingdom-town', x: 26, y: 5, facing: 'down' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'chapel-crypt',
    from: 'chapel',
    tile: '4',
    label: 'The hidden stair',
    to: { map: 'old-kings-crypt', x: 4, y: 5, facing: 'up' },
    needs: {
      kind: 'flag',
      flag: 'crypt-found',
      label: 'Find the hidden stair',
      hint: "A Cleric's light might show it.",
    },
    back: true,
    walk: true,
  },
  {
    id: 'crypt-chapel',
    from: 'old-kings-crypt',
    tile: '2',
    label: 'The stair up',
    to: { map: 'chapel', x: 8, y: 5, facing: 'down' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'town-maze',
    from: 'kingdom-town',
    tile: '9',
    label: 'The hedge maze',
    to: { map: 'hedge-maze', x: 4, y: 11, facing: 'up' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'maze-town',
    from: 'hedge-maze',
    tile: '>',
    label: 'The way out',
    to: { map: 'kingdom-town', x: 30, y: 16, facing: 'down' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'town-pit',
    from: 'warrior-city',
    tile: '1',
    label: 'The Kaloseum',
    to: { map: 'the-pit', x: 15, y: 15, facing: 'up' },
    // every player reaches Warrior City as the Kaloseum's champion (the prison break), so it's open
    needs: OPEN,
    walk: true,
  },
  {
    id: 'pit-town',
    from: 'the-pit',
    tile: '1',
    label: 'The way out',
    to: { map: 'warrior-city', x: 31, y: 23, facing: 'down' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'town-keep',
    from: 'kingdom-town',
    tile: 'E',
    label: 'The castle road',
    to: { map: 'castle-grounds', x: 19, y: 28, facing: 'up' },
    needs: {
      kind: 'all',
      of: [
        {
          kind: 'flag',
          flag: 'pit-champion',
          label: 'Win at the Kaloseum',
          hint: 'Beat five guards and the warden at the Kaloseum.',
        },
        {
          kind: 'flag',
          flag: 'old-law',
          label: 'Read the old law',
          hint: 'It is carved in the heart of the hedge maze.',
        },
        {
          kind: 'flag',
          flag: 'cages-open',
          label: 'Free the cages',
          hint: 'The cage guard takes bribes. A court needs witnesses.',
        },
        {
          kind: 'flag',
          flag: 'varga-witness',
          label: 'Earn Captain Varga',
          hint: "She'll witness a challenge for anyone who won't rise to her.",
        },
        {
          kind: 'flag',
          flag: 'forge-fixed',
          label: "Mend Harrow's forge",
          hint: "Brannoc's armour hasn't fitted in five hundred years.",
        },
        ...WHOLE_PARTY,
        { kind: 'overall', level: KING_LEVEL },
      ],
    },
    walk: true,
  },
  // Kaldor's castle (author, Oct 4, 2026; castle.ts): the grounds and the gate guards, the empty
  // hall (straight on to the throne room, or up the winding stair to the king's floor), the throne.
  {
    id: 'grounds-town',
    from: 'castle-grounds',
    tile: '_',
    label: 'The road back to town',
    to: { map: 'kingdom-town', x: 20, y: 2, facing: 'down' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'grounds-hall',
    from: 'castle-grounds',
    tile: '2',
    label: 'The drawbridge',
    to: { map: 'castle-hall', x: 12, y: 14, facing: 'up' },
    needs: {
      // in an "all" so the bridge isn't drawn as a hole once it's open: the game draws it down (castle.ts)
      kind: 'all',
      of: [
        {
          kind: 'flag',
          flag: GATE_FLAG,
          label: 'Get past the gate guards',
          hint: 'Captain Orsk keeps the bridge up. Talk, push, pay or argue your way past.',
        },
      ],
    },
    walk: true,
  },
  {
    id: 'hall-grounds',
    from: 'castle-hall',
    tile: '1',
    label: 'The way out',
    to: { map: 'castle-grounds', x: 19, y: 12, facing: 'down' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'hall-upper',
    from: 'castle-hall',
    tile: '%',
    label: 'The winding stair',
    to: { map: 'castle-upper', x: 27, y: 11, facing: 'left' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'upper-hall',
    from: 'castle-upper',
    tile: '%',
    label: 'The winding stair',
    to: { map: 'castle-hall', x: 3, y: 12, facing: 'down' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  // The castle's new rooms (author, Oct 7, 2026): the mess hall and the royal dungeon off the Great Hall, the old
  // queen's room and the king's bedchamber off the King's Floor.
  {
    id: 'hall-mess',
    from: 'castle-hall',
    tile: '2',
    label: 'The noisy doorway',
    to: { map: 'mess-hall', x: 16, y: 9, facing: 'up' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'mess-back',
    from: 'mess-hall',
    tile: '1',
    label: 'The way back',
    to: { map: 'castle-hall', x: 19, y: 14, facing: 'up' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'hall-dungeon',
    from: 'castle-hall',
    tile: '3',
    label: 'The steps down',
    to: { map: 'royal-dungeon', x: 20, y: 2, facing: 'down' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'dungeon-hall',
    from: 'royal-dungeon',
    tile: '1',
    label: 'The steps up',
    to: { map: 'castle-hall', x: 6, y: 14, facing: 'up' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'upper-queen',
    from: 'castle-upper',
    tile: '2',
    label: 'The grey door',
    to: { map: 'queens-room', x: 6, y: 6, facing: 'up' },
    needs: OPEN,
    back: true,
  },
  {
    id: 'queen-upper',
    from: 'queens-room',
    tile: '1',
    label: 'The door',
    to: { map: 'castle-upper', x: 6, y: 11, facing: 'down' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'upper-king',
    from: 'castle-upper',
    tile: '3',
    label: 'The gold doors',
    to: { map: 'kings-bedchamber', x: 8, y: 7, facing: 'up' },
    needs: OPEN,
    back: true,
  },
  {
    id: 'king-upper',
    from: 'kings-bedchamber',
    tile: '1',
    label: 'The doors',
    to: { map: 'castle-upper', x: 14, y: 11, facing: 'down' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'hall-throne',
    from: 'castle-hall',
    tile: '4',
    label: 'The throne room',
    to: { map: 'war-hall', x: 11, y: 10, facing: 'up' },
    needs: OPEN,
    walk: true,
  },
  {
    id: 'throne-hall',
    from: 'war-hall',
    tile: '1',
    label: 'The doors',
    to: { map: 'castle-hall', x: 12, y: 2, facing: 'down' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  // East of the town: Kaldorhold, the city Kaldor built on top of the old one (KINGDOM-EXPANSION.md).
  {
    id: 'town-east',
    from: 'kingdom-town',
    tile: '>',
    label: 'The east gate',
    to: { map: 'kaldorhold', x: 1, y: 10, facing: 'right' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'kaldorhold-town',
    from: 'kaldorhold',
    tile: '<',
    label: 'The way west',
    to: { map: 'kingdom-town', x: 38, y: 10, facing: 'left' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'kaldorhold-ring',
    from: 'kaldorhold',
    tile: '^',
    label: 'The way north',
    to: { map: 'ring-ward', x: 15, y: 12, facing: 'up' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'kaldorhold-east',
    from: 'kaldorhold',
    tile: '>',
    label: 'The east road',
    to: { map: 'barracks-ward', x: 1, y: 6, facing: 'right' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'kaldorhold-south',
    from: 'kaldorhold',
    tile: '_',
    label: 'The south street',
    to: { map: 'frost-ward', x: 16, y: 1, facing: 'down' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'kaldorhold-gut',
    from: 'kaldorhold',
    tile: '5',
    label: 'The Gut & Gauntlet',
    to: { map: 'gut-and-gauntlet', x: 8, y: 7, facing: 'up' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'gut-kaldorhold',
    from: 'gut-and-gauntlet',
    tile: '1',
    label: 'The way out',
    to: { map: 'kaldorhold', x: 6, y: 5, facing: 'down' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'kaldorhold-hall',
    from: 'kaldorhold',
    tile: '6',
    label: 'The Hall of Kaldor',
    to: { map: 'hall-of-kaldor', x: 8, y: 6, facing: 'up' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'hall-kaldorhold',
    from: 'hall-of-kaldor',
    tile: '1',
    label: 'The way out',
    to: { map: 'kaldorhold', x: 32, y: 5, facing: 'down' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'ring-kaldorhold',
    from: 'ring-ward',
    tile: '_',
    label: 'The way south',
    to: { map: 'kaldorhold', x: 19, y: 1, facing: 'down' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'ring-maximus',
    from: 'ring-ward',
    tile: '8',
    label: 'The yard gate',
    to: { map: 'kaldorium-maximus', x: 9, y: 9, facing: 'up' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'maximus-ring',
    from: 'kaldorium-maximus',
    tile: '1',
    label: 'The way out',
    to: { map: 'ring-ward', x: 15, y: 5, facing: 'down' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'ring-cells',
    from: 'ring-ward',
    tile: '4',
    label: "The fighters' door",
    to: { map: 'fighters-cells', x: 6, y: 5, facing: 'up' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  // Each hero's room off the Archive (author, Oct 3, 2026): a hidden door in the wall, open once you've met them.
  {
    id: 'archive-brannoc',
    from: 'archive',
    tile: '1',
    label: "Brannoc's room",
    to: { map: 'room-brannoc', x: 5, y: 6, facing: 'up' },
    needs: { kind: 'flag', flag: 'met:brannoc', label: 'Meet Brannoc', hint: 'Brannoc is out there somewhere.' },
    back: true,
    walk: true,
  },
  {
    id: 'room-brannoc-archive',
    from: 'room-brannoc',
    tile: '1',
    label: 'The Archive',
    to: { map: 'archive', x: 3, y: 3, facing: 'down' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'archive-ysolde',
    from: 'archive',
    tile: '2',
    label: "Ysolde's room",
    to: { map: 'room-ysolde', x: 5, y: 6, facing: 'up' },
    needs: { kind: 'flag', flag: 'met:ysolde', label: 'Meet Ysolde', hint: 'Ysolde is out there somewhere.' },
    back: true,
    walk: true,
  },
  {
    id: 'room-ysolde-archive',
    from: 'room-ysolde',
    tile: '1',
    label: 'The Archive',
    to: { map: 'archive', x: 13, y: 3, facing: 'down' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'archive-quill',
    from: 'archive',
    tile: '3',
    label: "Quill's room",
    to: { map: 'room-quill', x: 5, y: 6, facing: 'up' },
    needs: { kind: 'flag', flag: 'met:quill', label: 'Meet Quill', hint: 'Quill is out there somewhere.' },
    back: true,
    walk: true,
  },
  {
    id: 'room-quill-archive',
    from: 'room-quill',
    tile: '1',
    label: 'The Archive',
    to: { map: 'archive', x: 22, y: 3, facing: 'down' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'archive-wren',
    from: 'archive',
    tile: '4',
    label: "Wren's room",
    to: { map: 'room-wren', x: 5, y: 6, facing: 'up' },
    needs: { kind: 'flag', flag: 'met:wren', label: 'Meet Wren', hint: 'Wren is out there somewhere.' },
    back: true,
    walk: true,
  },
  {
    id: 'room-wren-archive',
    from: 'room-wren',
    tile: '1',
    label: 'The Archive',
    to: { map: 'archive', x: 32, y: 3, facing: 'down' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'archive-oren',
    from: 'archive',
    tile: '5',
    label: "Oren's room",
    to: { map: 'room-oren', x: 5, y: 6, facing: 'up' },
    needs: { kind: 'flag', flag: 'met:oren', label: 'Meet Oren', hint: 'Oren is out there somewhere.' },
    back: true,
    walk: true,
  },
  {
    id: 'room-oren-archive',
    from: 'room-oren',
    tile: '1',
    label: 'The Archive',
    to: { map: 'archive', x: 4, y: 11, facing: 'up' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'archive-pip',
    from: 'archive',
    tile: '6',
    label: "Pip's room",
    to: { map: 'room-pip', x: 5, y: 6, facing: 'up' },
    needs: { kind: 'flag', flag: 'met:pip', label: 'Meet Pip', hint: 'Pip is out there somewhere.' },
    back: true,
    walk: true,
  },
  {
    id: 'room-pip-archive',
    from: 'room-pip',
    tile: '1',
    label: 'The Archive',
    to: { map: 'archive', x: 12, y: 11, facing: 'up' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'archive-tamsin',
    from: 'archive',
    tile: '7',
    label: "Tamsin's room",
    to: { map: 'room-tamsin', x: 5, y: 6, facing: 'up' },
    needs: { kind: 'flag', flag: 'met:tamsin', label: 'Meet Tamsin', hint: 'Tamsin is out there somewhere.' },
    back: true,
    walk: true,
  },
  {
    id: 'room-tamsin-archive',
    from: 'room-tamsin',
    tile: '1',
    label: 'The Archive',
    to: { map: 'archive', x: 23, y: 11, facing: 'up' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'archive-moss',
    from: 'archive',
    tile: '8',
    label: "Moss's room",
    to: { map: 'room-moss', x: 5, y: 6, facing: 'up' },
    needs: { kind: 'flag', flag: 'met:moss', label: 'Meet Moss', hint: 'Moss is out there somewhere.' },
    back: true,
    walk: true,
  },
  {
    id: 'room-moss-archive',
    from: 'room-moss',
    tile: '1',
    label: 'The Archive',
    to: { map: 'archive', x: 31, y: 11, facing: 'up' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  // Warrior City (author, Oct 3, 2026), just past Felix's maze: the Kaloseum at its heart, the
  // castle road north (down the Cull Road, through the camp, the barracks and on to Kaldor), a
  // bridge east to the Mage kingdom and a road south to the old mines (both still being built).
  {
    id: 'city-maze',
    from: 'warrior-city',
    tile: '<',
    label: "Back toward Felix's maze",
    to: { map: 'felix-maze', x: 28, y: 5, facing: 'left' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'city-north',
    from: 'warrior-city',
    tile: '^',
    label: 'The road north',
    to: { map: 'cull-road', x: 1, y: 6, facing: 'right' },
    needs: { kind: 'overall', level: NORTH_ROAD_LEVEL },
    walk: true,
  },
  {
    id: 'city-bridge',
    from: 'warrior-city',
    tile: '>',
    label: 'The bridge to the Mage kingdom',
    to: null,
    needs: OPEN,
    back: true,
  },
  {
    id: 'city-south',
    from: 'warrior-city',
    tile: '_',
    label: 'The road south',
    to: { map: 'south-road', x: 19, y: 1, facing: 'down' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'south-city',
    from: 'south-road',
    tile: '^',
    label: 'Back up to Warrior City',
    to: { map: 'warrior-city', x: 31, y: 38, facing: 'up' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'south-mine',
    from: 'south-road',
    tile: 'E',
    label: 'The old mine',
    to: { map: 'old-mine', x: 12, y: 9, facing: 'up' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'mine-south',
    from: 'old-mine',
    tile: '1',
    label: 'Out to the South Road',
    to: { map: 'south-road', x: 32, y: 12, facing: 'down' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'city-chapel',
    from: 'warrior-city',
    tile: '2',
    label: 'The chapel',
    to: { map: 'wc-chapel', x: 8, y: 9, facing: 'up' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'chapel-city',
    from: 'wc-chapel',
    tile: '1',
    label: 'Out to Warrior City',
    to: { map: 'warrior-city', x: 7, y: 10, facing: 'down' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'city-library',
    from: 'warrior-city',
    tile: '3',
    label: 'The library',
    to: { map: 'wc-library', x: 8, y: 9, facing: 'up' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'library-city',
    from: 'wc-library',
    tile: '1',
    label: 'Out to Warrior City',
    to: { map: 'warrior-city', x: 17, y: 9, facing: 'down' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'city-guild',
    from: 'warrior-city',
    tile: '4',
    label: "The Adventurers' Guild",
    to: { map: 'wc-guild', x: 8, y: 9, facing: 'up' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'guild-city',
    from: 'wc-guild',
    tile: '1',
    label: 'Out to Warrior City',
    to: { map: 'warrior-city', x: 48, y: 9, facing: 'down' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'city-hospital',
    from: 'warrior-city',
    tile: '5',
    label: 'The hospital',
    to: { map: 'wc-hospital', x: 8, y: 9, facing: 'up' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'hospital-city',
    from: 'wc-hospital',
    tile: '1',
    label: 'Out to Warrior City',
    to: { map: 'warrior-city', x: 58, y: 9, facing: 'down' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'city-tavern',
    from: 'warrior-city',
    tile: '6',
    label: 'The tavern',
    to: { map: 'wc-tavern', x: 8, y: 9, facing: 'up' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'tavern-city',
    from: 'wc-tavern',
    tile: '1',
    label: 'Out to Warrior City',
    to: { map: 'warrior-city', x: 7, y: 29, facing: 'down' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'city-store',
    from: 'warrior-city',
    tile: '7',
    label: 'The store',
    to: { map: 'wc-store', x: 8, y: 9, facing: 'up' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'store-city',
    from: 'wc-store',
    tile: '1',
    label: 'Out to Warrior City',
    to: { map: 'warrior-city', x: 16, y: 28, facing: 'down' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'city-barn',
    from: 'warrior-city',
    tile: '8',
    label: 'The horse barn',
    to: { map: 'wc-barn', x: 8, y: 9, facing: 'up' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'barn-city',
    from: 'wc-barn',
    tile: '1',
    label: 'Out to Warrior City',
    to: { map: 'warrior-city', x: 58, y: 28, facing: 'down' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  // The Bank of Warrior City (author, Oct 7, 2026), and its vault: the combination is in the ledgers (vault.ts).
  {
    id: 'city-bank',
    from: 'warrior-city',
    tile: '9',
    label: 'The bank',
    to: { map: 'wc-bank', x: 8, y: 9, facing: 'up' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'bank-city',
    from: 'wc-bank',
    tile: '1',
    label: 'Out to Warrior City',
    to: { map: 'warrior-city', x: 24, y: 35, facing: 'down' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'bank-vault',
    from: 'wc-bank',
    tile: 'G',
    label: 'The vault door',
    to: { map: 'wc-vault', x: 5, y: 6, facing: 'up' },
    needs: {
      kind: 'flag',
      flag: 'bank-vault-open',
      label: 'Open the vault',
      hint: 'The combination is in the ledgers, if you read them as a banker would.',
    },
    back: true,
  },
  {
    id: 'vault-bank',
    from: 'wc-vault',
    tile: '1',
    label: 'Back out to the bank',
    to: { map: 'wc-bank', x: 8, y: 3, facing: 'down' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  // The Kingdom Dungeon, under Warrior City's Kaloseum (author, Oct 3, 2026): the cells, the Maze Ward, then up into the arena.
  {
    id: 'cells-mazes',
    from: 'kingdom-dungeon',
    tile: '1',
    label: 'The ladder up',
    to: { map: 'dungeon-mazes', x: 2, y: 2, facing: 'right' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'mazes-cells',
    from: 'dungeon-mazes',
    tile: '1',
    label: 'The ladder down',
    to: { map: 'kingdom-dungeon', x: 20, y: 7, facing: 'up' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  // The pothole (dungeon.ts POTHOLE): three steps in, the floor gives way and drops you back into the cells.
  // Once only: after you've fallen (FELL_IN), the game leaves it out and the hole stays open; you walk round it.
  {
    id: 'maze-pothole',
    from: 'dungeon-mazes',
    tile: 'h',
    label: 'The floor',
    to: { map: 'kingdom-dungeon', x: 18, y: 6, facing: 'up' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'mazes-ring',
    from: 'dungeon-mazes',
    tile: '2',
    label: 'The ladder up',
    to: { map: 'the-pit', x: 8, y: 14, facing: 'right' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'pit-mazes',
    from: 'the-pit',
    tile: '3',
    label: 'The ladder down',
    to: { map: 'dungeon-mazes', x: 60, y: 6, facing: 'left' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'cells-ring',
    from: 'fighters-cells',
    tile: '1',
    label: 'The way out',
    to: { map: 'ring-ward', x: 28, y: 5, facing: 'down' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'barracks-kaldorhold',
    from: 'barracks-ward',
    tile: '<',
    label: 'The way west',
    to: { map: 'kaldorhold', x: 38, y: 10, facing: 'left' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'barracks-fury',
    from: 'barracks-ward',
    tile: '5',
    label: 'The Fury Hall',
    to: { map: 'fury-hall', x: 7, y: 5, facing: 'up' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'fury-barracks',
    from: 'fury-hall',
    tile: '1',
    label: 'The way out',
    to: { map: 'barracks-ward', x: 5, y: 4, facing: 'down' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'barracks-stitchery',
    from: 'barracks-ward',
    tile: '6',
    label: 'The Stitchery',
    to: { map: 'stitchery', x: 6, y: 4, facing: 'up' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'stitchery-barracks',
    from: 'stitchery',
    tile: '1',
    label: 'The way out',
    to: { map: 'barracks-ward', x: 15, y: 4, facing: 'down' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'barracks-ironhouse',
    from: 'barracks-ward',
    tile: '7',
    label: 'The Ironhouse',
    to: { map: 'ironhouse', x: 7, y: 5, facing: 'up' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'ironhouse-barracks',
    from: 'ironhouse',
    tile: '1',
    label: 'The way out',
    to: { map: 'barracks-ward', x: 26, y: 4, facing: 'down' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'frost-kaldorhold',
    from: 'frost-ward',
    tile: '^',
    label: 'The way north',
    to: { map: 'kaldorhold', x: 20, y: 18, facing: 'up' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'frost-ice',
    from: 'frost-ward',
    tile: '5',
    label: 'The Ice House',
    to: { map: 'ice-house', x: 5, y: 5, facing: 'up' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'ice-frost',
    from: 'ice-house',
    tile: '1',
    label: 'The way out',
    to: { map: 'frost-ward', x: 7, y: 5, facing: 'down' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  // South of the town: the Tithe Road, the Broken Watch, and the Field of Banners at the end (KINGDOM-EXPANSION.md).
  {
    id: 'town-south',
    from: 'kingdom-town',
    tile: '_',
    label: 'The south gate',
    to: { map: 'tithe-road', x: 20, y: 1, facing: 'down' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'tithe-town',
    from: 'tithe-road',
    tile: '^',
    label: 'The road north',
    to: { map: 'kingdom-town', x: 20, y: 18, facing: 'up' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'tithe-watch',
    from: 'tithe-road',
    tile: '_',
    label: 'The road south',
    to: { map: 'broken-watch', x: 9, y: 1, facing: 'down' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'watch-tithe',
    from: 'broken-watch',
    tile: '^',
    label: 'The road north',
    to: { map: 'tithe-road', x: 9, y: 10, facing: 'up' },
    needs: OPEN,
    back: true,
    walk: true,
  },
  {
    id: 'watch-field',
    from: 'broken-watch',
    tile: '_',
    label: 'The road south',
    to: { map: 'field-of-banners', x: 11, y: 7, facing: 'up' },
    needs: {
      kind: 'flag',
      flag: 'kaldor-beaten',
      label: 'Beat Kaldor',
      hint: "Grub won't let anyone south while Kaldor sits his throne. The law says any warrior may challenge the crown.",
    },
    walk: true,
  },
  {
    id: 'field-watch',
    from: 'field-of-banners',
    tile: '1',
    label: 'The way back',
    to: { map: 'broken-watch', x: 13, y: 9, facing: 'up' },
    needs: OPEN,
    back: true,
    walk: true,
  },
];

export type XpTotals = { total: number; byPath: Record<Dimension, number>; flags?: string[] };

export type Standing = {
  met: boolean;
  /** The player's level now, and the level needed. */
  have: number;
  need: number;
  /** Roughly how many more habits it takes, at the standard XP per habit. */
  habitsLeft: number;
  /** The class whose habits count (null: any habit counts). */
  className: string | null;
  /** How far along, 0 to 1, from where this level ladder starts. */
  fraction: number;
  /** For something to do in the World rather than habits: how to do it. */
  hint?: string;
};

/** XP still needed to climb from `progress` to `target`, one level at a time. */
function xpToReach(level: number, xpIntoLevel: number, target: number, xpFor: (level: number) => number): number {
  let xp = -xpIntoLevel;
  for (let l = level; l < target; l++) xp += xpFor(l);
  return Math.max(0, xp);
}

/** Where the player stands against a requirement. */
export function standing(needs: Requirement, xp: XpTotals): Standing {
  if (needs.kind === 'flag') {
    const met = xp.flags?.includes(needs.flag) ?? false;
    return { met, have: 0, need: 0, habitsLeft: 0, className: null, fraction: met ? 1 : 0, hint: needs.hint };
  }
  if (needs.kind === 'all') {
    // Met when every part is; otherwise report the first part still to do.
    const parts = needs.of.map((r) => standing(r, xp));
    const todo = parts.find((p) => !p.met);
    return todo ? { ...todo, met: false } : { ...parts[parts.length - 1], met: true };
  }
  const overall = needs.kind === 'overall';
  // For "any Path", the Path closest to levelling counts.
  const pathXp = needs.kind === 'path' ? xp.byPath[needs.dimension] : Math.max(0, ...Object.values(xp.byPath));
  const progress = overall ? overallLevelFromXp(xp.total) : levelFromXp(pathXp);
  const xpFor = overall ? (l: number) => tasksToNextOverallLevel(l) * BASE_XP : xpToNextLevel;
  const left = xpToReach(progress.level, progress.xpIntoLevel, needs.level, xpFor);
  const whole = xpToReach(overallLevelFromXp(0).level, 0, needs.level, xpFor);
  return {
    met: progress.level >= needs.level,
    have: progress.level,
    need: needs.level,
    habitsLeft: Math.ceil(left / BASE_XP),
    className: needs.kind === 'path' ? CLASSES[needs.dimension].className : null,
    fraction: whole === 0 ? 1 : Math.min(1, 1 - left / whole),
  };
}

/** What a requirement is, in a few words: "Overall Lv 12" or "Warrior Lv 10". */
export function describeRequirement(needs: Requirement): string {
  if (needs.kind === 'overall') return `Overall Lv ${needs.level}`;
  if (needs.kind === 'anyPath') return 'Level up once';
  if (needs.kind === 'flag') return needs.label;
  if (needs.kind === 'all') return needs.of.map(describeRequirement).join(' + ');
  return `${CLASSES[needs.dimension].className} Lv ${needs.level}`;
}

/** The level part of a requirement, if it has one (an "all" counts its first level part). */
function levelPart(needs: Requirement): Requirement | null {
  if (needs.kind === 'flag') return null;
  if (needs.kind === 'all') return needs.of.map(levelPart).find((r) => r !== null) ?? null;
  return needs;
}

/**
 * A requirement with where you stand: "Overall Lv 12 · you're Lv 9", "… ✓"
 * once met, and no level at all for something done in the World ("Raise the
 * portcullis"), which has none.
 */
export function requirementLabel(needs: Requirement, xp: XpTotals): string {
  const text = describeRequirement(needs);
  if (standing(needs, xp).met) return `${text} ✓`;
  const level = levelPart(needs);
  return level ? `${text} · you're Lv ${standing(level, xp).have}` : text;
}

/** What to do about it, in real life: "Finish about 6 more habits. Any habit counts." */
export function howToProgress(s: Standing): string {
  if (s.met) return 'You have the strength. It will open.';
  if (s.hint) return s.hint;
  const plural = s.habitsLeft === 1 ? '' : 's';
  return s.className
    ? `Finish about ${s.habitsLeft} more ${s.className} habit${plural}.`
    : `Finish about ${s.habitsLeft} more habit${plural}. Any habit counts.`;
}
