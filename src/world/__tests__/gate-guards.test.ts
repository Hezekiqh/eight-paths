import { emptyDimensionRecord } from '@/game';

import {
  exitOf,
  gateBlock,
  gateForExit,
  gatePrompt,
  guardLines,
  LEVEL_GATES,
  ON_YOU_GO,
  requirementLine,
  shouldOfferPremium,
  type GateOffer,
} from '../gate-guards';
import { MAPS, withOpenTiles } from '../maps';
import { FINAL_GOAL, KING_LEVEL, levelPart, WHOLE_PARTY, type XpTotals } from '../progress';
import { WALKER_ROWS } from '../walkers';

// XP totals, 10 XP a habit: everyone starts at Lv 5; Lv 10 is 10 habits in, Lv 15 is 20.
const at = (total: number, flags: string[] = [], unlocked = false): XpTotals => ({
  total,
  byPath: emptyDimensionRecord(0),
  flags,
  unlocked,
});
const north = gateForExit('city-north')!;
const forest = gateForExit('south-forest')!;
const castle = gateForExit('town-keep')!;
/** Every story flag the castle road asks for. */
const STORY = (() => {
  const needs = exitOf(castle).needs;
  return needs.kind === 'all' ? needs.of.flatMap((r) => (r.kind === 'flag' ? [r.flag] : [])) : [];
})();

describe('the level gates', () => {
  it('are the road north, the forest path and the castle road, at Lv 10, 10 and 15', () => {
    expect(LEVEL_GATES.map((g) => [g.exit, levelPart(exitOf(g).needs)])).toEqual([
      ['city-north', { kind: 'overall', level: 10 }],
      ['south-forest', { kind: 'overall', level: 10 }],
      ['town-keep', { kind: 'overall', level: KING_LEVEL }],
    ]);
    expect(KING_LEVEL).toBe(15);
  });

  it('end the season at the castle level', () => {
    expect(FINAL_GOAL.level).toBe(KING_LEVEL);
  });

  it('each have a guard, of an existing walker, standing beside the gate and off the road', () => {
    for (const gate of LEVEL_GATES) {
      const exit = exitOf(gate);
      const map = MAPS[gate.map];
      const guard = map.npcs.find((n) => n.id === gate.guard);
      expect(guard).toBeDefined();
      expect(guard!.sprite in WALKER_ROWS).toBe(true);
      expect(guard!.patrol).toBeUndefined();
      expect(guard!.wander).toBeUndefined();
      // near the gate (the forest path is a long thin track: he stands at its mouth)
      const tiles: [number, number][] = [];
      map.tiles.forEach((row, y) => [...row].forEach((c, x) => c === exit.tile && tiles.push([x, y])));
      const near = Math.min(...tiles.map(([x, y]) => Math.abs(x - guard!.x) + Math.abs(y - guard!.y)));
      expect(near).toBeLessThanOrEqual(gate.map === 'south-road' ? 19 : 2);
      // nobody stands on the road itself: from where you come in, the gate is still reachable with him there
      const open = withOpenTiles(map, [exit.tile]);
      const seen = new Set<number>();
      const queue = [map.spawn.y * map.width + map.spawn.x];
      while (queue.length) {
        const t = queue.pop()!;
        if (seen.has(t) || open.solid[t]) continue;
        seen.add(t);
        const x = t % map.width;
        if (x > 0) queue.push(t - 1);
        if (x < map.width - 1) queue.push(t + 1);
        if (t >= map.width) queue.push(t - map.width);
        if (t < map.width * (map.height - 1)) queue.push(t + map.width);
      }
      expect(tiles.some(([x, y]) => seen.has(y * map.width + x))).toBe(true);
    }
  });
});

