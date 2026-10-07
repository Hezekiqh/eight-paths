import { MAPS, TILE } from '../maps';
import { BRANNOC_FAINTED, CARRIED_TO } from '../dungeon';
import {
  FLY_TIME,
  FLY_TOP,
  STAND_OFF,
  WARDEN_HOLE,
  breachX,
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
  it('rises from where he stood, up and out over the top, tumbling and shrinking', () => {
    const [x0, y0, s0] = wardenFlight(0, 400, 150, 380);
    expect([x0, y0, s0]).toEqual([400, 150, 2]);
    const mid = wardenFlight(FLY_TIME / 2, 400, 150, 380);
    expect(mid[1]).toBeLessThan(150);
    expect(mid[2]).toBeLessThan(2);
    const facings = new Set([0.05, 0.12, 0.2, 0.27].map((t) => wardenFlight(t, 400, 150, 380)[3]));
    expect(facings.size).toBeGreaterThan(1);
    expect(wardenFlight(FLY_TIME, 400, 150, 380)).toEqual([380, FLY_TOP, 0, 0]);
  });
});

describe('the hole in the banners', () => {
  const W = pit.width * TILE;
  it("goes up where the warden stood, clear of Barnaby's box and the edges", () => {
    expect(breachX(400, W)).toBe(400);
    expect(Math.abs(breachX(W / 2 + 5, W) - W / 2)).toBeGreaterThanOrEqual(64);
    expect(breachX(2, W)).toBe(40);
    expect(breachX(W, W)).toBe(W - 40);
  });
  it('is remembered in a flag', () => {
    expect(holeAt([])).toBeNull();
    expect(holeAt(['pit-champion', `${WARDEN_HOLE}392`])).toBe(392);
  });
});
