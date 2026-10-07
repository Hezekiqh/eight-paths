import { CLASSES, type Dimension } from '@/game';

import { GATE_FLAG, GATE_GUARD } from './castle';
import { COCOONS } from './cocoons';
import { JOBS } from './jobs';
import { MAPS, type MapId, type WorldMap } from './maps';
import {
  EXITS,
  FINAL_GOAL,
  describeRequirement,
  howToProgress,
  standing,
  type Exit,
  type Requirement,
  type XpTotals,
} from './progress';

// The Area map's "what now?": the one person or thing to go to next to get on
// with the story, wherever the player stands. The story's spine is the gated
// ways out, in the order EXITS lists them; each flag they need is set by
// someone (an NPC's job, a boss fight) or something (a lever, the plates) with
// a place on a map, so the guide can always point somewhere.

/** A tile box, in tiles. */
export type TileBox = { x: number; y: number; w: number; h: number };

export type Goal = {
  /** What to mark on this area's map, if anything is here: the person, thing or way out. */
  mark: { box: TileBox; tag: string; exitId?: string } | null;
  /** The legend line: what to do. */
  line: string;
  /** Only a character of this Path can do it (walk as them: pause, then Party). */
  path?: Dimension;
};

/** Something that sets a story flag, and where. */
type Setter = {
  map: MapId;
  box: TileBox;
  tag: string;
  who?: string;
  path?: Dimension;
  talk?: boolean;
  exitId?: string;
};

const ONE = (x: number, y: number): TileBox => ({ x, y, w: 1, h: 1 });

/** "a Bard can do it", for a job only one Path can do. */
function whoCan(path: string | null | undefined): string | undefined {
  if (!isPath(path)) return undefined;
  const name = CLASSES[path as Dimension].className;
  return `${/^[AEIOU]/.test(name) ? 'an' : 'a'} ${name} can do it`;
}

const isPath = (path: string | null | undefined): path is Dimension => !!path && path in CLASSES;

