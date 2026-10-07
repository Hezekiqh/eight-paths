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

  it('marks Barnaby in Warrior City until you are on the bill', () => {
    const goal = nextGoal('warrior-city', ALL.filter((m) => m !== 'the-pit'), strong(UP_TO_TOWN));
    expect(goal.mark).toMatchObject({ tag: 'Barnaby Loudmouth' });
    expect(goal.mark?.exitId).toBeUndefined();
    expect(goal.line).toMatch(/^Talk to Barnaby Loudmouth \(an? \w+ can do it\)$/);
    expect(goal.path).toBe('social');
  });

  it("then marks the Colosseum's gate, and the fight once inside", () => {
    const flags = [...UP_TO_TOWN, 'on-the-bill'];
    expect(nextGoal('warrior-city', ALL.filter((m) => m !== 'the-pit'), strong(flags)).mark?.exitId).toBe('town-pit');
    // Been in, not yet won: the city still points at the gate, the arena at the fight.
    expect(nextGoal('warrior-city', ALL, strong(flags))).toMatchObject({
      mark: { exitId: 'town-pit' },
      line: 'Win at the Colosseum',
    });
    expect(nextGoal('the-pit', ALL, strong(flags)).mark).toMatchObject({ tag: 'The fight' });
  });

  it('leads to the winch through the right hole when it is in another room', () => {
    // the fort is a side trip after the castle (author, Oct 6, 2026): everything else done first
    const fort = ['hall-portcullis', 'yard-plates', 'plush-won'];
    const story = EXITS.flatMap(function flagsOf(e: { needs: Requirement }): string[] {
      const n = e.needs;
      return n.kind === 'flag' ? [n.flag] : n.kind === 'all' ? n.of.flatMap((r) => flagsOf({ needs: r })) : [];
    }).filter((f) => !fort.includes(f));
    const goal = nextGoal('barracks-hall', ALL, strong(story));
    expect(goal.mark?.exitId).toBe('hall-armoury');
    expect(nextGoal('barracks-armoury', ALL, strong(story)).mark).toMatchObject({ tag: 'The winch lever' });
  });

  it('says Season 1 is done at the end', () => {
    const every = EXITS.flatMap(function flagsOf(e: { needs: Requirement }): string[] {
      const n = e.needs;
      return n.kind === 'flag' ? [n.flag] : n.kind === 'all' ? n.of.flatMap((r) => flagsOf({ needs: r })) : [];
    });
    const walked = { ...strong(every), total: overallXpFor(20) };
    // Strong enough and every way walked: the portal is last, marked even from back in town.
    expect(nextGoal('field-of-banners', ALL, walked)).toMatchObject({ mark: { tag: 'The portal' }, line: 'Touch the portal' });
    expect(nextGoal('warrior-city', ALL, walked).mark?.exitId).toBeDefined();
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
