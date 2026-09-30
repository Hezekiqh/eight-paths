import { DIMENSIONS, type Dimension } from '@/game';

import {
  ATTACKS,
  E_ALIVE,
  E_X,
  E_Y,
  HEARTS,
  MERCY,
  damageFor,
  drowsyRate,
  hitAround,
  spawnEnemy,
  stepEnemies,
  strikePoint,
  type Enemy,
  type EnemyKind,
} from '../combat';
import { SPEED, move, type Grid } from '../engine';
import { EXITS } from '../progress';
import { MAPS, TILE, type MapId } from '../maps';

// Every fight in Season 1, played headless with the real combat rules by a
// sensible bot: ranged Paths line up and shoot, close-range Paths step in,
// strike and back off, and everyone keeps moving. It answers: at the level a
// player's hero will have by then, can each Path win?

const DT = 1 / 60;
const LIMIT = 180;
const feet = (x: number, y: number): [number, number] => [x * TILE + TILE / 2, y * TILE + TILE - 2];

/** won, or lost by dying, falling asleep (Plush), or running out of time. */
type Result = { won: boolean; hearts: number; seconds: number; lost?: 'died' | 'slept' | 'time' };

/** The next tile to head for on the shortest walk from tile `from` to tile `to` (4 ways), or null. */
function nextStep(map: (typeof MAPS)[MapId], from: number, to: number): number | null {
  if (from === to) return to;
  const prev = new Map<number, number>([[from, -1]]);
  const queue = [from];
  while (queue.length > 0) {
    const t = queue.shift()!;
    if (t === to) break;
    const x = t % map.width;
    const y = Math.floor(t / map.width);
    for (const [nx, ny] of [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ]) {
      if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) continue;
      const n = ny * map.width + nx;
      if (prev.has(n) || (map.solid[n] && n !== to)) continue;
      prev.set(n, t);
      queue.push(n);
    }
  }
  if (!prev.has(to)) return null;
  let t = to;
  while (prev.get(t) !== from && prev.get(t) !== -1) t = prev.get(t)!;
  return t;
}

