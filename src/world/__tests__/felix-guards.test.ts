import { PAST_THE_MAZE, seizeMarch } from '../felix-maze';
import { MAPS } from '../maps';

// "Seize him!" past Felix's maze: the guards close in from either side, Felix laughs and dashes off.
describe("the guards' scene past the maze", () => {
  const maze = MAPS['felix-maze'];
  const open = (x: number, y: number) => maze.walkable.includes(maze.tiles[y]?.[x] ?? 'T');
  const rows = { felix: 1, guard: 2 };
  // where you can be when it starts: out of the green candle, or stepping onto the clearing from the maze
  const starts: [number, number][] = [[PAST_THE_MAZE.x, PAST_THE_MAZE.y], ...clearing()];
  function clearing(): [number, number][] {
    const out: [number, number][] = [];
    maze.tiles.forEach((r, y) => [...r].forEach((c, x) => c === 'X' && out.push([x, y])));
    return out;
  }
  const tilesOf = (path: [number, number][]) => {
    const out: [number, number][] = [path[0]];
    for (let i = 1; i < path.length; i++) {
      const [ax, ay] = path[i - 1];
      const [bx, by] = path[i];
      expect(ax === bx || ay === by).toBe(true);
      const n = Math.abs(bx - ax) + Math.abs(by - ay);
      for (let k = 1; k <= n; k++) out.push([ax + Math.sign(bx - ax) * k, ay + Math.sign(by - ay) * k]);
    }
    return out;
  };

  it.each(starts)('from (%i, %i): the guards walk over open ground to beside you, never through you', (x, y) => {
    const [felix, a, b, you] = seizeMarch([x, y], open, rows);
    expect(you).toEqual({ row: -1, path: [[x, y]], face: 3 });
    const ends = [a, b].map((g) => g.path[g.path.length - 1]);
    for (const g of [a, b]) {
      const walked = tilesOf(g.path);
      for (const [tx, ty] of walked) expect([tx, ty, open(tx, ty)]).toEqual([tx, ty, true]);
      expect(walked).not.toContainEqual([x, y]);
      const [ex, ey] = g.path[g.path.length - 1];
      // next to you (or one behind the other, in front), facing you
      expect(Math.abs(ex - x) + Math.abs(ey - y)).toBeLessThanOrEqual(2);
    }
    expect(ends[0]).not.toEqual(ends[1]);
    // Felix laughs first, then he's off east and out of sight, faster than anyone
    expect(felix.laugh).toBe(true);
    expect(felix.delay).toBeGreaterThan(0);
    expect(felix.pace).toBeGreaterThan(1);
    expect(felix.path[felix.path.length - 1][0]).toBeGreaterThanOrEqual(maze.width);
    expect(tilesOf(felix.path)).not.toContainEqual([x, y]);
  });

  it('leaves the guards where they stand when they are not seizing you', () => {
    const [, a, b] = seizeMarch([PAST_THE_MAZE.x, PAST_THE_MAZE.y], open, rows, false);
    expect(a.path).toHaveLength(1);
    expect(b.path).toHaveLength(1);
  });
});
