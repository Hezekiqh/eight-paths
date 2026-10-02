import { COMPANIONS, type CharacterId } from '@/story/companions';

import { ATTACKS, levelHearts, rangeFor } from './combat';
import { movesFor } from './fight';
import { SIGNATURE_LEVEL, signatureOf } from './signatures';

// What a character gains in the World from levelling up, for the level-up
// screen: a little more reach every level, a heart now and then, and their
// moves at Lv 10 and 20 (or their signature).

/** What changed going from Lv `from` to Lv `to`, biggest news first. */
export function levelPerks(id: CharacterId, from: number, to: number): string[] {
  const { dimension } = COMPANIONS[id];
  const signature = signatureOf(id);
  const moves = movesFor(dimension, to, signature, SIGNATURE_LEVEL)
    .filter((m) => m.level > from && m.level <= to)
    .map((m) => `New move learned: ${m.name}!`);
  const perks = [...moves];
  if (levelHearts(to) > levelHearts(from)) perks.push('Hearts increased!');
  const attack = ATTACKS[dimension];
  if (rangeFor(attack, to) > rangeFor(attack, from)) perks.push('Attack range increased!');
  return perks;
}
