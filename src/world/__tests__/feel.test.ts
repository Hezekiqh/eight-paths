import { hitAround, spawnEnemy, strikes } from '../combat';

const open = { solid: new Array(20 * 20).fill(0), width: 20, height: 20 };

describe('game feel', () => {
  it('notices a hit that lands', () => {
    const before = [spawnEnemy('shadow', 100, 100), spawnEnemy('shadow', 200, 100)];
    const after = hitAround(open, before, 100, 100, 10, 1, 0, 0);
    expect(strikes(before, after)).toMatchObject({ hits: 1, kills: 0, big: false, struck: [0] });
  });

  it('notices where an enemy fell', () => {
    const before = [spawnEnemy('shadow', 100, 100)];
    const after = hitAround(open, before, 100, 100, 10, 9, 0, 0);
    expect(strikes(before, after)).toMatchObject({ hits: 1, kills: 1, fell: [100, 100] });
  });

  it('marks a hit on a boss as a big one', () => {
    const before = [spawnEnemy('kaldor', 100, 100)];
    expect(strikes(before, hitAround(open, before, 100, 100, 10, 1, 0, 0)).big).toBe(true);
  });

  it('ignores misses and the already fallen', () => {
    const before = [spawnEnemy('shadow', 100, 100)];
    const down = hitAround(open, before, 100, 100, 10, 9, 0, 0);
    expect(strikes(before, hitAround(open, before, 160, 100, 10, 1, 0, 0)).hits).toBe(0);
    expect(strikes(down, hitAround(open, down, 100, 100, 10, 1, 0, 0)).hits).toBe(0);
  });
});
