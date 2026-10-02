import { levelFromXp } from '@/game';
import { DEFAULT_PARTY, ROSTER, type CharacterId } from '@/story/companions';

import {
  DRAW_GAP_MAX,
  DRAW_GAP_MIN,
  RARITY_WEIGHTS,
  dropOdds,
  pickWeighted,
  reconcileDraws,
  redoDrop,
  type DrawState,
} from '../draws';

/** A repeatable random source. */
function seeded(seed = 1) {
  return () => (seed = (seed * 16807) % 2147483647) / 2147483647;
}

/** Total XP that puts a Path at `level`. */
function xpForLevel(level: number) {
  let xp = 0;
  while (levelFromXp(xp).level < level) xp += 10;
  return xp;
}

const zeroXp = {
  physical: 0,
  financial: 0,
  intellectual: 0,
  spiritual: 0,
  emotional: 0,
  social: 0,
  occupational: 0,
  environmental: 0,
};

const fresh = (over: Partial<DrawState> = {}): DrawState => ({
  owned: Object.fromEntries(Object.values(DEFAULT_PARTY).map((id) => [id, 1])),
  nextDraw: {},
  drops: [],
  redrawn: [],
  shards: {},
  revealed: [],
  ...over,
});

describe('reconcileDraws', () => {
  it('schedules each Path its first arrival 3 to 5 levels ahead', () => {
    const out = reconcileDraws(fresh(), zeroXp, seeded())!;
    const start = levelFromXp(0).level;
    for (const next of Object.values(out.nextDraw)) {
      expect(next).toBeGreaterThanOrEqual(start + DRAW_GAP_MIN);
      expect(next).toBeLessThanOrEqual(start + DRAW_GAP_MAX);
    }
    expect(out.drops).toEqual([]);
  });

  it('draws a character from the Path whose level reached its next arrival', () => {
    const state = fresh({ nextDraw: { physical: 8 } });
    const out = reconcileDraws(state, { ...zeroXp, physical: xpForLevel(8) }, seeded())!;
    expect(out.drops).toHaveLength(1);
    const drawn = ROSTER.find((c) => c.id === out.drops[0])!;
    expect(drawn.dimension).toBe('physical');
    expect(out.owned![drawn.id]).toBe(1);
    expect(out.nextDraw.physical).toBeGreaterThanOrEqual(8 + DRAW_GAP_MIN);
  });

  it('catches up on several arrivals at once', () => {
    const state = fresh({ nextDraw: { physical: 8 } });
    const out = reconcileDraws(state, { ...zeroXp, physical: xpForLevel(30) }, seeded())!;
    expect(out.drops.length).toBeGreaterThanOrEqual(Math.floor((30 - 8) / DRAW_GAP_MAX) + 1);
  });

  it('can draw a duplicate before the Path is complete', () => {
    // Own every Warrior but one: over many draws, some must still be repeats.
    const warriors = ROSTER.filter((c) => c.dimension === 'physical');
    const owned = Object.fromEntries(warriors.slice(1).map((c) => [c.id, 1]));
    const out = reconcileDraws(
      fresh({ owned, nextDraw: { physical: 8 } }),
      { ...zeroXp, physical: xpForLevel(60) },
      seeded(3),
    )!;
    expect(out.drops.some((id) => owned[id] !== undefined)).toBe(true);
  });

  it('gives extra copies once a Path is complete', () => {
    const warriors = ROSTER.filter((c) => c.dimension === 'physical');
    const owned = Object.fromEntries(warriors.map((c) => [c.id, 1]));
    const out = reconcileDraws(
      fresh({ owned, nextDraw: { physical: 8 } }),
      { ...zeroXp, physical: xpForLevel(8) },
      seeded(),
    )!;
    const id = out.drops[0];
    expect(out.owned![id]).toBe(2);
  });

  it('keeps everyone an old save had unlocked, and queues the unrevealed ones', () => {
    const out = reconcileDraws(fresh({ owned: null, revealed: ['brannoc'] }), zeroXp, seeded())!;
    for (const id of Object.values(DEFAULT_PARTY)) expect(out.owned![id]).toBe(1);
    expect(out.drops).not.toContain('brannoc');
    expect(out.drops).toContain('pip');
  });

  it('turns a full set of shards into the character', () => {
    const out = reconcileDraws(fresh({ nextDraw: {}, shards: { dessa: 3 } }), zeroXp, seeded())!;
    expect(out.owned!.dessa).toBe(1);
    expect(out.drops).toContain('dessa' as CharacterId);
  });

  it('changes nothing when nothing is due', () => {
    const next = Object.fromEntries(Object.keys(zeroXp).map((d) => [d, 50]));
    expect(reconcileDraws(fresh({ nextDraw: next }), zeroXp, seeded())).toBeNull();
  });
});

