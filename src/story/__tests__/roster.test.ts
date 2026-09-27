import { DIMENSIONS } from '@/game';

import { ROSTER, UNLOCK_LADDER } from '../companions';

describe('roster', () => {
  it('holds 100 characters, each with its own number from 1 to 100', () => {
    expect(ROSTER).toHaveLength(100);
    expect(ROSTER.map((c) => c.number)).toEqual(Array.from({ length: 100 }, (_, i) => i + 1));
  });

  it('scatters the numbers across Paths rather than grouping them', () => {
    const firstTen = new Set(ROSTER.slice(0, 10).map((c) => c.dimension));
    expect(firstTen.size).toBeGreaterThan(3);
  });

  it('gives everyone a rarity from 1 to 5 stars', () => {
    for (const c of ROSTER) expect([1, 2, 3, 4, 5]).toContain(c.rarity);
  });

  it.each(DIMENSIONS)('gives the %s Path one core companion, then climbs the unlock ladder', (dimension) => {
    const path = ROSTER.filter((c) => c.dimension === dimension).sort((a, b) => a.unlockLevel - b.unlockLevel);
    expect(path.filter((c) => c.kind === 'core')).toHaveLength(1);
    const levels = path.filter((c) => c.kind !== 'core').map((c) => c.unlockLevel);
    expect(levels).toEqual(UNLOCK_LADDER.slice(0, levels.length));
    // Legends, and only legends, sit at the top rung.
    for (const c of path) expect(c.kind === 'legend').toBe(c.unlockLevel === 50);
  });

  it('never repeats a name', () => {
    const names = ROSTER.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
