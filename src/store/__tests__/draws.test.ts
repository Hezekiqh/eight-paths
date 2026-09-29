import { levelFromXp } from '@/game';
import { DEFAULT_PARTY, ROSTER, type CharacterId } from '@/story/companions';

import { DRAW_GAP_MAX, DRAW_GAP_MIN, pickWeighted, reconcileDraws, type DrawState } from '../draws';

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

describe('pickWeighted', () => {
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
