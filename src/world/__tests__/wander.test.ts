import { MAPS } from '../maps';
import {
  W_FACING,
  W_HF,
  W_HX,
  W_HY,
  W_TX,
  W_TY,
  W_X,
  W_Y,
  newWanderers,
  stepWanderers,
  turnToTalk,
  whoIsAt,
  wandererTile,
  type Wanderer,
} from '../wander';

// An open 9x7 yard with a wall round it, and one pillar in the middle.
const W = 9;
const H = 7;
function yard(): number[] {
  const solid: number[] = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) solid.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 || (x === 4 && y === 3) ? 1 : 0);
  return solid;
}
const FAR = [-500, -500]; // the player, well out of the way

/** Runs `seconds` of strolling in small steps, calling `each` after every one. */
function run(
  rows: Wanderer[],
  solid: number[],
  seconds: number,
  player = FAR,
  avoid: number[] = [],
  each?: (rows: Wanderer[], solid: number[]) => void,
) {
  for (let t = 0; t < seconds; t += 1 / 30) {
    const r = stepWanderers(rows, solid, W, H, player[0], player[1], 1 / 30, avoid);
    rows = r.rows;
    solid = r.solid;
    each?.(rows, solid);
  }
  return { rows, solid };
}

/** Stands someone at (x, y), taking their tile in the grid as the map does. */
function place(solid: number[], spec: { x: number; y: number; wander?: number; along?: 'x' | 'y'; look?: boolean }[]) {
  for (const s of spec) solid[s.y * W + s.x] = 1;
  return newWanderers(spec.map((s) => ({ ...s, facing: 0 })));
}

describe('people strolling about', () => {
  it('leaves people who do not wander exactly where they are', () => {
    const solid = yard();
    const rows = place(solid, [{ x: 2, y: 2 }]);
    const after = run(rows, solid, 60);
    expect([after.rows[0][W_X], after.rows[0][W_Y]]).toEqual([2, 2]);
    expect(after.solid).toEqual(solid);
  });

  it('strolls, but never further from home than they may, and never into walls', () => {
    const solid = yard();
    const rows = place(solid, [{ x: 2, y: 2, wander: 2 }]);
    const seen = new Set<string>();
    run(rows, solid, 120, FAR, [], (rs) => {
      const w = rs[0];
      for (const [x, y] of [
        [w[W_X], w[W_Y]],
        [w[W_TX], w[W_TY]],
      ]) {
        expect(Math.abs(x - w[W_HX])).toBeLessThanOrEqual(2);
        expect(Math.abs(y - w[W_HY])).toBeLessThanOrEqual(2);
        expect(yard()[y * W + x]).toBe(0);
        seen.add(`${x},${y}`);
      }
    });
    expect(seen.size).toBeGreaterThan(3);
  });

  it('holds exactly one tile in the grid for each person, all the time', () => {
    const solid = yard();
    const walls = solid.filter((v) => v === 1).length;
    const rows = place(solid, [
      { x: 2, y: 2, wander: 2 },
      { x: 6, y: 4, wander: 2 },
      { x: 3, y: 5 },
    ]);
    run(rows, solid, 120, FAR, [], (rs, grid) => {
      const held = grid.filter((v) => v === 1).length - walls;
      // one tile each, plus the one a stroller has taken ahead of them
      const ahead = rs.filter((w) => w[W_TX] !== w[W_X] || w[W_TY] !== w[W_Y]).length;
      expect(held).toBe(3 + ahead);
      for (const w of rs) expect(grid[w[W_Y] * W + w[W_X]]).toBe(1);
    });
  });

  it('never walks into two people at once, or into each other', () => {
    const solid = yard();
    const rows = place(solid, [
      { x: 2, y: 2, wander: 3 },
      { x: 3, y: 2, wander: 3 },
    ]);
    run(rows, solid, 120, FAR, [], (rs) => {
      const a = [rs[0][W_TX], rs[0][W_TY]].join();
      const b = [rs[1][W_TX], rs[1][W_TY]].join();
      expect(a).not.toBe(b);
    });
  });

  it('never steps onto the player', () => {
    const solid = yard();
    const rows = place(solid, [{ x: 2, y: 2, wander: 3 }]);
    // the player stands still on tile (3, 2): feet at its middle, near the bottom
    const player = [3 * 16 + 8, 2 * 16 + 14];
    run(rows, solid, 120, player, [], (rs) => {
      expect([rs[0][W_TX], rs[0][W_TY]]).not.toEqual([3, 2]);
    });
  });

  it('keeps off doorways and road ends', () => {
    const solid = yard();
    const rows = place(solid, [{ x: 2, y: 2, wander: 3 }]);
    const door = 2 * W + 3;
    run(rows, solid, 120, FAR, [door], (rs) => {
      expect(rs[0][W_TY] * W + rs[0][W_TX]).not.toBe(door);
    });
  });

  it('keeps a patrol to its row', () => {
    const solid = yard();
    const rows = place(solid, [{ x: 4, y: 5, wander: 3, along: 'x' }]);
    run(rows, solid, 120, FAR, [], (rs) => expect(rs[0][W_TY]).toBe(5));
  });
});

