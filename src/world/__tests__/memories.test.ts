import { emptyDimensionRecord, xpToNextLevel } from '@/game';

import { MAPS, objectAt, withBouldersMoved, type MapId, type WorldMap } from '../maps';
import { MEMORIES, PER_SEASON, SEASONS, memoryAt, notYetLines } from '../memories';
import { EXITS, describeRequirement, standing, type XpTotals } from '../progress';
import { FRESH_WORLD, useWorldStore } from '../store';

/** Every tile you can walk to from `start`. */
function reachable(map: WorldMap, start: [number, number]): Set<string> {
  const seen = new Set<string>();
  const queue = [start];
  while (queue.length > 0) {
    const [x, y] = queue.pop()!;
    const key = `${x},${y}`;
    if (seen.has(key) || x < 0 || y < 0 || x >= map.width || y >= map.height) continue;
    if (map.solid[y * map.width + x]) continue;
    seen.add(key);
    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return seen;
}

const physical = (xp: number): XpTotals => ({ total: xp, byPath: { ...emptyDimensionRecord(0), physical: xp } });

describe('hidden memories', () => {
  it('holds at most four a season, each with its own id and its own spot', () => {
    expect(new Set(MEMORIES.map((m) => m.id)).size).toBe(MEMORIES.length);
    expect(new Set(MEMORIES.map((m) => `${m.map}:${m.x},${m.y}`)).size).toBe(MEMORIES.length);
    for (let season = 1; season <= SEASONS; season++)
      expect(MEMORIES.filter((m) => m.season === season).length).toBeLessThanOrEqual(PER_SEASON);
    for (const m of MEMORIES) expect(m.season).toBeGreaterThanOrEqual(1);
    for (const m of MEMORIES) expect(m.season).toBeLessThanOrEqual(SEASONS);
  });

  it.each(MEMORIES.map((m) => [m.id, m] as const))('%s: hides where you can walk up and face it', (_, m) => {
    const map = withBouldersMoved(MAPS[m.map as MapId]);
    // nothing else stands there, and it isn't a way out
    expect(objectAt(map, m.x, m.y)).toBeUndefined();
    const ways = EXITS.filter((e) => e.from === m.map).map((e) => e.tile);
    expect(ways).not.toContain(map.tiles[m.y][m.x]);
    expect(memoryAt(m.map, m.x, m.y)).toBe(m);
    // some tile beside it can be reached from wherever you come in
    const starts = [[map.spawn.x, map.spawn.y] as [number, number]];
    const near = [
      [m.x + 1, m.y],
      [m.x - 1, m.y],
      [m.x, m.y + 1],
      [m.x, m.y - 1],
    ];
    const seen = reachable(map, starts[0]);
    expect(near.some(([x, y]) => seen.has(`${x},${y}`))).toBe(true);
  });

  it('the first is the schoolyard, in Season 1, at Warrior Lv 6', () => {
    const first = MEMORIES.find((m) => m.season === 1)!;
    expect(first.id).toBe('schoolyard');
    expect(describeRequirement(first.needs)).toBe('Warrior Lv 6');
    expect(standing(first.needs, physical(0)).met).toBe(false);
    expect(standing(first.needs, physical(xpToNextLevel(5))).met).toBe(true);
    expect(notYetLines(describeRequirement(first.needs))[1]).toBe('(Warrior Lv 6 to remember.)');
  });

  it('never names who the children grow up to be', () => {
    for (const m of MEMORIES) {
      const text = m.lines.join(' ');
      expect(text).not.toMatch(/Monarch|Keeper|Entity|Chosen/i);
    }
  });

  it('remembers each once, and a restart of the story keeps them', () => {
    useWorldStore.setState({ ...FRESH_WORLD, memories: [] });
    useWorldStore.getState().remember('schoolyard');
    useWorldStore.getState().remember('schoolyard');
    expect(useWorldStore.getState().memories).toEqual(['schoolyard']);
    useWorldStore.getState().restart();
    expect(useWorldStore.getState().memories).toEqual(['schoolyard']);
  });
});
