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
  it('counts the habits left to the Archive door from a fresh start', () => {
    const s = standing({ kind: 'overall', level: ARCHIVE_DOOR_LEVEL }, noXp);
    expect(s.met).toBe(false);
    expect(s.habitsLeft).toBe(overallXpFor(ARCHIVE_DOOR_LEVEL) / BASE_XP);
    expect(s.fraction).toBe(0);
    expect(howToProgress(s)).toMatch(/^Finish about \d+ more habits\. Any habit counts\.$/);
  });

  it('opens once the overall level is reached', () => {
    const xp = { ...noXp, total: overallXpFor(ARCHIVE_DOOR_LEVEL) };
    const s = standing({ kind: 'overall', level: ARCHIVE_DOOR_LEVEL }, xp);
    expect(s).toMatchObject({ met: true, habitsLeft: 0, fraction: 1 });
  });

  it("asks for that Path's habits when a Path level is needed", () => {
    const byPath = { ...noXp.byPath, physical: 40 };
    const s = standing({ kind: 'path', dimension: 'physical', level: 10 }, { total: 40, byPath });
    expect(s.have).toBe(levelFromXp(40).level);
    expect(howToProgress(s)).toMatch(/more Warrior habits\.$/);
  });

  it('says one habit, not one habits', () => {
    const xp = { ...noXp, total: overallXpFor(ARCHIVE_DOOR_LEVEL) - BASE_XP };
    expect(howToProgress(standing({ kind: 'overall', level: ARCHIVE_DOOR_LEVEL }, xp))).toBe(
      'Finish about 1 more habit. Any habit counts.',
    );
  });
});

describe('EXITS', () => {
  it('sit on a real tile of their map', () => {
    for (const exit of EXITS) {
      expect(MAPS[exit.from].tiles.some((row) => row.includes(exit.tile))).toBe(true);
    }
  });
});
