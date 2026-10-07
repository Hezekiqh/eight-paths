import { GONE, MARCH_HEAD, marchPoses, newMarch } from '../march';
import { MAPS, TILE } from '../maps';
import {
  CELL_DOORS,
  brannocBolts,
  brannocShuffles,
  escortIn,
  escortStand,
  guardsLeave,
  prisonersLeave,
  shovedIn,
  toTheCells,
} from '../dungeon';

const at = (x: number, y: number) => [x * TILE + TILE / 2, y * TILE + TILE - 2];

describe('a march', () => {
  it('walks everyone along their path and stops them at the end, facing the way asked', () => {
    const m = newMarch([{ row: 3, path: [[1, 1], [4, 1], [4, 3]], face: 0 }], 2);
    expect(m.length).toBe(MARCH_HEAD + 4 + 6);
    const half = marchPoses(m, 1).poses[0]; // 2 tiles in: along the top, walking right
    expect(half.slice(3, 5)).toEqual(at(3, 1));
    expect(half[1]).toBe(3);
    expect(half[5]).toBe(1);
    const end = marchPoses(m, 10);
    expect(end.poses[0].slice(3, 5)).toEqual(at(4, 3));
    expect(end.poses[0][1]).toBe(0);
    expect(end.done).toBe(true);
    expect(marchPoses(m, 2).done).toBe(false);
    expect(end.poses[0][6]).toBe(0);
  });
  it("is gone once there, for whoever's leaving (up a ladder), and walks there like anyone else", () => {
    const m = newMarch([{ row: 3, path: [[1, 1], [4, 1]], face: GONE }]);
    const mid = marchPoses(m, 0.5).poses[0];
    expect(mid[7]).toBe(0);
    expect(mid[1]).toBe(3);
    expect(marchPoses(m, 5).poses[0][7]).toBe(1);
  });
  it('carries a snot bubble for whoever walks it asleep', () => {
    const m = newMarch([{ row: 3, path: [[1, 1], [2, 1]], snot: true }, { row: 4, path: [[5, 5]] }]);
    const { poses } = marchPoses(m, 0.1);
    expect(poses.map((p) => p[6])).toEqual([1, 0]);
  });
});

