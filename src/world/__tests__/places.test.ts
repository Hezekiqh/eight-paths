import { MAPS, type MapId, type WorldMap } from '../maps';

/** Every tile you can walk to from `start`, optionally treating hidden gaps ('h') as walls. */
function reachable(map: WorldMap, start: [number, number], throughGaps: boolean): Set<string> {
  const seen = new Set<string>();
  const queue = [start];
  while (queue.length > 0) {
    const [x, y] = queue.pop()!;
    const key = `${x},${y}`;
    if (seen.has(key) || x < 0 || y < 0 || x >= map.width || y >= map.height) continue;
    if (map.solid[y * map.width + x]) continue;
    if (!throughGaps && map.tiles[y][x] === 'h') continue;
    seen.add(key);
    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return seen;
}

describe('places', () => {
  it('stand every NPC on ground that is otherwise open', () => {
    for (const id of Object.keys(MAPS) as MapId[]) {
      const map = MAPS[id];
      for (const npc of map.npcs) expect(map.walkable).toContain(map.tiles[npc.y][npc.x]);
    }
  });

  it.each([
    ['courier-road', [12, 7], [33, 2]],
    ['millbrook', [30, 7], [3, 2]],
  ] as const)('hide a clearing in %s that only a gap in the trees leads to', (id, start, secret) => {
    const map = MAPS[id];
    const key = `${secret[0]},${secret[1]}`;
    expect(reachable(map, [...start], false).has(key)).toBe(false);
    expect(reachable(map, [...start], true).has(key)).toBe(true);
  });
});