/** The bounding box, in tiles, of every tile with this letter. */
export function tileBox(map: WorldMap, letter: string): TileBox | null {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -1;
  let y1 = -1;
  map.tiles.forEach((row, y) =>
    [...row].forEach((c, x) => {
      if (c !== letter) return;
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }),
  );
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** Everyone and everything that sets this flag. */
export function settersOf(flag: string): Setter[] {
  const out: Setter[] = [];
  for (const id of Object.keys(MAPS) as MapId[]) {
    const map: WorldMap = MAPS[id];
    for (const npc of map.npcs) {
      if (npc.job?.flag !== flag) continue;
      out.push({
        map: id,
        box: ONE(npc.x, npc.y),
        tag: npc.name,
        who: whoCan(npc.job.path),
        path: isPath(npc.job.path) ? npc.job.path : undefined,
        talk: true,
      });
    }
    // the castle's gate captain: talk (or push, or pay) your way past him (castle.ts)
    if (flag === GATE_FLAG)
      for (const npc of map.npcs)
        if (npc.id === GATE_GUARD) out.push({ map: id, box: ONE(npc.x, npc.y), tag: npc.name, talk: true });
    // one of the core eight, who joins you when you talk to them (meet.ts; Brannoc in his cell)
    for (const npc of map.npcs) {
      const id = npc.character;
      if (!id || `met:${id}` !== flag) continue;
      if (id === 'brannoc' && npc.id === 'brannoc-cell') {
        // in his cell, behind the bars: the mark takes in the bars too (anyone can bend them, jobs.ts)
        out.push({ map: map.id as MapId, box: { x: npc.x, y: npc.y, w: 4, h: 2 }, tag: npc.name, talk: true });
        continue;
      }
      if (!npc.meets) continue;
      out.push({ map: map.id as MapId, box: ONE(npc.x, npc.y), tag: npc.name, talk: true });
    }
    // a boss, or any rung of a ladder of fights (the Kaldorium: the guards, then the warden)
    for (const b of [map.boss, ...(map.ladder ?? [])])
      if (b?.flag === flag) out.push({ map: id, box: ONE(b.x, b.y), tag: 'The fight' });
    if (map.platesFlag === flag) {
      const box = tileBox(map, 'P');
      if (box) out.push({ map: id, box, tag: 'The pressure plates' });
    }
  }
  for (const job of JOBS) {
    if (job.flag !== flag) continue;
    const box = tileBox(MAPS[job.map], job.tile);
    if (box) out.push({ map: job.map, box, tag: job.label, who: whoCan(job.path), path: job.path ?? undefined });
  }
  return out;
}

/** The first part of a requirement still to do, or null once it's all met. */
function firstUnmet(needs: Requirement, xp: XpTotals): Requirement | null {
  if (needs.kind === 'all') {
    for (const part of needs.of) {
      const todo = firstUnmet(part, xp);
      if (todo) return todo;
    }
    return null;
  }
  return standing(needs, xp).met ? null : needs;
}

/** The first way out of `from` on the shortest walk to `to`, through ways that are open (or any, if none are). */
function firstStep(from: MapId, to: MapId, xp: XpTotals): Exit | null {
  const search = (open: boolean): Exit | null => {
    const first = new Map<MapId, Exit | null>([[from, null]]);
    const queue: MapId[] = [from];
    while (queue.length > 0) {
      const at = queue.shift()!;
      if (at === to) return first.get(at) ?? null;
      for (const e of EXITS) {
        if (e.from !== at || !e.to || first.has(e.to.map)) continue;
        if (open && !standing(e.needs, xp).met) continue;
        first.set(e.to.map, first.get(at) ?? e);
        queue.push(e.to.map);
      }
    }
    return null;
  };
  return search(true) ?? search(false);
}

/** Point at `target` on `map` if it's here, or at the way toward it if it isn't. */
function pointAt(here: MapId, target: Setter, line: string, xp: XpTotals): Goal {
  const path = target.path;
  if (target.map === here) return { mark: { box: target.box, tag: target.tag, exitId: target.exitId }, line, path };
  const step = firstStep(here, target.map, xp);
  const box = step && tileBox(MAPS[here], step.tile);
  return { mark: step && box ? { box, tag: step.label, exitId: step.id } : null, line, path };
}

/** The portal at the end of Season 1, in the Field of Banners: touched once, it sets this flag. */
export const SEASON_FLAG = 'season-1';

/** What to do next to get on with the story, and what to mark on `here`'s map for it. */
export function nextGoal(here: MapId, discovered: MapId[], xp: XpTotals): Goal {
  const been = (id: MapId) => id === here || discovered.includes(id);
  // The next gated way out not yet both open and walked through.
  const step = EXITS.find((e) => !e.back && e.to && !(standing(e.needs, xp).met && been(e.to.map)));

  // Out of the Archive, Felix's cocoon comes first (the road east is walled off till it's broken, cocoons.ts)
  const felix = COCOONS[0];
  if (
    step?.id !== 'archive-door' &&
    !(xp.flags ?? []).includes(felix.hatched) &&
    !discovered.includes('warrior-city')
  )
    return pointAt(here, { map: felix.map, box: ONE(felix.x, felix.y), tag: 'The cocoon' }, 'Look at the cocoon', xp);

  if (!step) {
    const flags = xp.flags ?? [];
    if (flags.includes(SEASON_FLAG)) return { mark: null, line: 'Season 1 is done. Keep your Paths strong.' };
    // The road is walked: the last thing is the portal (it opens at the final level).
    const s = standing(FINAL_GOAL, xp);
    const portal = tileBox(MAPS['field-of-banners'], 'Q');
    const line = s.met ? 'Touch the portal' : `${describeRequirement(FINAL_GOAL)}: ${howToProgress(s)}`;
    if (!portal) return { mark: null, line };
    return pointAt(here, { map: 'field-of-banners', box: portal, tag: 'The portal' }, line, xp);
  }

  const door = (): Setter => ({
    map: step.from,
    box: tileBox(MAPS[step.from], step.tile)!,
    tag: step.label,
    exitId: step.id,
  });
  const todo = firstUnmet(step.needs, xp);
  if (!todo) return pointAt(here, door(), `Go through ${step.label.replace(/^The /, 'the ')}`, xp);

  if (todo.kind === 'flag') {
    const setters = settersOf(todo.flag);
    const target = setters.find((s) => s.map === here) ?? setters[0];
    if (target) {
      const who = target.who ? ` (${target.who})` : '';
      const line = target.talk ? `Talk to ${target.tag}${who}` : `${todo.label}${who}`;
      return pointAt(here, target, line, xp);
    }
    return { mark: null, line: `${todo.label}: ${todo.hint}` };
  }

  // A level to reach: nobody to talk to, just habits. Still show where it opens.
  const s = standing(todo, xp);
  return { ...pointAt(here, door(), '', xp), line: `${describeRequirement(todo)}: ${howToProgress(s)}` };
}
