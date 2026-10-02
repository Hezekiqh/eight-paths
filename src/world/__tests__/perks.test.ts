import { ATTACKS, levelHearts, rangeFor } from '../combat';
import { levelPerks } from '../perks';

describe('levelling up in the World', () => {
  it('reaches a little further every level, up to half again', () => {
    const sword = ATTACKS.physical;
    expect(rangeFor(sword, 1)).toBe(sword.range);
    expect(rangeFor(sword, 2)).toBeGreaterThan(rangeFor(sword, 1));
    expect(rangeFor(sword, 11)).toBeCloseTo(sword.range * 1.1);
    expect(rangeFor(sword, 200)).toBeCloseTo(sword.range * 1.5);
  });

  it('adds a heart at Lv 5, then every 10 levels, up to five', () => {
    expect(levelHearts(4)).toBe(0);
    expect(levelHearts(5)).toBe(1);
    expect(levelHearts(14)).toBe(1);
    expect(levelHearts(15)).toBe(2);
    expect(levelHearts(500)).toBe(5);
  });

  it('says what each level brings', () => {
    expect(levelPerks('brannoc', 2, 3)).toEqual(['Attack range increased!']);
    expect(levelPerks('brannoc', 4, 5)).toEqual(['Hearts increased!', 'Attack range increased!']);
    expect(levelPerks('brannoc', 9, 10)).toEqual(['New move learned: Sweetheart Swing!', 'Attack range increased!']);
    expect(levelPerks('brannoc', 60, 61)).toEqual([]);
  });
});
