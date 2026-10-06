import { BASE_XP, emptyDimensionRecord, overallLevelFromXp } from '@/game';

import { nextGoal } from '../guide';
import { GATE_FLAG, GATE_GUARD } from '../castle';
import { JOBS } from '../jobs';
import { MAPS, withBouldersMoved, withLadder, withOpenTiles, type MapId, type WorldMap } from '../maps';
import { EXITS, standing, type XpTotals } from '../progress';
import { winScene } from '../scenes';

// Season 1 played by doing only what the guide says, one step at a time: walk
// to whatever it marks on this map (the person, the thing, or the way out),
// do it, and ask again. Every mark must be somewhere you can actually reach
// from where you came in, with the doors that are open to you; otherwise a
// player following the arrow would be stuck.

function overallXpFor(level: number) {
  let xp = 0;
  while (overallLevelFromXp(xp).level < level) xp += BASE_XP;
  return xp;
}

function reachable(map: WorldMap, from: [number, number]): Set<number> {
  const seen = new Set<number>();
  const queue = [from];
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

/** Some tile of the box is stood on, or beside (to press A). */
function canReach(map: WorldMap, seen: Set<number>, box: { x: number; y: number; w: number; h: number }) {
  for (let y = box.y; y < box.y + box.h; y++) {
    for (let x = box.x; x < box.x + box.w; x++) {
      for (const [a, b] of [
        [x, y],
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1],
      ]) {
        if (a >= 0 && b >= 0 && a < map.width && b < map.height && seen.has(b * map.width + a)) return true;
      }
    }
  }
  return false;
}

type Step = { map: MapId; did: string };

function guidedRun(): { steps: Step[]; flags: string[]; stuck?: string } {
  const total = overallXpFor(20);
  const flags: string[] = [];
  const xp = (): XpTotals => ({ total, byPath: { ...emptyDimensionRecord(total) }, flags });
  let at = { map: 'archive' as MapId, x: MAPS.archive.spawn.x, y: MAPS.archive.spawn.y };
  const discovered: MapId[] = ['archive'];
  const steps: Step[] = [];

  for (let n = 0; n < 200; n++) {
    const here = at.map;
    // as in the game: a ladder of fights (the Kaldorium) puts up its next rung each visit
    const base = withLadder(MAPS[here], flags);
    const open = [
      ...EXITS.filter((e) => e.from === here && e.walk && standing(e.needs, xp()).met).map((e) => e.tile),
      ...JOBS.filter((j) => j.map === here && j.opens && flags.includes(j.flag)).map((j) => j.tile),
    ];
    const map = withBouldersMoved(withOpenTiles(base, open));
    const seen = reachable(map, [at.x, at.y]);

    // A boss fight starts as you come in, before anything else.
    if (base.boss && !flags.includes(base.boss.flag)) {
      const scene = winScene(here, base.boss.flag, true);
      const outcome = scene?.outcome ?? scene?.choices?.[0]?.outcome;
      if (!outcome) return { steps, flags, stuck: `no win scene in ${here}` };
      flags.push(...outcome.flags.filter((f) => !flags.includes(f)));
      steps.push({ map: here, did: `won the fight (${base.boss.flag})` });
      if (outcome.next) {
        at = outcome.next;
        if (!discovered.includes(at.map)) discovered.push(at.map);
      }
      continue;
    }

    const goal = nextGoal(here, discovered, xp());
    if (!goal.mark) {
      if (/Season 1 is done/.test(goal.line)) return { steps, flags };
      return { steps, flags, stuck: `${here}: nothing marked for "${goal.line}"` };
    }
    if (!canReach(map, seen, goal.mark.box)) {
      return { steps, flags, stuck: `${here}: can't reach ${goal.mark.tag} for "${goal.line}"` };
    }

    if (goal.mark.exitId) {
      const exit = EXITS.find((e) => e.id === goal.mark!.exitId)!;
      if (!standing(exit.needs, xp()).met || !exit.to) {
        return { steps, flags, stuck: `${here}: marked ${exit.label}, but it's shut` };
      }
      at = exit.to;
      if (!discovered.includes(at.map)) discovered.push(at.map);
      steps.push({ map: here, did: `through ${exit.label}` });
      continue;
    }

    if (goal.mark.tag === 'The portal') {
      flags.push('season-1');
      steps.push({ map: here, did: 'touched the portal' });
      continue;
    }
    const box = goal.mark.box;
    const inBox = (x: number, y: number) => x >= box.x && x < box.x + box.w && y >= box.y && y < box.y + box.h;
    const npc = base.npcs.find((p) => p.job && !flags.includes(p.job.flag) && inBox(p.x, p.y));
    const job = JOBS.find(
      (j) =>
        j.map === here &&
        !flags.includes(j.flag) &&
        base.tiles.some((row, y) => [...row].some((c, x) => c === j.tile && inBox(x, y))),
    );
    // one of the core eight, met by talking to them (Brannoc in his cell: the mark takes in the bars), or the castle's gate captain
    const hero = base.npcs.find((p) => p.character && inBox(p.x, p.y) && !flags.includes(`met:${p.character}`));
    if (hero && (hero.meets || hero.character === 'brannoc')) {
      flags.push(
        `met:${hero.character}`,
        ...(hero.character === 'brannoc' ? ['cell-bars-bent', 'brannoc-joined'] : []),
      );
      steps.push({ map: here, did: `met ${hero.name}` });
      continue;
    }
    if (base.npcs.some((p) => p.id === GATE_GUARD && inBox(p.x, p.y)) && !flags.includes(GATE_FLAG)) {
      flags.push(GATE_FLAG);
      steps.push({ map: here, did: 'talked past the gate guards' });
      continue;
    }
    const flag =
      npc?.job?.flag ?? job?.flag ?? (base.platesFlag && !flags.includes(base.platesFlag) ? base.platesFlag : null);
    if (!flag) return { steps, flags, stuck: `${here}: marked ${goal.mark.tag}, but there's nothing to do there` };
    flags.push(flag);
    steps.push({ map: here, did: `${goal.mark.tag} (${flag})` });
  }
  return { steps, flags, stuck: 'ran out of steps (going round in circles?)' };
}

describe('Season 1, following only the guide', () => {
  const run = guidedRun();
  if (process.env.SHOW) console.log(run.steps.map((s) => `${s.map}: ${s.did}`).join('\n'));

  it('never points somewhere you cannot get to', () => {
    expect(run.stuck).toBeUndefined();
  });

  it('beats Kaldor and reaches the end', () => {
    expect(run.flags).toEqual(expect.arrayContaining(['pit-champion', GATE_FLAG, 'kaldor-beaten', 'season-1']));
  });

  it('walks Warrior City, the forest and the castle road in order', () => {
    const did = run.steps.map((s) => s.did).join('\n');
    for (const flag of ['on-the-bill', 'old-law', 'cages-open', 'varga-witness', 'forge-fixed']) {
      expect(did).toContain(`(${flag})`);
    }
  });
});
