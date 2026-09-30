import { HEARTS } from './combat';
import { MAPS, type ChestObject, type MapId, type WorldMap } from './maps';

// What the player finds and keeps in the World: heart pieces and key items
// from chests (each opened chest is a story flag, chest:<id>, in the World's
// save), and the candles they rest at (store.ts keeps where).

/** Every four pieces is another heart, as in Zelda. */
export const PIECES_PER_HEART = 4;

/** Key items: what they're called, and what reading one says. */
export const ITEMS: Record<string, { name: string; text: string[] }> = {
  'dessa-letter': {
    name: "Dessa's letter",
    // The outside only: what's inside is for later.
    text: [
      'A letter in oilcloth, sealed with wax. The seal is a running boot.',
      "On the front, in a clerk's tidy hand: BY COURIER. ACROSS THE GREAT BRIDGE.",
      'Below it: TO BE PLACED IN THE HAND IT IS MEANT FOR, AND NO OTHER.',
      'On the back, in hurried pencil: "Carried by D. Quickstep. Do not open. I mean it."',
      'Fainter, as if added at a run: "If found, keep it moving."',
      "The seal has never been broken. You don't break it either.",
    ],
  },
};

export const chestFlag = (id: string) => `chest:${id}`;

/** Every chest in the World, with the map it's on. */
export const CHESTS: (ChestObject & { map: MapId })[] = (Object.keys(MAPS) as MapId[]).flatMap((map) =>
  MAPS[map].objects.filter((o): o is ChestObject => o.type === 'chest').map((o) => ({ ...o, map })),
);

/** Heart pieces found so far. */
export function heartPieces(flags: string[]): number {
  return CHESTS.filter((c) => c.item === 'heart-piece' && flags.includes(chestFlag(c.id))).length;
}

/** Hearts you start each fight with: five, plus one for every four pieces. */
export function maxHearts(flags: string[]): number {
  return HEARTS + Math.floor(heartPieces(flags) / PIECES_PER_HEART);
}

/** Key items you carry, in the order found in the World. */
export function satchel(flags: string[]): string[] {
  return CHESTS.filter((c) => c.item !== 'heart-piece' && flags.includes(chestFlag(c.id))).map((c) => c.item);
}

/** What opening a chest says, after its own lines: what you found, and (for pieces) how many you have. */
export function foundLines(item: string, flagsAfter: string[]): string[] {
  if (item === 'heart-piece') {
    const n = heartPieces(flagsAfter);
    const piece = n % PIECES_PER_HEART;
    if (piece === 0)
      return ['A piece of heart! It fits with the others.', `Your hearts grow: you now have ${maxHearts(flagsAfter)}.`];
    return [
      `A piece of heart! ${piece} of ${PIECES_PER_HEART}: find ${PIECES_PER_HEART - piece} more for another heart.`,
    ];
  }
  const name = ITEMS[item]?.name ?? item;
  return [`You found ${name}. It's in your Satchel (pause).`];
}

// ---- candles: rest at one and you'll wake there if you fall; travel between the ones you've lit.

/** Which tile letters are candles, by how a map is drawn. War hall's ring of torches is Kaldor's, not a resting place. */
const CANDLE_LETTER: Record<WorldMap['style'], string> = { rooms: 'c', outdoor: 'c', dungeon: 'k' };
const NOT_CANDLES: MapId[] = ['war-hall'];

export type Candle = { map: MapId; x: number; y: number };

/** The candles on a map, in reading order. */
export function candlesOn(map: WorldMap): Candle[] {
  if (NOT_CANDLES.includes(map.id as MapId)) return [];
  const letter = CANDLE_LETTER[map.style];
  const out: Candle[] = [];
  map.tiles.forEach((row, y) =>
    [...row].forEach((c, x) => {
      if (c === letter) out.push({ map: map.id as MapId, x, y });
    }),
  );
  return out;
}

export function isCandle(map: WorldMap, x: number, y: number): boolean {
  return candlesOn(map).some((c) => c.x === x && c.y === y);
}
