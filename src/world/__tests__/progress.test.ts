import { BASE_XP, emptyDimensionRecord, overallLevelFromXp, levelFromXp } from '@/game';

import { MAPS } from '../maps';
import { ARCHIVE_DOOR_LEVEL, EXITS, howToProgress, standing, type XpTotals } from '../progress';

const noXp: XpTotals = { total: 0, byPath: emptyDimensionRecord(0) };

/** Total XP that puts the overall level at exactly `level`. */
function overallXpFor(level: number) {
  let xp = 0;
  while (overallLevelFromXp(xp).level < level) xp += BASE_XP;
  return xp;
}

describe('standing', () => {
  it('opens the Archive door after the first level-up on any Path', () => {
    const door = { kind: 'anyPath', level: ARCHIVE_DOOR_LEVEL } as const;
    const fresh = standing(door, noXp);
    expect(fresh.met).toBe(false);
    expect(howToProgress(fresh)).toBe('Finish about 1 more habit. Any habit counts.');
    const oneHabit = { total: BASE_XP, byPath: { ...noXp.byPath, social: BASE_XP } };
    expect(standing(door, oneHabit)).toMatchObject({ met: true, habitsLeft: 0 });
  });

  it('counts the habits left to an overall level', () => {
    const s = standing({ kind: 'overall', level: 8 }, noXp);
    expect(s.met).toBe(false);
    expect(s.habitsLeft).toBe(overallXpFor(8) / BASE_XP);
    expect(s.fraction).toBe(0);
    expect(howToProgress(s)).toMatch(/^Finish about \d+ more habits\. Any habit counts\.$/);
    expect(standing({ kind: 'overall', level: 8 }, { ...noXp, total: overallXpFor(8) })).toMatchObject({
      met: true,
      fraction: 1,
    });
  });

  it("asks for that Path's habits when a Path level is needed", () => {
    const byPath = { ...noXp.byPath, physical: 40 };
    const s = standing({ kind: 'path', dimension: 'physical', level: 10 }, { total: 40, byPath });
    expect(s.have).toBe(levelFromXp(40).level);
    expect(howToProgress(s)).toMatch(/more Warrior habits\.$/);
  });
});

describe('EXITS', () => {
  it('sit on a real tile of their map', () => {
    for (const exit of EXITS) {
      expect(MAPS[exit.from].tiles.some((row) => row.includes(exit.tile))).toBe(true);
    }
  });

  it('set you down on open ground, facing somewhere sensible', () => {
    for (const exit of EXITS) {
      if (!exit.to) continue;
      const map = MAPS[exit.to.map];
      expect(map.solid[exit.to.y * map.width + exit.to.x]).toBe(0);
    }
  });

  it('lead back the way they came', () => {
    const out = EXITS.find((e) => e.id === 'archive-door')!;
    const back = EXITS.find((e) => e.from === out.to!.map && e.to?.map === 'archive');
    expect(back?.back).toBe(true);
  });
});
