import { PUSH_DELAY, SPEED, facingFor, leaningOn, move, platesCovered, pushBoulder, type Grid } from '../engine';
import { CLEARED_BOULDERS } from '../felix-maze';
import { MAPS, withOpenTiles } from '../maps';
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

/** Where the road comes into the maze, and the first tile past it (where Felix waits). */
const INTO_MAZE = { x: 1, y: 5 };
const PAST_MAZE = { x: 20, y: 5 };

describe("Felix's boulder maze", () => {
  const maze = withOpenTiles(MAPS['felix-maze'], ['<', '>']);
  const { width, height } = maze;
  const start = INTO_MAZE.y * width + INTO_MAZE.x;
  const end = PAST_MAZE.y * width + PAST_MAZE.x;

  /** Where you can walk without pushing anything. */
  const walk = (solid: number[], from: number) => {
    const seen = new Set<number>();
    const queue = [from];
    while (queue.length > 0) {
      const t = queue.pop()!;
      if (seen.has(t) || solid[t]) continue;
      seen.add(t);
      const tx = t % width;
      if (tx > 0) queue.push(t - 1);
      if (tx < width - 1) queue.push(t + 1);
      if (t >= width) queue.push(t - width);
      if (t < width * (height - 1)) queue.push(t + width);
    }
    return seen;
  };

  /** Every state the maze can get into, pushing from the west, and the pushes that lead on from each. */
  const explore = () => {
    type State = { you: number; solid: number[]; boulders: number[] };
    const key = (s: State, seen: Set<number>) => `${Math.min(...seen)}|${[...s.boulders].sort((a, b) => a - b)}`;
    const first: State = { you: start, solid: maze.solid, boulders: maze.boulders };
    const states = new Map<string, { state: State; seen: Set<number>; next: string[] }>();
    const queue = [first];
    const s0 = walk(first.solid, start);
    states.set(key(first, s0), { state: first, seen: s0, next: [] });
    while (queue.length > 0) {
      const s = queue.shift()!;
      const here = states.get(key(s, walk(s.solid, s.you)))!;
      if (here.seen.has(end)) continue;
      for (const t of here.seen) {
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const i = s.boulders.indexOf(t + dx + dy * width);
          if (i === -1 || (dx === 1 && t % width === width - 1) || (dx === -1 && t % width === 0)) continue;
          const pushed = pushBoulder(s.solid, width, height, s.boulders, i, dx, dy);
          if (!pushed) continue;
          const next: State = { you: s.boulders[i], ...pushed };
          const seen = walk(next.solid, next.you);
          const k = key(next, seen);
          here.next.push(k);
          if (states.has(k)) continue;
          states.set(k, { state: next, seen, next: [] });
          queue.push(next);
        }
      }
    }
    return states;
  };
  const states = explore();

  it('can be solved by pushing boulders, with no level needed', () => {
    expect([...states.values()].some((s) => s.seen.has(end))).toBe(true);
  });

  it('can get you stuck, so you walk back out and in to reset it', () => {
    // A state is a dead end if no pushes from it ever lead through.
    const good = new Set([...states].filter(([, s]) => s.seen.has(end)).map(([k]) => k));
    let grew = true;
    while (grew) {
      grew = false;
      for (const [k, s] of states)
        if (!good.has(k) && s.next.some((n) => good.has(n))) {
          good.add(k);
          grew = true;
        }
    }
    expect(states.size - good.size).toBeGreaterThan(5);
  });

  it('never shuts you in: the way back out to the road is always open', () => {
    expect([...states.values()].filter((s) => !s.seen.has(start))).toEqual([]);
  });

  it('leaves the road open both ways once solved', () => {
    const solid = maze.solid.slice();
    for (const b of maze.boulders) solid[b] = 0;
    for (const [x, y] of CLEARED_BOULDERS) solid[y * width + x] = 1;
    expect(walk(solid, start).has(end)).toBe(true);
    expect(CLEARED_BOULDERS).toHaveLength(maze.boulders.length);
  });
});
