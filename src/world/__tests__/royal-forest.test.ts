import { MAPS, type WorldMap } from '../maps';
import { MEMORIES } from '../memories';
import { EXITS } from '../progress';
import { FOREST, GAP_ROWS, GAP_TILE, LOOP_TILE, TRAIL, type Way } from '../royal-forest';

// The Royal Forest's puzzle (author, Oct 7, 2026): follow Brannoc's carvings. Each points the way he ran;
// any other gap walks you back out where you came in.

const forest = MAPS[FOREST] as WorldMap;
const WAYS = Object.keys(GAP_ROWS) as Way[];
const arrival = EXITS.find((e) => e.id === 'south-forest')!.to!;
const heart = MEMORIES.find((m) => m.id === 'brannoc-forest')!;

/** Every tile you can walk to, the wrong gaps counting as walls (stepping in one sends you back). */
function walk(map: WorldMap, start: [number, number], open: string[] = []): Set<string> {
  const seen = new Set<string>();
  const queue = [start];
  while (queue.length > 0) {
    const [x, y] = queue.pop()!;
    const key = `${x},${y}`;
    if (seen.has(key) || x < 0 || y < 0 || x >= map.width || y >= map.height) continue;
    const tile = map.tiles[y][x];
    if (map.solid[y * map.width + x] && !open.includes(tile)) continue;
    seen.add(key);
    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return seen;
}

const nextTo = (seen: Set<string>, x: number, y: number) =>
  [
    [x + 1, y],
    [x - 1, y],
    [x, y + 1],
    [x, y - 1],
  ].some(([a, b]) => seen.has(`${a},${b}`));

describe('the Royal Forest', () => {
  it('is reached from the South Road, and leads back to it', () => {
    expect(arrival.map).toBe(FOREST);
    expect(EXITS.find((e) => e.id === 'forest-south')!.to!.map).toBe('south-road');
  });

  it.each(TRAIL.map((t, i) => [i + 1, t] as const))('wall %i: its carving points the one way through', (_, t) => {
    // the carving says which way, in so many words
    const said = forest.examine[t.carving].join(' ');
    expect(said).toContain(t.way);
    for (const other of WAYS.filter((w) => w !== t.way)) expect(said).not.toContain(` ${other}`);
    // that gap goes on; the other two turn you round as you step in
    for (const way of WAYS) {
      const tile = forest.tiles[GAP_ROWS[way]][t.x];
      expect([way, tile]).toEqual([way, way === t.way ? GAP_TILE : LOOP_TILE]);
      expect(forest.tiles[GAP_ROWS[way]][t.x - 1]).toBe(GAP_TILE);
    }
    // and the wall has no other way through it
    forest.tiles.forEach((row, y) => {
      if (Object.values(GAP_ROWS).includes(y)) return;
      expect([y, row[t.x], row[t.x - 1]]).toEqual([y, 'T', 'T']);
    });
  });

  it('every wrong gap walks you back out where you came in', () => {
    const loop = EXITS.find((e) => e.from === FOREST && e.tile === LOOP_TILE)!;
    expect(loop.walk).toBe(true);
    expect(loop.to).toEqual(arrival);
  });

  it('can be solved: the carvings lead to the heart, and nothing else does', () => {
    const seen = walk(forest, [arrival.x, arrival.y]);
    expect(nextTo(seen, heart.x, heart.y)).toBe(true);
    // following each carving, wall by wall
    let here: [number, number] = [arrival.x, arrival.y];
    for (const t of TRAIL) {
      const gap: [number, number] = [t.x - 1, GAP_ROWS[t.way]];
      expect(walk(forest, here).has(`${gap[0]},${gap[1]}`)).toBe(true);
      here = [gap[0] - 1, gap[1]];
    }
    expect(nextTo(walk(forest, here), heart.x, heart.y)).toBe(true);
  });

  it('shows the way in its first carving, near where you come in', () => {
    const first = TRAIL[0];
    const [cx, cy] = (() => {
      for (let y = 0; y < forest.height; y++) {
        const x = forest.tiles[y].indexOf(first.carving);
        if (x >= 0) return [x, y];
      }
      return [-1, -1];
    })();
    expect(cx).toBeGreaterThan(first.x);
    expect(Math.abs(cx - arrival.x) + Math.abs(cy - arrival.y)).toBeLessThan(6);
  });

  it('has shadows, more of them the deeper you go, and none by the way in', () => {
    const edges = [forest.width, ...TRAIL.map((t) => t.x), 0];
    const counts = edges.slice(0, -1).map((east, i) => {
      const west = edges[i + 1];
      return forest.enemies.filter((e) => e.kind === 'shadow' && e.x < east && e.x > west).length;
    });
    expect(counts[0]).toBe(0);
    for (let i = 1; i < counts.length; i++) expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1]);
    expect(counts.at(-1)).toBeGreaterThan(counts[1]);
  });

  it('keeps a woodcutter at the edge, with one mean thing to say to him', () => {
    const woodcutter = forest.npcs.find((n) => n.id === 'forest-woodcutter')!;
    expect(woodcutter.x).toBeGreaterThan(TRAIL[0].x);
    expect(woodcutter.questions!.filter((q) => q.deed === 'bad')).toHaveLength(1);
  });
});
