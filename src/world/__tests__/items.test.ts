import { EXITS } from '../progress';
import { JOBS, openedByJobs } from '../jobs';
import { MAPS, withOpenTiles, type MapId } from '../maps';
import { CHESTS, PIECES_PER_HEART, candlesOn, chestFlag, foundLines, heartPieces, isCandle, maxHearts } from '../items';
import { ambienceOf, flamesOn } from '../ambience';

describe('heart pieces', () => {
  const pieces = CHESTS.filter((c) => c.item === 'heart-piece');

  it('adds a heart for every four pieces', () => {
    expect(maxHearts([])).toBe(5);
    const four = pieces.slice(0, PIECES_PER_HEART).map((c) => chestFlag(c.id));
    if (pieces.length >= PIECES_PER_HEART) {
      expect(heartPieces(four)).toBe(PIECES_PER_HEART);
      expect(maxHearts(four)).toBe(6);
      expect(foundLines('heart-piece', four).join(' ')).toMatch(/you now have 6/);
    }
  });

  it('comes in whole hearts', () => {
    expect(pieces.length % PIECES_PER_HEART).toBe(0);
  });
});

describe('candles', () => {
  it('are where the maps say to rest', () => {
    expect(candlesOn(MAPS['courier-road'])).toHaveLength(1);
    expect(candlesOn(MAPS['candle-inn'])).toHaveLength(1);
    const c = candlesOn(MAPS.millbrook)[0];
    expect(isCandle(MAPS.millbrook, c.x, c.y)).toBe(true);
  });

  it("leaves Kaldor's torches alone", () => {
    expect(candlesOn(MAPS['war-hall'])).toEqual([]);
    expect(flamesOn(MAPS['war-hall'])).toHaveLength(6);
  });
});

describe('ambience', () => {
  it('keeps the outdoors bright and the crypt dark', () => {
    expect(ambienceOf(MAPS['courier-road']).darkness).toBe(0);
    expect(ambienceOf(MAPS['old-kings-crypt']).darkness).toBeGreaterThan(0.5);
  });
});

describe('what stands in the rooms', () => {
  // Everyone and everything must be reachable: flood the floor from every way in
  // (with every job done and door open), and each object needs a reachable neighbour.
  const allJobs = JOBS.map((j) => j.flag);
  it.each(Object.keys(MAPS) as MapId[])('can be walked up to in %s', (id) => {
    const map = withOpenTiles(MAPS[id], [
      ...EXITS.filter((e) => e.from === id).map((e) => e.tile),
      ...openedByJobs(id, allJobs),
    ]);
    const starts = [map.spawn, ...EXITS.filter((e) => e.to?.map === id).map((e) => e.to!)];
    const seen = new Set<number>();
    const queue = starts.map((s) => s.y * map.width + s.x).filter((t) => !map.solid[t]);
    for (const t of queue) seen.add(t);
    while (queue.length) {
      const t = queue.shift()!;
      const x = t % map.width;
      const y = Math.floor(t / map.width);
      for (const [nx, ny] of [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1],
      ]) {
        const n = ny * map.width + nx;
        if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height || seen.has(n) || map.solid[n]) continue;
        seen.add(n);
        queue.push(n);
      }
    }
    // next to somewhere you can stand, or across bars from it (map.talkThrough: the prisoners in their cells)
    const through = (x: number, y: number) => map.talkThrough?.includes(map.tiles[y]?.[x] ?? '') ?? false;
    const stuck = map.objects.filter(
      (o) =>
        ![
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ].some(
          ([dx, dy]) =>
            seen.has((o.y + dy) * map.width + o.x + dx) ||
            (through(o.x + dx, o.y + dy) && seen.has((o.y + 2 * dy) * map.width + o.x + 2 * dx)),
        ),
    );
    expect(stuck.map((o) => o.id)).toEqual([]);
  });

  it("lets you reach the Prince's niche in the crypt", () => {
    const map = MAPS['old-kings-crypt'];
    expect(map.tiles[2][6]).toBe('M');
    expect(map.solid[3 * map.width + 6]).toBe(0);
  });
});
