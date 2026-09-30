import { DIMENSIONS, type Dimension } from '@/game';

import {
  ATTACKS,
  E_ALIVE,
  E_AWAKE,
  E_KIND,
  E_MODE,
  E_MT,
  E_X,
  E_Y,
  ENEMIES,
  ENEMY_KINDS,
  HEARTS,
  PATTERNS,
  WINDUP,
  damageFor,
  drowsyRate,
  guarded,
  spawnEnemy,
  type Enemy,
  type EnemyKind,
} from '../combat';
import { SPEED, move, type Grid } from '../engine';
import { CHARGE_LEVEL, CHARGE_TIME, SPECIALS, startFight, stepFight, type FightInput } from '../fight';
import { EXITS } from '../progress';
import { MAPS, TILE, type MapId } from '../maps';

// Every fight in Season 1, played headless by a sensible bot with the real
// rules (stepFight, the same code the World runs). Ranged Paths keep their
// distance and shoot, close-range Paths step in, strike and back off; the bot
// rolls out of the way when an enemy's tell is about to finish, waits for
// Kaldor's shadow before striking him, and (Lv 10 and up) charges its blows
// against the bosses. It answers: at the level a player's hero will have by
// then, can each Path win?

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

const kindOf = (e: Enemy) => ENEMIES[ENEMY_KINDS[e[E_KIND]]];

/** How long an enemy's tell lasts right now. */
function windupOf(e: Enemy): number {
  const b = kindOf(e).behaviour;
  const low = e[3] <= kindOf(e).hp / 2;
  if (b === 'lunge') return PATTERNS.lunge.windup;
  if (b === 'slam') return low ? PATTERNS.slam.windupHurt : PATTERNS.slam.windup;
  if (b === 'king') return low ? PATTERNS.king.windupHurt : PATTERNS.king.windup;
  return Infinity;
}

