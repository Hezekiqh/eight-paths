import { MAPS } from '../maps';
import { EXITS } from '../progress';
import {
  PATROL_SPEED,
  W_FACING,
  W_PI,
  W_HF,
  W_HX,
  W_HY,
  W_TX,
  W_TY,
  W_X,
  W_Y,
  newWanderers,
  nextWaypoint,
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

describe('people on patrol (author, Oct 7, 2026)', () => {
  // round the yard, inside the wall, clear of the pillar
  const LOOP = [
    [1, 1],
    [7, 1],
    [7, 5],
    [1, 5],
  ];
  const beat = (x = 1, y = 1) => {
    const solid = yard();
    solid[y * W + x] = 1;
    return { solid, rows: newWanderers([{ x, y, facing: 0, patrol: LOOP }]) };
  };
  const onLoop = (x: number, y: number) => x === 1 || x === 7 || y === 1 || y === 5;

  it('sets off for the far end of the leg they stand on', () => {
    expect(nextWaypoint(LOOP, 1, 1)).toBe(1);
    expect(nextWaypoint(LOOP, 4, 1)).toBe(1);
    expect(nextWaypoint(LOOP, 7, 3)).toBe(2);
    expect(nextWaypoint(LOOP, 1, 3)).toBe(0);
    expect(nextWaypoint(LOOP, 7, 1)).toBe(2);
  });

  it('marches round the loop and back to the start, facing the way they walk, never off it', () => {
    const { solid, rows } = beat();
    const visited: string[] = [];
    let back = false;
    // the loop is 20 tiles long; give them time for it, corners and all
    const lap = 20 / (PATROL_SPEED / 16) + 4 * 1 + 2;
    run(rows, solid, lap, FAR, [], (rs) => {
      const w = rs[0];
      for (const [x, y] of [
        [w[W_X], w[W_Y]],
        [w[W_TX], w[W_TY]],
      ])
        expect(onLoop(x, y)).toBe(true);
      const at = `${w[W_X]},${w[W_Y]}`;
      if (visited.at(-1) !== at) visited.push(at);
      if (visited.length > 1 && at === '1,1') back = true;
      // stepping: facing the way they go
      if (w[W_TX] > w[W_X]) expect(w[W_FACING]).toBe(3);
      if (w[W_TX] < w[W_X]) expect(w[W_FACING]).toBe(2);
      if (w[W_TY] > w[W_Y]) expect(w[W_FACING]).toBe(0);
      if (w[W_TY] < w[W_Y]) expect(w[W_FACING]).toBe(1);
    });
    expect(back).toBe(true);
    // clockwise: along the top, down the right, back along the bottom, up the left
    expect(visited.slice(0, 8)).toEqual(['1,1', '2,1', '3,1', '4,1', '5,1', '6,1', '7,1', '7,2']);
    expect(visited).toContain('7,5');
    expect(visited).toContain('1,5');
    expect(new Set(visited).size).toBe(20);
  });

  it('keeps going, lap after lap, holding exactly one tile (plus the one ahead)', () => {
    const { solid, rows } = beat(4, 5);
    const walls = yard().filter((v) => v === 1).length;
    let laps = 0;
    let was = '4,5';
    run(rows, solid, 120, FAR, [], (rs, grid) => {
      const w = rs[0];
      const ahead = w[W_TX] !== w[W_X] || w[W_TY] !== w[W_Y] ? 1 : 0;
      expect(grid.filter((v) => v === 1).length - walls).toBe(1 + ahead);
      expect(grid[w[W_Y] * W + w[W_X]]).toBe(1);
      const at = `${w[W_X]},${w[W_Y]}`;
      if (at === '4,5' && was !== at) laps++;
      was = at;
    });
    expect(laps).toBeGreaterThan(2);
  });

  it('waits when you stand in the way, and carries on once you move', () => {
    const { solid, rows } = beat();
    // the player on (3, 1), right in the path along the top
    const player = [3 * 16 + 8, 1 * 16 + 14];
    const held = run(rows, solid, 10, player, [], (rs) => {
      expect([rs[0][W_TX], rs[0][W_TY]]).not.toEqual([3, 1]);
    });
    expect([held.rows[0][W_X], held.rows[0][W_Y]]).toEqual([2, 1]);
    expect(held.rows[0][W_FACING]).toBe(3); // facing you, waiting
    const after = run(held.rows, held.solid, 3);
    expect(after.rows[0][W_X]).toBeGreaterThan(3);
  });

  it('waits behind someone standing on the beat, and never walks into them', () => {
    const solid = yard();
    solid[1 * W + 1] = 1;
    solid[1 * W + 4] = 1; // a stander on the top leg
    const rows = newWanderers([
      { x: 1, y: 1, facing: 0, patrol: LOOP },
      { x: 4, y: 1, facing: 0 },
    ]);
    const after = run(rows, solid, 20, FAR, [], (rs) => expect([rs[0][W_TX], rs[0][W_TY]]).not.toEqual([4, 1]));
    expect([after.rows[0][W_X], after.rows[0][W_Y]]).toEqual([3, 1]);
  });

  it('stops to face you when you talk to them, then marches on', () => {
    const { solid } = beat();
    let { rows } = beat();
    rows = run(rows, solid, 0.5).rows;
    rows = turnToTalk(rows, 0, 1);
    const stood = run(rows, solid, 3.5, FAR, [], (rs) => expect(rs[0][W_FACING]).toBe(1));
    const on = run(stood.rows, stood.solid, 3);
    expect(on.rows[0][W_FACING]).not.toBe(1);
    expect(on.rows[0][W_X]).toBeGreaterThan(stood.rows[0][W_X]);
    expect(on.rows[0][W_PI]).toBeGreaterThanOrEqual(1);
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

  it('marches one drum-warden round the square; the other two keep their post', () => {
    const wardens = MAPS['kingdom-town'].npcs.filter((n) => n.name.startsWith('Drum-warden'));
    expect(wardens.filter((n) => (n.wander ?? 0) > 0).map((n) => n.name)).toEqual(['Drum-warden Tuk']);
  });

  it('gives the towns some life', () => {
    expect(people.filter(({ n }) => (n.wander ?? 0) > 0).length).toBeGreaterThanOrEqual(15);
  });
});

describe('who walks a beat in the Other World (author, Oct 7, 2026)', () => {
  const patrols = Object.values(MAPS).flatMap((map) => map.npcs.filter((n) => n.patrol).map((n) => ({ map, n })));
  /** Every tile of a loop, corner to corner, all the way round. */
  const tilesOf = (loop: number[][]) =>
    loop.flatMap(([ax, ay], i) => {
      const [bx, by] = loop[(i + 1) % loop.length];
      const n = Math.abs(bx - ax) + Math.abs(by - ay);
      return Array.from({ length: n }, (_, k) => [ax + Math.sign(bx - ax) * k, ay + Math.sign(by - ay) * k]);
    });

  it('keeps a few patrols round the kingdom', () => {
    expect(patrols.length).toBeGreaterThanOrEqual(3);
    expect(new Set(patrols.map(({ map }) => map.id)).size).toBeGreaterThanOrEqual(2);
  });

  it('walks closed loops of straight legs, from somewhere on the loop', () => {
    for (const { n } of patrols) {
      const loop = n.patrol!;
      expect(loop.length).toBeGreaterThanOrEqual(2);
      loop.forEach(([ax, ay], i) => {
        const [bx, by] = loop[(i + 1) % loop.length];
        expect([n.name, ax === bx || ay === by, ax !== bx || ay !== by]).toEqual([n.name, true, true]);
      });
      expect([n.name, tilesOf(loop).some(([x, y]) => x === n.x && y === n.y)]).toEqual([n.name, true]);
    }
  });

  it('keeps every beat on open ground: clear of walls, of anyone standing, and of the ways in and out', () => {
    for (const { map, n } of patrols) {
      const ways = new Set(EXITS.filter((e) => e.from === map.id).map((e) => e.tile));
      const arrivals = EXITS.filter((e) => e.to?.map === map.id).map((e) => `${e.to!.x},${e.to!.y}`);
      arrivals.push(`${map.spawn.x},${map.spawn.y}`);
      const standing = map.objects
        .filter((o) => o.id !== n.id && !(o.type === 'npc' && (o.patrol || (o.wander ?? 0) > 0)))
        .map((o) => `${o.x},${o.y}`);
      const wrong = tilesOf(n.patrol!).filter(([x, y]) => {
        const c = map.tiles[y][x];
        return (
          !map.walkable.includes(c) || ways.has(c) || arrivals.includes(`${x},${y}`) || standing.includes(`${x},${y}`)
        );
      });
      expect([n.name, wrong]).toEqual([n.name, []]);
    }
  });

  it('never puts anyone the story needs on patrol, and nobody both patrols and strolls', () => {
    expect(patrols.filter(({ n }) => n.job || n.questions?.some((q) => q.sets) || n.wander || n.look)).toEqual([]);
    expect(patrols.filter(({ map }) => map.boss || map.ladder || map.enemies.length > 0)).toEqual([]);
  });
});
