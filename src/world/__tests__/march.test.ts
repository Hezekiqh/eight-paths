import { MARCH_HEAD, marchPoses, newMarch } from '../march';
import { MAPS, TILE } from '../maps';
import { brannocBolts, escortIn, escortStand, guardsLeave, shovedIn } from '../dungeon';

const at = (x: number, y: number) => [x * TILE + TILE / 2, y * TILE + TILE - 2];

describe('a march', () => {
  it('walks everyone along their path and stops them at the end, facing the way asked', () => {
    const m = newMarch([{ row: 3, path: [[1, 1], [4, 1], [4, 3]], face: 0 }], 2);
    expect(m.length).toBe(MARCH_HEAD + 3 + 6);
    const half = marchPoses(m, 1).poses[0]; // 2 tiles in: along the top, walking right
    expect(half.slice(3, 5)).toEqual(at(3, 1));
    expect(half[1]).toBe(3);
    expect(half[5]).toBe(1);
    const end = marchPoses(m, 10);
    expect(end.poses[0].slice(3, 5)).toEqual(at(4, 3));
    expect(end.poses[0][1]).toBe(0);
    expect(end.done).toBe(true);
    expect(marchPoses(m, 2).done).toBe(false);
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
  ])('%s: every path runs in straight lines over floor (or the doors it goes through)', (_, actors) => {
    for (const a of actors)
      a.path.forEach(([x, y], i) => {
        const tile = cells.tiles[y][x];
        // the cell door (4) and the bars Brannoc goes through (2) are walked through in the scene
        expect([x, y, open.has(tile) || tile === '4' || tile === '2']).toEqual([x, y, true]);
        if (i > 0) {
          const [px, py] = a.path[i - 1];
          expect(px === x || py === y).toBe(true);
        }
      });
  });
  it('ends with you inside the cell', () => {
    const you = shovedIn(23).find((a) => a.row === -1)!;
    expect(you.path[you.path.length - 1]).toEqual([6, 4]);
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
  const { MAZE_HOLES, PIT_TILE, PIT_LANDING } = jest.requireActual('../dungeon') as typeof import('../dungeon');
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
  it('has its hole in the first maze, and lands you by the ladder back up', () => {
    const [[hx]] = find(PIT_TILE);
    const [[wall]] = find('6');
    expect(hx).toBeLessThan(13);
    expect(wall).toBeLessThan(13);
    const up = EXITS.find((e) => e.id === 'cells-mazes')!;
    const ladder = MAPS['kingdom-dungeon'].tiles[PIT_LANDING.y + 1][PIT_LANDING.x];
    expect([PIT_LANDING.map, ladder]).toEqual([up.from, up.tile]);
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