describe('the escort to the cell', () => {
  const cells = MAPS['kingdom-dungeon'];
  const open = new Set(['.', ',', '3']);
  it.each([
    ['stand', escortStand(23)],
    ['in', escortIn(23)],
    ['shoved', shovedIn(23)],
    ['out', guardsLeave(23)],
    ['brannoc', brannocBolts(0)],
    ['brannoc, from beside him', brannocBolts(0, [3, 4])],
    ['brannoc, from the back', brannocBolts(0, [3, 3])],
    ['brannoc, you in the way', brannocBolts(0, [5, 4])],
    ['the prisoners', prisonersLeave({ mott: 1, nails: 2, silas: 3 })],
  ])('%s: every path runs in straight lines over floor (or the doors it goes through)', (_, actors) => {
    for (const a of actors)
      a.path.forEach(([x, y], i) => {
        const tile = cells.tiles[y][x];
        // the cell doors (4, p), the bars Brannoc goes through (2) and the ladder up (1) are walked through
        expect([x, y, open.has(tile) || ['4', '2', 'p', '1'].includes(tile)]).toEqual([x, y, true]);
        if (i > 0) {
          const [px, py] = a.path[i - 1];
          expect(px === x || py === y).toBe(true);
        }
      });
  });
  it("Brannoc never runs through you, and you're never moved more than a step", () => {
    for (const you of [
      [3, 4],
      [3, 3],
      [4, 4],
      [2, 3],
      [5, 3],
      [5, 4],
      [6, 4],
    ] as [number, number][]) {
      const [run, me] = brannocBolts(0, you);
      const end = me.path[me.path.length - 1];
      expect(me.path[0]).toEqual(you);
      expect(Math.abs(end[0] - you[0]) + Math.abs(end[1] - you[1])).toBeLessThanOrEqual(1);
      // every tile he crosses, on each straight run
      const crossed = new Set<string>();
      run.path.forEach(([x, y], i) => {
        if (i === 0) return crossed.add(`${x},${y}`);
        const [px, py] = run.path[i - 1];
        for (let k = 0; k <= Math.abs(x - px) + Math.abs(y - py); k++)
          crossed.add(`${px + Math.sign(x - px) * (px === x ? 0 : k)},${py + Math.sign(y - py) * (py === y ? 0 : k)}`);
      });
      expect([you, crossed.has(end.join())]).toEqual([you, false]);
    }
  });
  it('the prisoners go up the ladder clear of you, where the keys left you (not a tile above your head)', () => {
    const [me] = toTheCells(4, 7);
    const [x, y] = me.path[me.path.length - 1];
    for (const a of prisonersLeave({ mott: 1, nails: 2, silas: 3 }))
      for (const [px, py] of a.path) expect([px, py]).not.toEqual([x, y - 1]);
  });
  it("the prisoners come out of their own cells' doors, one at a time, never on the same tile", () => {
    const leave = prisonersLeave({ mott: 1, nails: 2, silas: 3 });
    const doors = leave.map((a) => [a.path[0][0], a.path[0][1] + 1]);
    expect(doors.sort()).toEqual(CELL_DOORS.map((d) => [d.x, d.y]).sort());
    const m = newMarch(leave);
    for (let t = 0; t < 10; t += 0.05) {
      const at = marchPoses(m, t)
        .poses.filter((p) => p[7] === 0)
        .map((p) => `${Math.round(p[3] / 4)},${Math.round(p[4] / 4)}`);
      expect(new Set(at).size).toBe(at.length);
    }
  });
  it('ends with you inside the cell', () => {
    const you = shovedIn(23).find((a) => a.row === -1)!;
    expect(you.path[you.path.length - 1]).toEqual([6, 4]);
  });
});

describe('Brannoc shuffling off after his swing', () => {
  const pit = MAPS['the-pit'];
  const free = (x: number, y: number) => pit.walkable.includes(pit.tiles[y]?.[x] ?? 'T');
  it.each([
    [15, 12],
    [15, 14],
    [12, 14],
    [9, 14],
    [16, 13],
    [20, 9],
  ])('goes round you at %i,%i, over sand, to the trapdoor', (x, y) => {
    const [a] = brannocShuffles(0, [x, y], free);
    expect(a.path[a.path.length - 1]).toEqual([7, 14]);
    a.path.forEach(([px, py], i) => {
      if (i === 0) return;
      const [qx, qy] = a.path[i - 1];
      expect(px === qx || py === qy).toBe(true);
      for (let k = 0; k <= Math.abs(px - qx) + Math.abs(py - qy); k++) {
        const tx = qx + Math.sign(px - qx) * k;
        const ty = qy + Math.sign(py - qy) * k;
        expect([tx, ty]).not.toEqual([x, y]);
        if (!(tx === 7 && ty === 14)) expect([tx, ty, free(tx, ty)]).toEqual([tx, ty, true]);
      }
    });
  });
});

describe('the prison route', () => {
  it('runs in the Kaldorium once the bars are bent, until the warden is down', () => {
    const { prisonRoute } = jest.requireActual('../dungeon') as typeof import('../dungeon');
    expect(prisonRoute('the-pit', ['cell-bars-bent'])).toBe(true);
    expect(prisonRoute('the-pit', [])).toBe(false);
    expect(prisonRoute('the-pit', ['cell-bars-bent', 'pit-champion'])).toBe(false);
    expect(prisonRoute('kingdom-town', ['cell-bars-bent'])).toBe(false);
  });
});

