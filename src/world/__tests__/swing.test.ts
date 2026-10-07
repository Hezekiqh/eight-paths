import { MAPS, TILE } from '../maps';
import { BRANNOC_FAINTED, CARRIED_TO } from '../dungeon';
import {
  BLADE_END,
  BLADE_REST,
  BREACH_AT,
  FLY_TIME,
  FLY_TOP,
  PIT_BANNERS,
  STAND_OFF,
  SWING_STRIKE,
  SWING_SWEEP,
  SWING_TRAIL,
  SWING_WINDUP,
  WARDEN_HOLE,
  bannerFor,
  bladeAt,
  clothOf,
  holeAt,
  sleepwalkTo,
  wardenFlight,
} from '../swing';

const feet = (x: number, y: number): [number, number] => [x * TILE + TILE / 2, y * TILE + TILE - 2];
const pit = MAPS['the-pit'];
const free = (x: number, y: number) => pit.walkable.includes(pit.tiles[y]?.[x] ?? 'T');

describe("Brannoc's sleepwalk", () => {
  it('ends beside the warden wherever he stands, facing him', () => {
    // pushed against the right wall, as the fight often leaves him
    const right = sleepwalkTo(BRANNOC_FAINTED, feet(26, 9), free);
    expect(right.end).toEqual([26 - STAND_OFF, 9]);
    expect(right.face).toBe(3);
    expect(right.path[0]).toEqual(BRANNOC_FAINTED);
    expect(right.path[right.path.length - 1]).toEqual(right.end);
    // over on the left, with Brannoc to his right
    const left = sleepwalkTo(CARRIED_TO.brannoc, feet(6, 10), free);
    expect(left.end).toEqual([6 + STAND_OFF, 10]);
    expect(left.face).toBe(2);
  });

  it('goes round to the other side, or below him, when the near side is wall', () => {
    const farSide = sleepwalkTo([20, 10], feet(4, 10), (x) => x >= 4);
    expect(farSide.end).toEqual([4 + STAND_OFF, 10]);
    const below = sleepwalkTo([20, 10], feet(10, 6), (x, y) => y > 6);
    expect(below.end).toEqual([10, 6 + STAND_OFF]);
    expect(below.face).toBe(1);
  });

  it('sways off the straight line as he goes', () => {
    const { path } = sleepwalkTo([5, 14], feet(25, 14), free);
    expect(path).toHaveLength(4);
    expect(path[1][1]).not.toBe(14);
    expect(Math.sign(path[1][1] - 14)).toBe(-Math.sign(path[2][1] - 14));
  });
});

describe("the warden's flight", () => {
  const [hx, hy] = clothOf(PIT_BANNERS[2]);
  it('is hurled from where he stood through the banner and out over the top, shrinking as he goes', () => {
    const [x0, y0, s0] = wardenFlight(0, 400, 150, hx, hy);
    expect([x0, y0, s0]).toEqual([400, 150, 2]);
    // at the banner: his middle (feet less 10 per size) is on its cloth
    const at = wardenFlight(FLY_TIME * BREACH_AT, 400, 150, hx, hy);
    expect(at[0]).toBeCloseTo(hx);
    expect(at[1] - 10 * at[2]).toBeCloseTo(hy);
    const later = wardenFlight(FLY_TIME * 0.9, 400, 150, hx, hy);
    expect(later[1]).toBeLessThan(at[1]);
    expect(later[2]).toBeLessThan(at[2]);
    expect(wardenFlight(FLY_TIME, 400, 150, hx, hy)).toEqual([hx, FLY_TOP, 0, 0]);
  });
  it('tumbles slowly enough to read as a man: a quarter turn no faster than every 0.15s', () => {
    const facing = (t: number) => wardenFlight(t, 400, 150, hx, hy)[3];
    let changes = 0;
    for (let t = 0; t < 1; t += 0.01) if (facing(t) !== facing(t + 0.01)) changes++;
    expect(changes).toBeGreaterThan(2);
    expect(changes).toBeLessThanOrEqual(7);
  });
});

describe('the swing', () => {
  it('winds up first, raising the blade back, then sweeps it over and down to land at SWING_STRIKE', () => {
    expect(bladeAt(0)[0]).toBeCloseTo(BLADE_REST);
    expect(bladeAt(SWING_WINDUP * 0.99)[0]).toBeLessThan(BLADE_REST - 1.5);
    expect(bladeAt(0.1)[1]).toBe(0);
    const mid = bladeAt(SWING_WINDUP + SWING_SWEEP / 2);
    expect(mid[1]).toBeGreaterThan(0.3);
    expect(mid[2]).toBeGreaterThan(0);
    expect(bladeAt(SWING_STRIKE)[0]).toBeCloseTo(BLADE_END);
    expect(bladeAt(SWING_STRIKE + SWING_TRAIL)[2]).toBe(0);
  });
});

describe('the hole in the banners', () => {
  it('goes through the banner nearest straight up from the warden', () => {
    expect(bannerFor(420, 150)).toEqual(PIT_BANNERS[3]);
    expect(bannerFor(380, 120)).toEqual(PIT_BANNERS[2]);
    expect(bannerFor(60, 160)).toEqual(PIT_BANNERS[0]);
    expect(bannerFor(150, 100)).toEqual(PIT_BANNERS[1]);
  });
  it('is remembered in a flag', () => {
    expect(holeAt([])).toBeNull();
    expect(holeAt(['pit-champion', `${WARDEN_HOLE}374,23`])).toEqual([374, 23]);
  });
  it('sits on banners that are in the art: every pole is above the sand, inside the map', () => {
    for (const [x, y] of PIT_BANNERS) {
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(pit.width * TILE);
      expect(pit.tiles[Math.floor(y / TILE)][Math.floor(x / TILE)]).toBe('T');
    }
  });
});
