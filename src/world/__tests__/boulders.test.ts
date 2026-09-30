import { PUSH_DELAY, SPEED, facingFor, leaningOn, move, platesCovered, pushBoulder, type Grid } from '../engine';
import { MAPS } from '../maps';
import { EXITS } from '../progress';

describe('the Drill Yard puzzle', () => {
  const yard = MAPS['barracks-yard'];
  const at = (x: number, y: number) => y * yard.width + x;

  it('has three boulders and three plates', () => {
    expect(yard.boulders).toHaveLength(3);
    expect(yard.plates).toHaveLength(3);
  });

  it('can be solved by pushing each boulder onto a plate', () => {
    let solid = yard.solid;
    let boulders = yard.boulders;
    // You come in from the hall; to push, you must be able to walk round to the far side of the boulder.
    const arrival = EXITS.find((e) => e.to?.map === 'barracks-yard' && e.from === 'barracks-hall')!.to!;
    const canReach = (x: number, y: number) => {
      const seen = new Set<number>();
      const queue = [at(arrival.x, arrival.y)];
      while (queue.length > 0) {
        const t = queue.pop()!;
        if (seen.has(t) || solid[t]) continue;
        seen.add(t);
        const tx = t % yard.width;
        const ty = Math.floor(t / yard.width);
        if (tx > 0) queue.push(t - 1);
        if (tx < yard.width - 1) queue.push(t + 1);
        if (ty > 0) queue.push(t - yard.width);
        if (ty < yard.height - 1) queue.push(t + yard.width);
      }
      return seen.has(at(x, y));
    };
    const push = (from: [number, number], dx: number, dy: number) => {
      const i = boulders.indexOf(at(...from));
      expect(i).not.toBe(-1);
      expect([from, dx, dy, canReach(from[0] - dx, from[1] - dy)]).toEqual([from, dx, dy, true]);
      const next = pushBoulder(solid, yard.width, yard.height, boulders, i, dx, dy);
      expect(next).not.toBeNull();
      solid = next!.solid;
      boulders = next!.boulders;
    };
    // Top-left boulder: right twice, down twice.
    push([5, 4], 1, 0);
    push([6, 4], 1, 0);
    push([7, 4], 0, 1);
    push([7, 5], 0, 1);
    // Right boulder: left three times, down once.
    push([12, 5], -1, 0);
    push([11, 5], -1, 0);
    push([10, 5], -1, 0);
    push([9, 5], 0, 1);
    // Bottom boulder: right four times, up twice.
    for (let x = 4; x < 8; x++) push([x, 8], 1, 0);
    push([8, 8], 0, -1);
    push([8, 7], 0, -1);
    expect(platesCovered(yard.plates, boulders)).toBe(true);
  });

  it("won't push a boulder into a wall", () => {
    const i = yard.boulders.indexOf(at(12, 5));
    // Two pushes right would put it into the east wall.
    const once = pushBoulder(yard.solid, yard.width, yard.height, yard.boulders, i, 1, 0)!;
    expect(pushBoulder(once.solid, yard.width, yard.height, once.boulders, i, 1, 0)).toBeNull();
  });
});

describe('pushing a boulder by walking into it', () => {
  const yard = MAPS['barracks-yard'];
  const at = (x: number, y: number) => y * yard.width + x;

  /** Holds the stick one way for `seconds`, the way the World's frame loop does. Returns where the boulders end up. */
  function hold(x: number, y: number, ix: number, iy: number, seconds: number) {
    let solid = yard.solid;
    let boulders = yard.boulders;
    let facing = 0;
    let lean = 0;
    const dt = 1 / 60;
    for (let t = 0; t < seconds; t += dt) {
      const grid: Grid = { solid, width: yard.width, height: yard.height };
      facing = facingFor(ix, iy, facing);
      const against = leaningOn(grid, boulders, x, y, facing);
      if (against === -1) {
        [x, y] = move(grid, x, y, ix * SPEED * dt, iy * SPEED * dt);
        lean = 0;
      } else if ((lean += dt) >= PUSH_DELAY) {
        lean = 0;
        const pushed = pushBoulder(solid, yard.width, yard.height, boulders, against, ix, iy);
        if (pushed) ({ solid, boulders } = pushed);
      }
    }
    return boulders;
  }

  // Walking up to the top-left boulder (5, 4) from the left, feet anywhere in its row.
  it.each([65, 70, 74, 78])('moves it when you walk into it from the left (feet at y %i)', (y) => {
    const after = hold(3 * 16 + 8, y, 1, 0, 1.2);
    expect(after).not.toContain(at(5, 4));
    expect(after.some((b) => b === at(6, 4) || b === at(7, 4))).toBe(true);
  });

  it('moves it when you walk into it from above', () => {
    const after = hold(5 * 16 + 6, 2 * 16 + 14, 0, 1, 1.2);
    expect(after).not.toContain(at(5, 4));
    expect(after.some((b) => b === at(5, 5) || b === at(5, 6))).toBe(true);
  });
});
