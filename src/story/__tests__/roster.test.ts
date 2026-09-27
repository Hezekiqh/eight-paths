import { DIMENSIONS } from '@/game';

import { ROSTER, UNLOCK_LADDER } from '../companions';

describe('roster', () => {
  it('holds 100 characters, numbered in order', () => {
    expect(ROSTER).toHaveLength(100);
    expect(ROSTER.map((c) => c.number)).toEqual(Array.from({ length: 100 }, (_, i) => i + 1));
  });

  it.each(DIMENSIONS)('gives the %s Path one core companion, then climbs the unlock ladder', (dimension) => {
    const path = ROSTER.filter((c) => c.dimension === dimension);
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
