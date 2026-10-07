import { emptyDimensionRecord, xpToNextLevel } from '@/game';

import { MAPS, objectAt, withBouldersMoved, type MapId, type WorldMap } from '../maps';
import { MEMORIES, SEASONS, memoryAt, memoryCall, notYetLines, seasonMemory } from '../memories';
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
  it('holds at most one a season, each with its own id', () => {
    expect(new Set(MEMORIES.map((m) => m.id)).size).toBe(MEMORIES.length);
    // (someone's own, Brannoc's, aren't the season's: any number of those)
    const hidden = MEMORIES.filter((m) => !m.whose);
    expect(new Set(hidden.map((m) => m.season)).size).toBe(hidden.length);
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
    const first = seasonMemory(1)!;
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

  describe("Brannoc's own", () => {
    const school = MEMORIES.find((m) => m.id === 'brannoc-school')!;
    const forest = MEMORIES.find((m) => m.id === 'brannoc-forest')!;

    it('are his, in his places, and the school opens his dream', () => {
      expect(school.whose).toBe('brannoc');
      expect(school.map).toBe('painters-school');
      expect(school.sets).toBe('brannoc-flashback');
      expect(forest.whose).toBe('brannoc');
      expect(forest.map).toBe('royal-forest');
      expect(seasonMemory(1)!.id).toBe('schoolyard');
    });

    it('play only with him in the party; without him, a line of narration; before the paintings hang, nothing', () => {
      expect(memoryCall(school, [], false, ['brannoc'])).toBeNull();
      expect(memoryCall(school, [], true, ['brannoc', 'oren'])).toBe('play');
      expect(memoryCall(school, [], true, ['oren'])).toEqual([
        'The paintings hang in order. Nothing happens. The room seems to be waiting for someone who was here.',
      ]);
      // the hero is silent (STORY.md): narration, never an invented thought
      expect(memoryCall(forest, [], true, ['oren'])?.at(-1)).not.toMatch(/^\(.*\)$/);
      expect(memoryCall(forest, [], true, ['brannoc'])).toBe('play');
      expect(memoryCall(forest, ['brannoc-forest'], true, ['brannoc'])).not.toBe('play');
    });

    it('tell what he remembers and no more: no Keeper, no cocoon, no king behind the shadows', () => {
      const text = [...school.lines, ...forest.lines].join(' ');
      expect(text).not.toMatch(/Keeper|cocoon|Kaldor|uncle|colours|king's men|sent/i);
      expect(text).toContain("Yearning for battle doesn't make one a great warrior.");
      expect(text).toContain('The responsibilities of the crown are heavy.');
      expect(forest.lines.join(' ')).toMatch(/Shadows/);
    });
  });
});
