import { DIMENSIONS } from '@/game';

import { ROSTER, UNLOCK_LADDER } from '../companions';

describe('roster', () => {
  it('numbers everyone from 1 with no gaps or repeats: the Original 100, then later arrivals', () => {
    expect(ROSTER.length).toBeGreaterThanOrEqual(100);
    expect(ROSTER.map((c) => c.number)).toEqual(Array.from({ length: ROSTER.length }, (_, i) => i + 1));
  });

  it('scatters the numbers across Paths rather than grouping them', () => {
    const firstTen = new Set(ROSTER.slice(0, 10).map((c) => c.dimension));
    expect(firstTen.size).toBeGreaterThan(3);
  });

  it('gives everyone an alignment', () => {
    for (const c of ROSTER) expect(c.alignment).toMatch(/^(Lawful|Neutral|Chaotic|True)/);
  });

  it('gives everyone a rarity from 1 to 5 stars', () => {
    for (const c of ROSTER) expect([1, 2, 3, 4, 5]).toContain(c.rarity);
  });

  it('keeps rarity a pyramid: each star more is rarer than the one below it', () => {
    // 5★ is Legendary and rarest; 1★ is Common and most numerous.
    const count = (r: number) => ROSTER.filter((c) => c.rarity === r).length;
    for (let r = 1; r < 5; r++) expect(count(r)).toBeGreaterThan(count(r + 1));
  });

  it.each(DIMENSIONS)('gives the %s Path one core companion, then climbs the unlock ladder', (dimension) => {
    // The Original 100 (#001–#100) follow the ladder; later arrivals set their own levels.
    const path = ROSTER.filter((c) => c.dimension === dimension && c.number <= 100).sort(
      (a, b) => a.unlockLevel - b.unlockLevel,
    );
    expect(path.filter((c) => c.kind === 'core')).toHaveLength(1);
    const levels = path.filter((c) => c.kind !== 'core').map((c) => c.unlockLevel);
    expect(levels).toEqual(UNLOCK_LADDER.slice(0, levels.length));
    // Legends, and only legends, sit at the top rung.
    for (const c of ROSTER.filter((r) => r.dimension === dimension))
      expect(c.kind === 'legend').toBe(c.unlockLevel === 50);
  });

  it('never repeats a name', () => {
    const names = ROSTER.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