export function fight(id: MapId, path: Dimension, level: number): Result {
  const map = MAPS[id];
  const grid: Grid = { solid: map.solid, width: map.width, height: map.height };
  const arrival = EXITS.find((e) => e.to?.map === id)?.to ?? map.spawn;
  let [px, py] = feet(arrival.x, arrival.y);
  let enemies: Enemy[] = [
    ...map.enemies.map((e) => spawnEnemy(e.kind, ...feet(e.x, e.y))),
    ...(map.boss?.bearers.map(([x, y]) => spawnEnemy((map.boss!.kind ?? 'sleeper') as EnemyKind, ...feet(x, y))) ?? []),
  ];
  const attack = ATTACKS[path];
  const damage = damageFor(attack, level);
  const plush = !!map.boss && !map.boss.kind;
  const [bx, by] = map.boss ? feet(map.boss.x, map.boss.y) : [0, 0];
  const drowsy = plush ? drowsyRate(level) : 0;
  let hp = HEARTS;
  let mercy = 0;
  let cooldown = 0;
  let dazed = 0;
  let sleepy = 0;
  let throwIn = 1.5;
  let pillows: number[][] = [];
  let bolts: number[][] = [];
  let facing = 1;
  const tileOf = (x: number, y: number) => Math.floor((y - 1) / TILE) * map.width + Math.floor(x / TILE);
  /** Head along the shortest walk towards (x, y). */
  const towards = (x: number, y: number): [number, number] => {
    const step = nextStep(map, tileOf(px, py), tileOf(x, y));
    if (step === null) return [x - px, y - py];
    const [wx, wy] = feet(step % map.width, Math.floor(step / map.width));
    return step === tileOf(x, y) ? [x - px, y - py] : [wx - px, wy - py];
  };

  for (let t = 0; t < LIMIT; t += DT) {
    const alive = enemies.filter((e) => e[E_ALIVE] === 1);
    if (alive.length === 0) return { won: true, hearts: hp, seconds: Math.round(t) };
    mercy = Math.max(0, mercy - DT);
    cooldown = Math.max(0, cooldown - DT);
    dazed = Math.max(0, dazed - DT);

    // The bot: pick the nearest enemy, face it, and decide whether to strike or move.
    const target = alive.reduce((a, b) =>
      Math.hypot(a[E_X] - px, a[E_Y] - py) < Math.hypot(b[E_X] - px, b[E_Y] - py) ? a : b,
    );
    const dx = target[E_X] - px;
    const dy = target[E_Y] - py;
    const dist = Math.hypot(dx, dy);
    facing = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 2 : 3) : dy < 0 ? 1 : 0;
    let mx = 0;
    let my = 0;
    let strike = false;
    if (attack.kind === 'bolt') {
      // Walk to a spot in line with the target, a safe shot away, and fire when lined up.
      const lined = Math.abs(dx) > Math.abs(dy) ? Math.abs(dy) < 6 : Math.abs(dx) < 6;
      strike = lined && dist < attack.range;
      const gap = Math.min(attack.range * 0.6, 56);
      const spots: [number, number][] = [
        [target[E_X] - Math.sign(dx || 1) * gap, target[E_Y]],
        [target[E_X], target[E_Y] - Math.sign(dy || 1) * gap],
      ].filter(([x, y]) => !map.solid[tileOf(x, y)]) as [number, number][];
      const spot = spots.sort((a, b) => Math.hypot(a[0] - px, a[1] - py) - Math.hypot(b[0] - px, b[1] - py))[0];
      if (dist < 24) {
        mx = -dx;
        my = -dy;
      } else if (spot && Math.hypot(spot[0] - px, spot[1] - py) > 4) [mx, my] = towards(spot[0], spot[1]);
    } else {
      const reach = attack.kind === 'burst' ? attack.range - 4 : attack.range + 4;
      strike = dist < reach;
      // Close in when ready; back off while recharging.
      if (cooldown > 0.05 && dist < 40) {
        mx = -dx;
        my = -dy;
      } else [mx, my] = towards(target[E_X], target[E_Y]);
    }
    // A pillow coming your way: step aside.
    for (const p of pillows) {
      const toYou = Math.hypot(p[0] - px, p[1] - (py - 8));
      if (toYou < 36) {
        mx = -p[3];
        my = p[2];
      }
    }
    // Always keep moving: drowsiness and chasers punish standing still.
    if (mx === 0 && my === 0) mx = Math.sin(t * 2);

    let moved = false;
    if (dazed === 0) {
      const len = Math.hypot(mx, my) || 1;
      const [nx, ny] = move(grid, px, py, (mx / len) * SPEED * DT, (my / len) * SPEED * DT);
      moved = Math.abs(nx - px) + Math.abs(ny - py) > 0.001;
      [px, py] = [nx, ny];
    }
    sleepy = Math.min(1, Math.max(0, sleepy + (moved ? -0.35 : drowsy) * DT));
    if (plush && sleepy >= 1) return { won: false, hearts: hp, seconds: Math.round(t), lost: 'slept' };

    if (strike && cooldown === 0) {
      cooldown = attack.cooldown;
      if (attack.kind === 'melee') {
        const [sx, sy] = strikePoint(px, py, facing, attack.range);
        enemies = hitAround(grid, enemies, sx, sy, attack.range * 0.6 + 6, damage, attack.knock, attack.stun);
      } else if (attack.kind === 'burst') {
        enemies = hitAround(grid, enemies, px, py - 6, attack.range, damage, attack.knock, attack.stun);
      } else {
        const bdx = facing === 2 ? -1 : facing === 3 ? 1 : 0;
        const bdy = facing === 1 ? -1 : facing === 0 ? 1 : 0;
        bolts.push([px, py - 8, bdx, bdy, 0]);
      }
    }
    const next: number[][] = [];
    for (const b of bolts) {
      const step = 150 * DT;
      const nx = b[0] + b[2] * step;
      const ny = b[1] + b[3] * step;
      const tx = Math.floor(nx / TILE);
      const ty = Math.floor(ny / TILE);
      const wall = tx < 0 || ty < 0 || tx >= map.width || ty >= map.height || map.solid[ty * map.width + tx] === 1;
      const struck = enemies.some((e) => e[E_ALIVE] === 1 && Math.hypot(e[E_X] - nx, e[E_Y] - 8 - ny) < 9);
      if (struck) enemies = hitAround(grid, enemies, nx, ny + 8, 10, damage, attack.knock, attack.stun);
      if (!struck && !wall && b[4] + step < attack.range) next.push([nx, ny, b[2], b[3], b[4] + step]);
    }
    bolts = next;

    const r = stepEnemies(grid, enemies, px, py, DT, mercy === 0);
    enemies = r.enemies;
    if (plush) {
      throwIn -= DT;
      if (throwIn <= 0) {
        throwIn = 2.2;
        const d = Math.hypot(px - bx, py - by) || 1;
        pillows.push([bx, by - 10, (px - bx) / d, (py - 8 - by + 10) / d]);
      }
      pillows = pillows.flatMap((p) => {
        const nx = p[0] + p[2] * 70 * DT;
        const ny = p[1] + p[3] * 70 * DT;
        if (mercy === 0 && Math.hypot(nx - px, ny - (py - 8)) < 8) {
          r.hurt = Math.max(r.hurt, 1);
          return [];
        }
        return nx > 0 && ny > 0 && nx < map.width * TILE && ny < map.height * TILE ? [[nx, ny, p[2], p[3]]] : [];
      });
    }
    if (r.stun > 0) dazed = Math.max(dazed, r.stun);
    if (r.hurt > 0) {
      mercy = MERCY;
      hp -= r.hurt;
      [px, py] = move(grid, px, py, r.pushX, r.pushY);
      if (hp <= 0) return { won: false, hearts: 0, seconds: Math.round(t), lost: 'died' };
    }
  }
  return { won: false, hearts: hp, seconds: LIMIT, lost: 'time' };
}

