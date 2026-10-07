import { BASE_XP, emptyDimensionRecord, overallLevelFromXp, levelFromXp } from '@/game';

import { MAPS } from '../maps';
import { ARCHIVE_DOOR_LEVEL, EXITS, howToProgress, requirementLabel, standing, type Requirement, type XpTotals } from '../progress';

const noXp: XpTotals = { total: 0, byPath: emptyDimensionRecord(0) };

/** Total XP that puts the overall level at exactly `level`. */
function overallXpFor(level: number) {
  let xp = 0;
  while (overallLevelFromXp(xp).level < level) xp += BASE_XP;
  return xp;
}

describe('standing', () => {
  it('lifts every level barrier for Premium, but not what must be done in the World', () => {
    const premium: XpTotals = { ...noXp, unlocked: true };
    expect(standing({ kind: 'overall', level: 20 }, premium).met).toBe(true);
    expect(standing({ kind: 'path', dimension: 'physical', level: 8 }, premium).met).toBe(true);
    expect(standing({ kind: 'anyPath', level: ARCHIVE_DOOR_LEVEL }, premium).met).toBe(true);
    const winch = { kind: 'flag', flag: 'winch', label: 'Pull the winch', hint: 'Pull it.' } as const;
    expect(standing(winch, premium).met).toBe(false);
    expect(standing({ kind: 'all', of: [{ kind: 'overall', level: 20 }, winch] }, premium).met).toBe(false);
    expect(standing(winch, { ...premium, flags: ['winch'] }).met).toBe(true);
  });

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

describe('requirementLabel', () => {
  const flag: Requirement = { kind: 'flag', flag: 'winch', label: 'Raise the portcullis', hint: 'Find the winch.' };
  it('shows your level only where there is one', () => {
    expect(requirementLabel({ kind: 'overall', level: 12 }, noXp)).toMatch(/^Overall Lv 12 · you're Lv \d+$/);
    expect(requirementLabel(flag, noXp)).toBe('Raise the portcullis');
    expect(requirementLabel(flag, { ...noXp, flags: ['winch'] })).toBe('Raise the portcullis ✓');
  });

  it('takes the level from the level part of a combined requirement', () => {
    const both: Requirement = { kind: 'all', of: [flag, { kind: 'overall', level: 18 }] };
    const xp = { total: overallXpFor(9), byPath: emptyDimensionRecord(0) };
    expect(requirementLabel(both, xp)).toBe("Raise the portcullis + Overall Lv 18 · you're Lv 9");
  });
});
