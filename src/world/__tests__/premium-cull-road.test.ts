import { EXITS, standing, type XpTotals } from '../progress';
import { emptyDimensionRecord } from '@/game';

// Premium lifts every level barrier (author, Oct 7, 2026), but the Cull Road's fights and its bridge still
// stand between Warrior City and Old Mags: the camp is only reached across the bridge, and the bridge is a
// story step (its plates), not a level.
describe('Premium and the Cull Road', () => {
  const premium: XpTotals = { total: 0, byPath: emptyDimensionRecord(0), flags: [], unlocked: true };

  it('lets Premium up the road north at any level, onto the Cull Road', () => {
    const north = EXITS.find((e) => e.id === 'city-north')!;
    expect(north.to?.map).toBe('cull-road');
    expect(standing(north.needs, premium).met).toBe(true);
  });

  it('still needs the bridge raised to reach the camp, and the camp has no other way in from outside', () => {
    const into = EXITS.filter((e) => e.to?.map === 'deserters-camp');
    expect(into.map((e) => e.from).sort()).toEqual(['barracks-hall', 'cull-road']);
    const bridge = into.find((e) => e.from === 'cull-road')!;
    expect(standing(bridge.needs, premium).met).toBe(false);
    expect(standing(bridge.needs, { ...premium, flags: ['cull-ferry'] }).met).toBe(true);
    // the fort is behind the camp: you only get into it from the camp
    expect(EXITS.filter((e) => e.to?.map === 'barracks-hall').map((e) => e.from)).not.toContain('warrior-city');
  });
});
