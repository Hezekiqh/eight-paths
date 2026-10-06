import type { Dimension } from '@/game';

import type { MapId, WorldMap } from './maps';
import { EXITS } from './progress';

// Field jobs: things done to the World itself. Some anyone can do (pull a lever);
// some only one Path can (a Warrior breaks a cracked wall). Each sets a story flag,
// and a flag, once set, stays set.

export type Job = {
  map: MapId;
  /** The tile letter you press A at. */
  tile: string;
  flag: string;
  /** What it is, for the pause screen: "The cracked wall". */
  label: string;
  /** Only a character of this Path can do it (null: anyone). */
  path: Dimension | null;
  /** Said when it's done, with {name} for whoever did it. */
  done: string[];
  /** Said when it's already done. */
  already: string[];
  /** Said when the wrong character tries it. */
  cant?: string[];
  /** The tile opens up once done (a wall broken through), if it isn't a doorway already. */
  opens?: boolean;
};

export const JOBS: Job[] = [
  {
    map: 'barracks-armoury',
    tile: 'V',
    flag: 'hall-portcullis',
    label: 'The winch lever',
    path: null,
    done: [
      'You throw your weight on the lever. It groans, gives, and somewhere far off chains rattle.',
      'In the hall, the portcullis grinds up into the ceiling.',
    ],
    already: ['The lever is all the way down. The portcullis is up.'],
  },
  {
    map: 'barracks-armoury',
    tile: 'C',
    flag: 'armoury-wall',
    label: 'The cracked wall',
    path: 'physical',
    done: [
      '{name} squares up to the crack, sets both feet, and puts a shoulder straight through the wall.',
      'Dust. Coughing. A room nobody has breathed in for five hundred years.',
    ],
    already: ['The wall is broken open.'],
    cant: [
      'The wall here is cracked from floor to ceiling. Cold air whistles through.',
      'A Warrior could break it open.',
    ],
  },
  {
    map: 'deserters-camp',
    tile: 'O',
    flag: 'sally-port',
    label: 'The wedged boulder',
    path: 'physical',
    done: [
      '{name} braces against the boulder, grits their teeth, and rolls it clear of the gap.',
      'Behind it: a narrow space in the rock, and something small left in the dust.',
    ],
    already: ['The boulder is rolled aside.'],
    cant: ["A boulder, wedged into a gap in the rock face. There's a space behind it.", 'A Warrior could shift it.'],
    opens: true,
  },
  {
    map: 'forge',
    tile: 'V',
    flag: 'forge-fixed',
    label: 'The forge bellows',
    path: 'occupational',
    done: [
      '{name} rolls up their sleeves, patches the torn leather, re-seats the valve and gives the bellows a squeeze.',
      'The forge roars. Old Harrow stares, then laughs for the first time in years.',
    ],
    already: ['The bellows breathe like new.'],
    cant: ["The forge's great bellows, torn and wheezing.", 'An Artificer could mend them.'],
  },
  {
    map: 'chapel',
    tile: '4',
    flag: 'crypt-found',
    label: 'The rubble in the chapel',
    path: 'spiritual',
    done: [
      "{name}'s lantern flares. In its light the rubble throws a strange shadow: a stair, going down, hidden behind it.",
    ],
    already: ['The hidden stair, going down.'],
    cant: [
      'A heap of old rubble in the corner. Behind it, the dark seems deeper than it should.',
      "A Cleric's light might show what's there.",
    ],
  },
  {
    map: 'hedge-maze',
    tile: 'v',
    flag: 'maze-cleared',
    label: 'The overgrown hedge',
    path: 'environmental',
    done: [
      '{name} runs a hand along the hedge, finds where it grew in, and eases a way through without breaking a branch.',
      'The overgrowth parts, all through the maze.',
    ],
    already: ['The way through the hedge is open.'],
    cant: ['The hedge has grown right across the path here, thick as a wall.', 'A Ranger could find a way through.'],
    opens: true,
  },
  {
    map: 'hedge-maze',
    tile: 'L',
    flag: 'old-law',
    label: 'The old law',
    path: 'intellectual',
    done: [
      '{name} traces the worn letters and reads them aloud:',
      '"Any warrior may challenge the crown in single combat, and the court must bear witness."',
      'Under it, freshly cut: "The door is open. — K." Nobody has walked through it since Aurek.',
    ],
    already: ['"Any warrior may challenge the crown in single combat, and the court must bear witness."'],
    cant: ['The old law, carved in stone. The letters are too old to make out.', 'A Mage could read it.'],
  },
  {
    // The cell's bars (author, Oct 3, 2026): a mouse squeaks, and whoever's most scared goes straight through them.
    // Brannoc does it when you ask him to break out (dungeon.ts); walking as Brannoc, you do it yourself.
    map: 'kingdom-dungeon',
    tile: '2',
    flag: 'cell-bars-bent',
    label: 'The cell bars',
    path: null,
    done: ['Something squeaks in the straw, right by your foot.', '{name} yelps and throws themself at the bars. The bars lose.'],
    already: ['Two bars, bent wide apart. Somebody went through here in a hurry.'],
    opens: true,
  },
];

export const jobAt = (map: MapId, tile: string) => JOBS.find((j) => j.map === map && j.tile === tile);

/** Tile letters on this map that have been opened by a job (walls broken, boulders moved). */
export function openedByJobs(map: MapId, flags: string[]): string[] {
  return JOBS.filter((j) => j.map === map && j.opens && flags.includes(j.flag)).map((j) => j.tile);
}

/**
 * Tiles to draw open over the baked map picture: gates raised and walls broken
 * by a flag, whether they're doorways or were opened by a job.
 */
export function openPatches(map: WorldMap, flags: string[]): { x: number; y: number }[] {
  const letters = new Set<string>([
    ...EXITS.filter((e) => e.from === map.id && e.needs.kind === 'flag' && flags.includes(e.needs.flag)).map(
      (e) => e.tile,
    ),
    ...openedByJobs(map.id as MapId, flags),
  ]);
  const out: { x: number; y: number }[] = [];
  map.tiles.forEach((row, y) => [...row].forEach((c, x) => letters.has(c) && out.push({ x, y })));
  return out;
}