describe('what the guard says', () => {
  it('under the level: his reason, then what it needs, in habits', () => {
    const block = gateBlock(forest, at(30));
    expect(block.kind).toBe('level');
    expect(guardLines(forest, block)).toEqual([
      "Nobody goes in those woods under Lv 10. Things happen in there. I don't ask what.",
      "* It needs Overall Lv 10. You're Lv 6. Finish about 7 more habits.",
    ]);
    expect(requirementLine(north, gateBlock(north, at(90)).level)).toBe(
      "It needs Overall Lv 10. You're Lv 9. Finish about 1 more habit.",
    );
  });

  it('"On you go." once you are strong enough, or have Premium', () => {
    expect(guardLines(north, gateBlock(north, at(100)))).toEqual([ON_YOU_GO]);
    expect(gateBlock(north, at(0, [], true)).kind).toBe('open');
    expect(gateBlock(forest, at(0, [], true)).kind).toBe('open');
  });

  it('at the castle: the level first, then the story hints once the level is met', () => {
    const lines = guardLines(castle, gateBlock(castle, at(100)));
    expect(lines[0]).toBe('The king receives the strong. Lv 15, or you can admire the gate from here.');
    expect(lines[1]).toBe("* It needs Overall Lv 15. You're Lv 10. Finish about 10 more habits.");
    const strong = gateBlock(castle, at(200));
    expect(strong.kind).toBe('flags');
    expect(guardLines(castle, strong)[1]).toBe('* Beat five guards and the warden at the Kaloseum.');
    // Premium lifts the level, never the story
    expect(gateBlock(castle, at(0, [], true)).kind).toBe('flags');
    expect(gateBlock(castle, at(0, STORY, true)).kind).toBe('open');
    expect(gateBlock(castle, at(200, STORY)).kind).toBe('open');
    expect(STORY).toEqual(expect.arrayContaining(WHOLE_PARTY.map((r) => (r.kind === 'flag' ? r.flag : ''))));
  });
});

describe('the Premium sheet', () => {
  it('says how far off you are, and that Premium lifts it', () => {
    expect(gatePrompt(forest, gateBlock(forest, at(30)))).toBe(
      "The forest opens at Lv 10. You're Lv 6: about 7 more habits. Or go anywhere now with Premium.",
    );
    expect(gatePrompt(north, gateBlock(north, at(90)))).toBe(
      "The road north opens at Lv 10. You're Lv 9: about 1 more habit. Or go anywhere now with Premium.",
    );
    // the castle, with the story still to do: Premium only lifts the level, so it doesn't promise more
    expect(gatePrompt(castle, gateBlock(castle, at(100)))).toBe(
      "The castle opens at Lv 15. You're Lv 10: about 10 more habits. Or lift every level barrier now with Premium.",
    );
    expect(gatePrompt(castle, gateBlock(castle, at(100, STORY)))).toBe(
      "The castle opens at Lv 15. You're Lv 10: about 10 more habits. Or go anywhere now with Premium.",
    );
  });

  const base = {
    gate: 'south-forest',
    block: 'level' as const,
    history: [] as GateOffer[],
    today: '2026-10-07',
    premium: false,
    enabled: true,
    busy: false,
  };

  it('shows the first time a free player is stopped at a level gate', () => {
    expect(shouldOfferPremium(base)).toBe(true);
  });

  it('never for Premium, where Premium is off, in a scene, or for a gate shut only by the story', () => {
    expect(shouldOfferPremium({ ...base, premium: true })).toBe(false);
    expect(shouldOfferPremium({ ...base, enabled: false })).toBe(false);
    expect(shouldOfferPremium({ ...base, busy: true })).toBe(false);
    expect(shouldOfferPremium({ ...base, block: 'flags' })).toBe(false);
    expect(shouldOfferPremium({ ...base, block: 'open' })).toBe(false);
  });

  it('once per gate ever, and at most once a day across all of them', () => {
    const shown = [{ gate: 'south-forest', day: '2026-10-01' }];
    expect(shouldOfferPremium({ ...base, history: shown })).toBe(false);
    expect(shouldOfferPremium({ ...base, history: shown, gate: 'city-north' })).toBe(true);
    const today = [{ gate: 'city-north', day: '2026-10-07' }];
    expect(shouldOfferPremium({ ...base, history: today })).toBe(false);
    expect(shouldOfferPremium({ ...base, history: today, today: '2026-10-08' })).toBe(true);
    // all three seen: quiet from then on
    const all = LEVEL_GATES.map((g, i) => ({ gate: g.exit, day: `2026-10-0${i + 1}` }));
    for (const g of LEVEL_GATES) expect(shouldOfferPremium({ ...base, gate: g.exit, history: all })).toBe(false);
  });
});