const FIGHTS: MapId[] = [
  'barracks-hall',
  'barracks-armoury',
  'barracks-yard',
  'lower-barracks',
  'sleeping-keep',
  'the-pit',
  'war-doors',
  'war-hall',
];

describe('fights', () => {
  it.each(['the-pit', 'war-doors'] as MapId[])('every Path can win %s at a low hero level', (id) => {
    const losers = DIMENSIONS.filter((d) => !fight(id, d, 5).won);
    expect(losers).toEqual([]);
  });

  // The full table: FIGHT_REPORT=1 npx jest fights. W# = won with # hearts left,
  // D = died, S = fell asleep, T = the bot ran out of time (usually the bot, not the fight).
  const report = process.env.FIGHT_REPORT ? it : it.skip;
  report('prints who wins each fight, by Path and hero level', () => {
    const rows: string[] = [];
    for (const id of FIGHTS) {
      for (const level of [5, 10, 15, 20]) {
        const cells = DIMENSIONS.map((d) => {
          const r = fight(id, d, level);
          return r.won ? `W${r.hearts}` : r.lost === 'died' ? 'D' : r.lost === 'slept' ? 'S' : 'T';
        });
        rows.push(`${id.padEnd(17)} Lv${String(level).padEnd(3)} ${cells.map((c) => c.padEnd(4)).join('')}`);
      }
    }
    console.log(`${' '.repeat(23)}${DIMENSIONS.map((d) => d.slice(0, 4).padEnd(4)).join('')}\n${rows.join('\n')}`);
  });
});