describe('the Maze Ward', () => {
  const { MAZE_HOLES, POTHOLE } = jest.requireActual('../dungeon') as typeof import('../dungeon');
  const PIT_TILE = POTHOLE.tile;
  const { EXITS } = jest.requireActual('../progress') as typeof import('../progress');
  const ward = MAPS['dungeon-mazes'];
  const at = (x: number, y: number) => ward.tiles[y]?.[x] ?? '#';
  const find = (c: string) => {
    const spots: [number, number][] = [];
    ward.tiles.forEach((row, y) => [...row].forEach((t, x) => t === c && spots.push([x, y])));
    return spots;
  };
  /** Every tile you can walk to from here, without going through these. */
  const reach = (from: [number, number], blocked: string[] = []) => {
    const seen = new Set([from.join()]);
    const queue = [from];
    while (queue.length > 0) {
      const [x, y] = queue.shift()!;
      for (const [nx, ny] of [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1],
      ] as [number, number][]) {
        const c = at(nx, ny);
        if (seen.has(`${nx},${ny}`) || blocked.includes(c) || !(ward.walkable.includes(c) || c === '2')) continue;
        seen.add(`${nx},${ny}`);
        queue.push([nx, ny]);
      }
    }
    return seen;
  };
  const [ladderUp] = find('2');
  const start = EXITS.find((e) => e.id === 'cells-mazes')!.to!;

  it('can be walked from the ladder down to the ladder up', () => {
    expect(reach([start.x, start.y]).has(ladderUp.join())).toBe(true);
  });
  it('can still be walked once the hole is open: the run is wide enough to go round it', () => {
    expect(find(PIT_TILE)).toHaveLength(1);
    expect(reach([start.x, start.y], [PIT_TILE]).has(ladderUp.join())).toBe(true);
  });
  it('has its hole in the first maze, dropping you in the cells, a short walk from the ladder back up', () => {
    const [[hx]] = find(PIT_TILE);
    const [[wall]] = find('6');
    expect(hx).toBeLessThan(13);
    expect(wall).toBeLessThan(13);
    const down = EXITS.find((e) => e.id === 'maze-pothole')!.to!;
    expect(down.map).toBe('kingdom-dungeon');
    expect(MAPS['kingdom-dungeon'].walkable).toContain(MAPS['kingdom-dungeon'].tiles[down.y][down.x]);
  });
  it('gets harder maze by maze: each takes longer to walk than the one before', () => {
    // the gaps in the walls between the mazes (x = 13 and x = 33), and the ladder up at the end
    const gap = (x: number): [number, number] => [x, ward.tiles.findIndex((r) => r[x] === '.')];
    const steps = (a: [number, number], b: [number, number]) => {
      const dist = new Map([[a.join(), 0]]);
      const queue = [a];
      while (queue.length > 0) {
        const [x, y] = queue.shift()!;
        for (const [nx, ny] of [
          [x + 1, y],
          [x - 1, y],
          [x, y + 1],
          [x, y - 1],
        ] as [number, number][]) {
          const c = at(nx, ny);
          if (dist.has(`${nx},${ny}`) || !(ward.walkable.includes(c) || c === '2') || c === PIT_TILE) continue;
          dist.set(`${nx},${ny}`, dist.get(`${x},${y}`)! + 1);
          queue.push([nx, ny]);
        }
      }
      return dist.get(b.join()) ?? Infinity;
    };
    const one = steps([start.x, start.y], gap(13));
    const two = steps(gap(13), gap(33));
    const three = steps(gap(33), ladderUp);
    expect(one).toBeLessThan(two);
    expect(two).toBeLessThan(three);
    expect(three).toBeLessThan(Infinity);
  });
  it('has one Brannoc-shaped hole, in the wall by the way in, landing you on floor further along', () => {
    expect(MAZE_HOLES).toHaveLength(1);
    for (const h of MAZE_HOLES) {
      const spots = find(h.tile);
      expect(spots).toHaveLength(1);
      const [x, y] = spots[0];
      const beside = [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1],
      ].some(([bx, by]) => ward.walkable.includes(at(bx, by)));
      expect([h.tile, beside]).toEqual([h.tile, true]);
      expect(ward.walkable).toContain(at(h.to.x, h.to.y));
      expect(h.to.x).toBeGreaterThan(x);
      expect(h.needs.kind === 'path' ? h.needs.level : 0).toBe(6);
    }
  });
});
