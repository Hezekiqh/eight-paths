import { MAPS } from '../maps';
import { FELL_INTO, PIT_TILE, fallLines } from '../dungeon';

const ward = MAPS['dungeon-mazes'];
const at = (x: number, y: number) => ward.tiles[y]?.[x];

/** Every floor tile you can reach from the ladder without stepping on a pit (or onto one, with). */
function reach(pits: boolean) {
  const ok = (c: string | undefined) => (!!c && ['.', ','].includes(c)) || (pits && c === PIT_TILE);
  const seen = new Set(['2,2']);
  const queue = [[2, 2]];
  while (queue.length) {
    const [x, y] = queue.shift()!;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const k = `${x + dx},${y + dy}`;
      if (seen.has(k) || !ok(at(x + dx, y + dy))) continue;
      seen.add(k);
      queue.push([x + dx, y + dy]);
    }
  }
  return seen;
}

describe('the Maze Ward', () => {
  it('can be walked from ladder to ladder without stepping on a pit', () => {
    expect(reach(false).has('42,2')).toBe(true);
  });

  it('has a few pits, all walkable, on the wrong turns', () => {
    const pits = ward.tiles.flatMap((row, y) => [...row].flatMap((c, x) => (c === PIT_TILE ? [[x, y]] : [])));
    expect(pits.length).toBeGreaterThanOrEqual(3);
    expect(ward.walkable).toContain(PIT_TILE);
  });

  it('drops you in the cells, in the corridor', () => {
    const cells = MAPS[FELL_INTO.map];
    expect(cells.tiles[FELL_INTO.y][FELL_INTO.x]).toBe('.');
  });
});

describe('falling back in', () => {
  it('Nails, then Old Mott, then Silas, then whoever', () => {
    expect(fallLines(1).join(' ')).toContain('NAILS: Back already?');
    expect(fallLines(2).some((l) => l.startsWith('OLD MOTT:'))).toBe(true);
    expect(fallLines(3)[1]).toBe('SILAS: ...');
    for (let n = 4; n < 10; n++) expect(fallLines(n).length).toBeGreaterThan(1);
  });
});