describe('people looking about', () => {
  it('stays on their tile, glances another way now and then, and turns back to how they stand', () => {
    const solid = yard();
    const rows = place(solid, [{ x: 2, y: 2, look: true }]);
    const faced = new Set<number>();
    let home = 0;
    let steps = 0;
    const after = run(rows, solid, 120, FAR, [], (rs) => {
      const w = rs[0];
      expect([w[W_X], w[W_Y], w[W_TX], w[W_TY]]).toEqual([2, 2, 2, 2]);
      faced.add(w[W_FACING]);
      if (w[W_FACING] === w[W_HF]) home++;
      steps++;
    });
    expect(after.solid).toEqual(solid);
    expect(faced.size).toBeGreaterThan(1);
    // a glance is short; most of the time they face their own way
    expect(home / steps).toBeGreaterThan(0.6);
  });

  it('turns back to how they stand once you have finished talking', () => {
    const solid = yard();
    let rows = place(solid, [{ x: 2, y: 2, look: true }]);
    rows = turnToTalk(rows, 0, 2);
    expect(rows[0][W_FACING]).toBe(2);
    const after = run(rows, solid, 4.5);
    expect(after.rows[0][W_FACING]).toBe(0);
  });
});

describe('talking to someone mid-stroll', () => {
  it('finds them where they are now, not where they started', () => {
    const npcs = [{ id: 'pim', x: 2, y: 2 }];
    const rows: Wanderer[] = [[2, 2, 3, 2, 3, 2, 0, 1, 2, 0, 1, 0]];
    expect(whoIsAt(npcs, ['pim'], rows, 3, 2)?.id).toBe('pim');
    expect(whoIsAt(npcs, ['pim'], rows, 2, 2)).toBeUndefined();
  });

  it('counts them on the tile they are headed for once past halfway', () => {
    const w: Wanderer = [2, 2, 2, 2, 3, 2, 0.6, 0, 2, 0, 1, 3];
    expect(wandererTile(w)).toEqual([3, 2]);
  });

  it('turns them to face you and keeps them put a while', () => {
    const rows = turnToTalk([[2, 2, 2, 2, 2, 2, 0, 0, 2, 0, 1, 0]], 0, 2);
    expect(rows[0][W_FACING]).toBe(2);
    const later = stepWanderers(rows, yard(), W, H, FAR[0], FAR[1], 3);
    expect([later.rows[0][W_TX], later.rows[0][W_TY]]).toEqual([2, 2]);
  });
});

describe('who strolls in the Other World', () => {
  const people = Object.values(MAPS).flatMap((m) => m.npcs.map((n) => ({ map: m, n })));

  it('never sends off anyone the story needs to find in one place', () => {
    // People with a job, or whose answers set story flags, stand still so the gold arrow can point at them.
    const strolling = people.filter(({ n }) => (n.wander ?? 0) > 0);
    expect(strolling.filter(({ n }) => n.job || n.questions?.some((q) => q.sets))).toEqual([]);
  });

  it('only lets people stroll in places without a fight', () => {
    const strolling = people.filter(({ n }) => (n.wander ?? 0) > 0);
    expect(strolling.filter(({ map }) => map.boss || map.ladder || map.enemies.length > 0)).toEqual([]);
  });

  it('lets people look about only where there is no fight, and never also stroll', () => {
    const lookers = people.filter(({ n }) => n.look);
    expect(lookers.filter(({ map }) => map.boss || map.ladder || map.enemies.length > 0).map(({ n }) => n.name)).toEqual([]);
    expect(lookers.filter(({ n }) => (n.wander ?? 0) > 0)).toEqual([]);
    expect(lookers.length).toBeGreaterThanOrEqual(10);
  });

  it('marches one drum-warden round the city; the other two keep their post', () => {
    const wardens = MAPS['warrior-city'].npcs.filter((n) => n.name.startsWith('Drum-warden'));
    expect(wardens.filter((n) => (n.wander ?? 0) > 0).map((n) => n.name)).toEqual(['Drum-warden Tuk']);
  });

  it('gives the towns some life', () => {
    expect(people.filter(({ n }) => (n.wander ?? 0) > 0).length).toBeGreaterThanOrEqual(15);
  });
});
