import { GATE_FLAG, GATE_GUARD } from '../castle';
import { COMPANIONS, STARTERS, type CharacterId } from '@/story/companions';

import { BRANNOC_SCENES } from '../dungeon';
import { SIDE_WAYS } from '../felix-maze';
import { JOBS } from '../jobs';
import { MAPS, withBouldersMoved, withOpenTiles, type MapId, type WorldMap } from '../maps';
import { EXITS, type Requirement } from '../progress';
import { winScene } from '../scenes';

// A whole run of Season 1, as a player with every level they need (levels only
// take real habits). They start walking as the hero they woke as and meet the rest of
// the core eight along the road; a job only one Path can do waits until that
// Path's hero has been met. Starting in the Archive, it keeps doing whatever can
// be done — doors, jobs, people's jobs, meetings, fights, the plate puzzle —
// until nothing new opens, then checks the arc can be finished: the King beaten
// and the portal at the end reached.

type Arrive = { map: MapId; x: number; y: number };

/** Met if every story flag in it is set; levels count as met. */
function met(needs: Requirement, flags: Set<string>): boolean {
  if (needs.kind === 'flag') return flags.has(needs.flag);
  if (needs.kind === 'all') return needs.of.every((r) => met(r, flags));
  return true;
}

function reachable(map: WorldMap, from: [number, number][]): Set<number> {
  const seen = new Set<number>();
  const queue = [...from];
  while (queue.length > 0) {
    const [x, y] = queue.pop()!;
    if (x < 0 || y < 0 || x >= map.width || y >= map.height) continue;
    const i = y * map.width + x;
    if (seen.has(i) || map.solid[i]) continue;
    seen.add(i);
    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return seen;
}

/** Standing on it, or beside it (to press A). */
function near(map: WorldMap, seen: Set<number>, x: number, y: number): boolean {
  return [
    [x, y],
    [x + 1, y],
    [x - 1, y],
    [x, y + 1],
    [x, y - 1],
  ].some(([a, b]) => a >= 0 && b >= 0 && a < map.width && b < map.height && seen.has(b * map.width + a));
}

function tiles(map: WorldMap, letter: string): [number, number][] {
  const out: [number, number][] = [];
  map.tiles.forEach((row, y) => [...row].forEach((c, x) => c === letter && out.push([x, y])));
  return out;
}

function play(start: CharacterId) {
  const flags = new Set<string>();
  const arrivals: Arrive[] = [{ map: 'archive', ...MAPS.archive.spawn }];
  const visited = new Set<MapId>();
  // Who you can walk as: the hero you woke as from the first habit, the rest once met.
  const paths = new Set<string>([COMPANIONS[start].dimension]);
  // the hero you woke as is met from the start: their room off the Archive is open
  flags.add(`met:${start}`);
  const canDo = (path: string | null | undefined) => !path || path === 'any' || paths.has(path);
  let changed = true;
  while (changed) {
    changed = false;
    const add = (flag: string) => {
      if (!flags.has(flag)) {
        flags.add(flag);
        changed = true;
      }
    };
    const arrive = (a: Arrive) => {
      if (!arrivals.some((b) => b.map === a.map && b.x === a.x && b.y === a.y)) {
        arrivals.push(a);
        changed = true;
      }
    };
    for (const id of new Set(arrivals.map((a) => a.map))) {
      visited.add(id);
      const open = [
        ...EXITS.filter((e) => e.from === id && e.walk && met(e.needs, flags)).map((e) => e.tile),
        ...JOBS.filter((j) => j.map === id && j.opens && flags.has(j.flag)).map((j) => j.tile),
      ];
      const map = withBouldersMoved(withOpenTiles(MAPS[id], open));
      const seen = reachable(
        map,
        arrivals.filter((a) => a.map === id).map((a) => [a.x, a.y]),
      );
      for (const exit of EXITS.filter((e) => e.from === id && e.to && met(e.needs, flags))) {
        if (tiles(map, exit.tile).some(([x, y]) => near(map, seen, x, y))) arrive(exit.to!);
      }
      for (const way of SIDE_WAYS.filter((w) => w.from === id)) {
        if (tiles(map, way.tile).some(([x, y]) => near(map, seen, x, y))) arrive(way.to);
      }
      for (const npc of map.npcs) {
        // the core eight join on first talk; Brannoc after his scene in the dungeon (dungeon.ts: say yes)
        const joins = npc.meets || (npc.character && BRANNOC_SCENES.includes(npc.id));
        if (joins && npc.character && near(map, seen, npc.x, npc.y)) {
          add(`met:${npc.character}`);
          const path = COMPANIONS[npc.character].dimension;
          if (!paths.has(path)) {
            paths.add(path);
            changed = true;
          }
        }
      }
      for (const job of JOBS.filter((j) => j.map === id && canDo(j.path))) {
        if (tiles(map, job.tile).some(([x, y]) => near(map, seen, x, y))) add(job.flag);
      }
      for (const npc of map.npcs) {
        if (npc.job && canDo(npc.job.path) && near(map, seen, npc.x, npc.y)) add(npc.job.flag);
      }
      // the castle's gate captain: four ways past him, each on a level (levels count as met here)
      for (const npc of map.npcs) if (npc.id === GATE_GUARD && near(map, seen, npc.x, npc.y)) add(GATE_FLAG);
      if (map.platesFlag) add(map.platesFlag);
      // A ladder is a fight a visit, one after another; climbing it here means winning every rung.
      for (const boss of map.ladder ?? (map.boss ? [map.boss] : [])) {
        if (seen.size === 0) continue;
        // Like the game: winning sets only the flags its scene hands out.
        const scene = winScene(id, boss.flag, true);
        const outcomes = [scene?.outcome, ...(scene?.choices?.map((c) => c.outcome) ?? [])];
        for (const o of outcomes) {
          for (const f of o?.flags ?? []) add(f);
          if (o?.next) arrive(o.next);
        }
      }
    }
  }
  return { flags, visited, arrivals, met: paths };
}

// Whichever of the four starters you woke as (the Keeper's question), nobody gets stuck.
describe.each(STARTERS)('a run through Season 1, waking as %s', (start) => {
  const run = play(start);

  it('meets every one of the core eight along the way', () => {
    expect(run.met.size).toBe(8);
  });

  it('reaches every place in the Other World', () => {
    expect([...Object.keys(MAPS)].filter((id) => !run.visited.has(id as MapId))).toEqual([]);
  });

  it('can do everything that a way onward asks for', () => {
    const needed = new Set<string>();
    const collect = (r: Requirement) => {
      if (r.kind === 'flag') needed.add(r.flag);
      if (r.kind === 'all') r.of.forEach(collect);
    };
    EXITS.forEach((e) => collect(e.needs));
    expect([...needed].filter((f) => !run.flags.has(f))).toEqual([]);
  });

  it('wins every boss fight for good, the King included', () => {
    const bosses = Object.values(MAPS).flatMap((m): string[] =>
      m.ladder ? m.ladder.map((b) => b.flag) : m.boss ? [m.boss.flag] : [],
    );
    expect(bosses.filter((f) => !run.flags.has(f))).toEqual([]);
  });

  it('can get back to the portal at the end of Season 1 after leaving it', () => {
    // Coming back from the town: the Field of Banners must have a way in that isn't the King's scene.
    const intoField = EXITS.filter((e) => e.to?.map === 'field-of-banners');
    expect(intoField.length).toBeGreaterThan(0);
    const field = MAPS['field-of-banners'];
    const seen = reachable(
      field,
      intoField.map((e) => [e.to!.x, e.to!.y]),
    );
    expect(tiles(field, 'Q').some(([x, y]) => near(field, seen, x, y))).toBe(true);
  });
});