describe('the core eight are met, not drawn', () => {
  const core = Object.values(DEFAULT_PARTY);

  it('wakes Brannoc with the first XP, with his hatch', () => {
    expect(reconcileDraws(fresh({ owned: {} }), zeroXp, seeded())!.owned?.brannoc).toBeUndefined();
    const out = reconcileDraws(fresh({ owned: {}, nextDraw: { physical: 99 } }), { ...zeroXp, financial: 10 }, seeded())!;
    expect(out.owned?.brannoc).toBe(1);
    expect(out.drops).toEqual(['brannoc']);
  });

  it('never hands out a core hero you have not met', () => {
    // Many arrivals on every Path, nobody met yet but Brannoc.
    const state = fresh({ owned: { brannoc: 1 }, nextDraw: Object.fromEntries(Object.keys(zeroXp).map((d) => [d, 6])) });
    const lots = Object.fromEntries(Object.keys(zeroXp).map((d) => [d, xpForLevel(60)])) as typeof zeroXp;
    const out = reconcileDraws(state, lots, seeded(7))!;
    expect(out.drops.length).toBeGreaterThan(40);
    expect(out.drops.filter((id) => core.includes(id) && id !== 'brannoc')).toEqual([]);
  });

  it('can draw a spare copy of one you have met', () => {
    const state = fresh({ owned: { brannoc: 1 }, nextDraw: { physical: 6 } });
    const out = reconcileDraws(state, { ...zeroXp, physical: xpForLevel(200) }, seeded(3))!;
    expect(out.drops.filter((id) => id === 'brannoc').length).toBeGreaterThan(0);
  });
});

describe('redoDrop', () => {
  const state = (over: Partial<DrawState> = {}) =>
    fresh({ owned: { ...fresh().owned, pip: 1 }, drops: ['pip'], ...over });

  it('swaps the waiting drop for someone else from the same Path', () => {
    const out = redoDrop(state(), 'pip', seeded())!;
    const pick = ROSTER.find((c) => c.id === out.pick)!;
    expect(out.pick).not.toBe('pip');
    expect(pick.dimension).toBe(ROSTER.find((c) => c.id === 'pip')!.dimension);
    expect(out.changes.drops).toEqual([out.pick]);
    expect(out.changes.owned!.pip).toBeUndefined();
    expect(out.changes.owned![out.pick]).toBeGreaterThanOrEqual(1);
    expect(out.changes.redrawn).toEqual([out.pick]);
  });

  it('only takes back the one copy that just arrived', () => {
    const out = redoDrop(state({ owned: { ...fresh().owned, pip: 3 } }), 'pip', seeded())!;
    expect(out.changes.owned!.pip).toBe(2);
  });

  it("won't redo a redo, or a drop that isn't waiting", () => {
    expect(redoDrop(state({ redrawn: ['pip'] }), 'pip', seeded())).toBeNull();
    expect(redoDrop(state({ drops: [] }), 'pip', seeded())).toBeNull();
  });
});

describe('pickWeighted', () => {
  it('makes a 1★ about twice as likely with Premium odds', () => {
    const count = (weights = RARITY_WEIGHTS.free) => {
      const random = seeded(11);
      let legends = 0;
      for (let i = 0; i < 40000; i++) if (pickWeighted(ROSTER, random, weights).rarity === 1) legends++;
      return legends;
    };
    const ratio = count(RARITY_WEIGHTS.premium) / count(RARITY_WEIGHTS.free);
    expect(ratio).toBeGreaterThan(1.7);
    expect(ratio).toBeLessThan(2.1);
  });

  it('draws Commons far more often than Legendaries', () => {
    const random = seeded(7);
    const counts: Record<number, number> = {};
    for (let i = 0; i < 20000; i++) {
      const c = pickWeighted(ROSTER, random);
      counts[c.rarity] = (counts[c.rarity] ?? 0) + 1;
    }
    expect(counts[5]).toBeGreaterThan(counts[4]);
    expect(counts[4]).toBeGreaterThan(counts[3]);
    expect(counts[3]).toBeGreaterThan(counts[2]);
    expect(counts[2]).toBeGreaterThan(counts[1]);
  });
});

describe('dropOdds', () => {
  it('adds up to 1 on every Path, and Premium raises the 1★ chance', () => {
    for (const d of ['physical', 'spiritual'] as const) {
      const free = dropOdds(d, 'free');
      const sum = Object.values(free).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1);
      expect(dropOdds(d, 'premium')[1]).toBeGreaterThan(free[1]);
    }
  });
});