export function fight(id: MapId, path: Dimension, level: number): Result {
  const map = MAPS[id];
  const grid: Grid = { solid: map.solid, width: map.width, height: map.height };
  const arrival = EXITS.find((e) => e.to?.map === id)?.to ?? map.spawn;
  let [px, py] = feet(arrival.x, arrival.y);
  const attack = ATTACKS[path];
  const plush = !!map.boss && !map.boss.kind;
  const [bx, by] = map.boss ? feet(map.boss.x, map.boss.y) : [0, 0];
  const rules = {
    grid,
    attack,
    damage: damageFor(attack, level),
    level,
    special: SPECIALS[path].kind,
    boss: !!map.boss,
    bossX: bx,
    bossY: by,
    throws: plush,
    drowsy: plush ? drowsyRate(level) : 0,
    maxHp: HEARTS,
  };
  let f = startFight([
    ...map.enemies.map((e) => spawnEnemy(e.kind, ...feet(e.x, e.y))),
    ...(map.boss?.bearers.map(([x, y]) => spawnEnemy((map.boss!.kind ?? 'sleeper') as EnemyKind, ...feet(x, y))) ?? []),
  ]);
  let facing = 1;
  let wasHeld = false;
  const tileOf = (x: number, y: number) => Math.floor((y - 1) / TILE) * map.width + Math.floor(x / TILE);
  /** Head along the shortest walk towards (x, y). */
  const towards = (x: number, y: number): [number, number] => {
    const step = nextStep(map, tileOf(px, py), tileOf(x, y));
    if (step === null) return [x - px, y - py];
    const [wx, wy] = feet(step % map.width, Math.floor(step / map.width));
    return step === tileOf(x, y) ? [x - px, y - py] : [wx - px, wy - py];
  };

  for (let t = 0; t < LIMIT; t += DT) {
    const alive = f.enemies.filter((e) => e[E_ALIVE] === 1);
    if (f.won || (!map.boss && alive.length === 0)) return { won: true, hearts: f.hp, seconds: Math.round(t) };

    // The bot: pick the nearest enemy, face it, and decide whether to strike, wait, dodge or move.
    const target = alive.reduce((a, b) =>
      Math.hypot(a[E_X] - px, a[E_Y] - py) < Math.hypot(b[E_X] - px, b[E_Y] - py) ? a : b,
    );
    const dx = target[E_X] - px;
    const dy = target[E_Y] - py;
    const dist = Math.hypot(dx, dy);
    facing = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 2 : 3) : dy < 0 ? 1 : 0;
    const shielded = guarded(target);
    const isBoss = kindOf(target).size === 2 || kindOf(target).behaviour === 'king';
    let mx = 0;
    let my = 0;
    let inReach = false;
    if (attack.kind === 'bolt') {
      inReach = dist < attack.range * 0.9;
      // A clear shot: no wall between you and them.
      let clear = true;
      for (let k = 1; k < 12; k++) {
        const sx = px + (dx * k) / 12;
        const sy = py - 8 + (dy * k) / 12;
        if (map.solid[Math.floor(sy / TILE) * map.width + Math.floor(sx / TILE)]) clear = false;
      }
      inReach = inReach && (clear || dist < 16);
      if (clear && (dist < 30 || (shielded && dist < 60))) [mx, my] = [-dx, -dy];
      else if (!clear || dist > attack.range * 0.7 || target[E_AWAKE] === 0) [mx, my] = towards(target[E_X], target[E_Y]);
      else [mx, my] = [-dy, dx]; // strafe
    } else {
      const reach = attack.kind === 'burst' ? attack.range - 4 : attack.range + 4;
      inReach = dist < reach + (kindOf(target).size === 2 ? 6 : 0);
      // Close in when ready (and he's open); back off while recharging, or while Kaldor's guarded.
      if (shielded) [mx, my] = dist < 60 ? [-dx, -dy] : [-dy, dx];
      else if ((f.cooldown > 0.05 || (level >= CHARGE_LEVEL && isBoss && f.charge < CHARGE_TIME)) && dist < 40)
        [mx, my] = [-dx, -dy];
      else [mx, my] = towards(target[E_X], target[E_Y]);
    }
    // A pillow coming your way: step aside.
    for (const p of f.pillows) {
      if (Math.hypot(p[0] - px, p[1] - (py - 8)) < 36) [mx, my] = [-p[3], p[2]];
    }
    // Always keep moving: drowsiness and chasers punish standing still.
    if (mx === 0 && my === 0) mx = Math.sin(t * 2);

    // Dodge: roll across a lunge or a charge, or away from a slam, just before it comes.
    let dodge = false;
    for (const e of alive) {
      const d = Math.hypot(e[E_X] - px, e[E_Y] - py);
      if (!process.env.FIGHT_NO_DODGE && e[E_MODE] === WINDUP && d < 90 && e[E_MT] >= windupOf(e) - 0.15) {
        dodge = true;
        const ex = e[E_X] - px;
        const ey = e[E_Y] - py;
        [mx, my] = kindOf(e).behaviour === 'slam' ? [-ex, -ey] : [-ey, ex];
      }
    }

    // Strike: tap, or (Lv 10 and up, against a boss that's open) hold and let go.
    const charging = level >= CHARGE_LEVEL && isBoss && !shielded;
    let press = false;
    let held = false;
    let release = false;
    if (charging) {
      if (f.charge >= CHARGE_TIME && inReach) release = true;
      else held = true; // charge up, holding it until they're in reach
    } else if (!shielded && inReach) press = f.cooldown === 0;
    else if (wasHeld) release = true;
    wasHeld = held;

    const len = Math.hypot(mx, my) || 1;
    const input: FightInput = {
      x: px,
      y: py,
      facing,
      stickX: mx / len,
      stickY: my / len,
      moved: false,
      press,
      held,
      release,
      dodge,
    };
    let moved = false;
    if (f.dazed === 0 && f.roll === 0) {
      const [nx, ny] = move(grid, px, py, (mx / len) * SPEED * DT, (my / len) * SPEED * DT);
      moved = Math.abs(nx - px) + Math.abs(ny - py) > 0.001;
      [px, py] = [nx, ny];
    }
    input.moved = moved;
    const r = stepFight(f, input, rules, DT);
    f = r.fight;
    if (process.env.FIGHT_DEBUG && r.events.hurt) {
      const near = f.enemies.filter((e) => e[E_ALIVE]).map((e) => `${ENEMY_KINDS[e[E_KIND]]} m${e[E_MODE]} d${Math.round(Math.hypot(e[E_X] - px, e[E_Y] - py))}`);
      console.log(`HURT ${id} ${path} t${t.toFixed(1)} waves${f.waves.length} ${near.join(',')}`);
    }
    if (process.env.FIGHT_DEBUG && r.events.guttered) console.log(`GUTTER ${id} ${path} t${t.toFixed(1)}`);
    if (r.events.moveX !== 0 || r.events.moveY !== 0) [px, py] = move(grid, px, py, r.events.moveX, r.events.moveY);
    if (f.fallen) return { won: false, hearts: f.hp, seconds: Math.round(t), lost: f.sleepy >= 1 ? 'slept' : 'died' };
  }
  if (process.env.FIGHT_DEBUG) console.log(id, path, 'at', Math.round(px), Math.round(py), 'left', f.enemies.filter((e) => e[E_ALIVE]).map((e) => [ENEMY_KINDS[e[E_KIND]], Math.round(e[E_X]), Math.round(e[E_Y]), e[3], e[4]]));
  return { won: false, hearts: f.hp, seconds: LIMIT, lost: 'time' };
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
  it.each(['the-pit', 'war-doors', 'war-hall'] as MapId[])('every Path can win %s at a low hero level', (id) => {
    const losers = DIMENSIONS.filter((d) => !fight(id, d, 5).won);
    expect(losers).toEqual([]);
  });

  // The full table: FIGHT_REPORT=1 npx jest fights (add FIGHT_NO_DODGE=1 for a player who never rolls). W# = won with # hearts left,
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
