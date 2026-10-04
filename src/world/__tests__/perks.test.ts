import { ATTACKS, hitsToBeat, levelHearts, rangeFor } from '../combat';
import { levelPerks } from '../perks';

describe('levelling up in the World', () => {
  it('reaches shorter at low levels: three quarters at Lv 5, full by Lv 20, up to 30% more', () => {
    const sword = ATTACKS.physical;
    expect(rangeFor(sword, 1)).toBeCloseTo(sword.range * 0.75);
    expect(rangeFor(sword, 5)).toBeCloseTo(sword.range * 0.75);
    expect(rangeFor(sword, 6)).toBeGreaterThan(rangeFor(sword, 5));
    expect(rangeFor(sword, 20)).toBeCloseTo(sword.range);
    expect(rangeFor(sword, 30)).toBeCloseTo(sword.range * 1.1);
    expect(rangeFor(sword, 200)).toBeCloseTo(sword.range * 1.3);
  });

  it('adds a heart at Lv 5, then every 10 levels, up to five', () => {
    expect(levelHearts(4)).toBe(0);
    expect(levelHearts(5)).toBe(1);
    expect(levelHearts(14)).toBe(1);
    expect(levelHearts(15)).toBe(2);
    expect(levelHearts(500)).toBe(5);
  });

  it('says what each level brings', () => {
    expect(levelPerks('brannoc', 6, 7)).toEqual(['Attack range increased!']);
    // hearts are the whole party's now (overall level), not one character's
    expect(levelPerks('brannoc', 4, 5)).toEqual([]);
    expect(levelPerks('brannoc', 9, 10)).toEqual(['New move learned: Sweetheart Swing!', 'Attack range increased!']);
    expect(levelPerks('brannoc', 60, 61)).toEqual([]);
  });
});

describe('hits to beat (every fight, by level)', () => {
  it('takes fewer hits the stronger you are, and leaves the warden to his own rule', () => {
    expect(hitsToBeat('shadow', 20)).toBe(1);
    expect(hitsToBeat('shadow', 5)).toBe(2);
    expect(hitsToBeat('aurek', 20)).toBe(4);
    expect(hitsToBeat('aurek', 5)).toBe(8);
    expect(hitsToBeat('warden', 5)).toBeNull();
  });
});
