import { BASE_XP, emptyDimensionRecord, overallLevelFromXp } from '@/game';

import { nextGoal, settersOf } from '../guide';
import { MAPS, type MapId } from '../maps';
import { EXITS, type Requirement, type XpTotals } from '../progress';

/** Total XP that puts the overall level at exactly `level`. */
function overallXpFor(level: number) {
  let xp = 0;
  while (overallLevelFromXp(xp).level < level) xp += BASE_XP;
  return xp;
}

/** Strong enough for every level gate, with these story flags done. */
const strong = (flags: string[]): XpTotals => {
  const total = overallXpFor(19);
  return { total, byPath: { ...emptyDimensionRecord(0), physical: total }, flags };
};

const ALL = Object.keys(MAPS) as MapId[];
const UP_TO_TOWN = ['hall-portcullis', 'yard-plates', 'plush-won', 'checkpoint'];

describe('the next goal', () => {
  it('points a new player at the Archive door', () => {
    const goal = nextGoal('archive', [], { total: 0, byPath: emptyDimensionRecord(0), flags: [] });
    expect(goal.mark?.exitId).toBe('archive-door');
    expect(goal.line).toMatch(/^Level up once: /);
  });

  it('marks Barnaby in town until you are on the bill', () => {
    const goal = nextGoal('kingdom-town', ALL.filter((m) => m !== 'the-pit'), strong(UP_TO_TOWN));
    expect(goal.mark).toMatchObject({ tag: 'Barnaby Loudmouth' });
    expect(goal.mark?.exitId).toBeUndefined();
    expect(goal.line).toMatch(/^Talk to Barnaby Loudmouth \(an? \w+ can do it\)$/);
  });

  it('then marks the Kaldorium door, and the fight once inside', () => {
    const flags = [...UP_TO_TOWN, 'on-the-bill'];
    expect(nextGoal('kingdom-town', ALL.filter((m) => m !== 'the-pit'), strong(flags)).mark?.exitId).toBe('town-pit');
    // Been in, not yet won: the town still points at the door, the pit at the fight.
    expect(nextGoal('kingdom-town', ALL, strong(flags))).toMatchObject({
      mark: { exitId: 'town-pit' },
      line: 'Win at the Kaldorium',
    });
    expect(nextGoal('the-pit', ALL, strong(flags)).mark).toMatchObject({ tag: 'The fight' });
  });

  it('leads to the winch through the right hole when it is in another room', () => {
    const goal = nextGoal('barracks-hall', ALL, strong([]));
    expect(goal.mark?.exitId).toBe('hall-armoury');
    expect(nextGoal('barracks-armoury', ALL, strong([])).mark).toMatchObject({ tag: 'The winch lever' });
  });

  it('says Season 1 is done at the end', () => {
    const every = EXITS.flatMap(function flagsOf(e: { needs: Requirement }): string[] {
      const n = e.needs;
      return n.kind === 'flag' ? [n.flag] : n.kind === 'all' ? n.of.flatMap((r) => flagsOf({ needs: r })) : [];
    });
    const done = { ...strong(every), total: overallXpFor(20) };
    expect(nextGoal('field-of-banners', ALL, done)).toEqual({
      mark: null,
      line: expect.stringMatching(/Season 1 is done/),
    });
  });

  it('has someone or something to point at for every flag a way on needs', () => {
    const flags = (r: Requirement): string[] =>
      r.kind === 'flag' ? [r.flag] : r.kind === 'all' ? r.of.flatMap(flags) : [];
    for (const exit of EXITS.filter((e) => !e.back)) {
      for (const flag of flags(exit.needs)) expect([flag, settersOf(flag).length > 0]).toEqual([flag, true]);
    }
  });
});
