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

describe('the Maze Ward holes', () => {
  const { MAZE_HOLES } = jest.requireActual('../dungeon') as typeof import('../dungeon');
  const ward = MAPS['dungeon-mazes'];
  it('sit in the wall, each beside floor you can stand on, and land you on floor further along', () => {
    for (const h of MAZE_HOLES.filter((m) => m.map === 'dungeon-mazes')) {
      const spots: [number, number][] = [];
      ward.tiles.forEach((row, y) => [...row].forEach((c, x) => c === h.tile && spots.push([x, y])));
      expect(spots).toHaveLength(1);
      const [x, y] = spots[0];
      const beside = [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1],
      ].some(([bx, by]) => ward.walkable.includes(ward.tiles[by]?.[bx] ?? '#'));
      expect([h.tile, beside]).toEqual([h.tile, true]);
      expect(ward.walkable).toContain(ward.tiles[h.to.y][h.to.x]);
      expect(h.to.x).toBeGreaterThan(x);
    }
  });
  it('need more Mage the further they skip: Lv 6, then 10', () => {
    const ward = MAZE_HOLES.filter((h) => h.map === 'dungeon-mazes');
    expect(ward.map((h) => (h.needs.kind === 'path' ? h.needs.level : 0))).toEqual([6, 10]);
  });
  it("include the Test of the Mind's shortcut, a Mage's way past the plates to the Hall of Champions", () => {
    const mind = MAZE_HOLES.find((h) => h.map === 'dungeon-mind');
    expect(mind?.to.map).toBe('dungeon-lore');
    expect(MAPS['dungeon-mind'].tiles.some((row) => row.includes(mind!.tile))).toBe(true);
    expect(MAPS['dungeon-lore'].walkable).toContain(MAPS['dungeon-lore'].tiles[mind!.to.y][mind!.to.x]);
  });
});
