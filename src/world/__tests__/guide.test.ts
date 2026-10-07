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
const UP_TO_TOWN = ['cull-ferry', 'hall-portcullis', 'yard-plates', 'plush-won', 'checkpoint'];

describe('the next goal', () => {
  it('points a new player at the Archive door', () => {
    const goal = nextGoal('archive', [], { total: 0, byPath: emptyDimensionRecord(0), flags: [] });
    expect(goal.mark?.exitId).toBe('archive-door');
    expect(goal.line).toMatch(/^Level up once: /);
  });

  it("marks the Kaloseum's gate, and the fight once inside", () => {
    const flags = [...UP_TO_TOWN];
    expect(nextGoal('warrior-city', ALL.filter((m) => m !== 'the-pit'), strong(flags)).mark?.exitId).toBe('town-pit');
    // Been in, not yet won: the city still points at the gate, the arena at the fight.
    expect(nextGoal('warrior-city', ALL, strong(flags))).toMatchObject({
      mark: { exitId: 'town-pit' },
      line: 'Win at the Kaloseum',
    });
    expect(nextGoal('the-pit', ALL, strong(flags)).mark).toMatchObject({ tag: 'The fight' });
  });

  it('leads to the winch through the right hole when it is in another room', () => {
    // past the Cull Road's ferry-bridge, which comes first
    const goal = nextGoal('barracks-hall', ALL, strong(['cull-ferry']));
    expect(goal.mark?.exitId).toBe('hall-armoury');
    expect(nextGoal('barracks-armoury', ALL, strong(['cull-ferry'])).mark).toMatchObject({ tag: 'The winch lever' });
  });

  it("asks for the Cull Road's ferry-bridge before the fort, and marks the plates", () => {
    const flags = strong([]);
    expect(nextGoal('cull-road', ALL.filter((m) => m !== 'deserters-camp'), flags)).toMatchObject({
      mark: { tag: 'The pressure plates' },
      line: 'Raise the ferry-bridge',
    });
    expect(nextGoal('cull-road', ALL.filter((m) => m !== 'deserters-camp'), strong(['cull-ferry'])).mark?.exitId).toBe(
      'cull-camp',
    );
  });

  it('says Season 1 is done at the end', () => {
    const every = EXITS.flatMap(function flagsOf(e: { needs: Requirement }): string[] {
      const n = e.needs;
      return n.kind === 'flag' ? [n.flag] : n.kind === 'all' ? n.of.flatMap((r) => flagsOf({ needs: r })) : [];
    });
    const walked = { ...strong(every), total: overallXpFor(20) };
    // Strong enough and every way walked: the portal is last, marked even from back in town.
    expect(nextGoal('field-of-banners', ALL, walked)).toMatchObject({ mark: { tag: 'The portal' }, line: 'Touch the portal' });
    expect(nextGoal('kingdom-town', ALL, walked).mark?.exitId).toBeDefined();
    const done = { ...walked, flags: [...every, 'season-1'] };
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
