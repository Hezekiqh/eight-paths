import {
  E_ALIVE,
  E_AWAKE,
  E_HP,
  E_KIND,
  E_MODE,
  E_MT,
  E_X,
  E_Y,
  ENEMIES,
  ENEMY_KINDS,
  PATTERNS,
  WINDUP,
  guarded,
  type Attack,
  type Enemy,
} from './combat';
import { CHARGE_LEVEL, CHARGE_TIME, type Fight } from './fight';

// A sensible fighter: the fight bot that plays every Season 1 fight in the
// balance tests (fights.test.ts), and (dev only) the World's autopilot, for
// recording real footage. Ranged Paths keep their distance and shoot;
// close-range Paths step in, strike and back off; it rolls just before an
// enemy's tell finishes, waits for Kaldor's shadow before striking him, and
// (Lv 10 and up) charges its blows against the bosses. Runs on the UI thread.

const TILE = 16;

/** What the autopilot remembers between frames. */
export type Pilot = { wasHeld: boolean; t: number };
export const newPilot = (): Pilot => ({ wasHeld: false, t: 0 });

export type PilotMap = { solid: number[]; width: number; height: number };

export type PilotMove = {
  pilot: Pilot;
  /** Where to push the stick (unit length or 0), which way to face, and the buttons. */
  stickX: number;
  stickY: number;
  facing: number;
  press: boolean;
  held: boolean;
  release: boolean;
  dodge: boolean;
};

function feetX(tx: number): number {
  'worklet';
  return tx * TILE + TILE / 2;
}
function feetY(ty: number): number {
  'worklet';
  return ty * TILE + TILE - 2;
}

/** The next tile on the shortest walk (4 ways) from tile `from` to tile `to`, or -1. */
function nextStep(map: PilotMap, from: number, to: number): number {
  'worklet';
  if (from === to) return to;
  const prev: number[] = new Array(map.width * map.height).fill(-2);
  prev[from] = -1;
  const queue = [from];
  for (let head = 0; head < queue.length; head++) {
    const t = queue[head];
    if (t === to) break;
    const x = t % map.width;
    const y = Math.floor(t / map.width);
    const around = [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ];
    for (const [nx, ny] of around) {
      if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) continue;
      const n = ny * map.width + nx;
      if (prev[n] !== -2 || (map.solid[n] && n !== to)) continue;
      prev[n] = t;
      queue.push(n);
    }
  }
  if (prev[to] === -2) return -1;
  let t = to;
  while (prev[t] !== from && prev[t] !== -1) t = prev[t];
  return t;
}

/**
 * Test builds (test-tools.ts): which way to push the stick to walk from (px, py) to tile (tx, ty),
 * along the shortest walk; [0, 0] once beside it or on it, or if there's no way there.
 */
// (declared after nextStep: a worklet only sees the worklets defined before it)
export function walkToward(map: PilotMap, px: number, py: number, tx: number, ty: number): number[] {
  'worklet';
  const from = Math.floor((py - 1) / TILE) * map.width + Math.floor(px / TILE);
  const to = ty * map.width + tx;
  const fx = from % map.width;
  const fy = Math.floor(from / map.width);
  const dist = Math.abs(fx - tx) + Math.abs(fy - ty);
  if (dist === 0) return [0, 0];
  // beside someone (they're solid): lean in, so you're close enough for A to reach them
  if (dist === 1 && map.solid[to]) {
    const lx = feetX(tx) - px;
    const ly = feetY(ty) - py;
    const ll = Math.hypot(lx, ly) || 1;
    return [lx / ll, ly / ll];
  }
  const step = nextStep(map, from, to);
  if (step === -1) return [0, 0];
  const dx = feetX(step % map.width) - px;
  const dy = feetY(Math.floor(step / map.width)) - py;
  const len = Math.hypot(dx, dy) || 1;
  return [dx / len, dy / len];
}

/** How long an enemy's tell lasts right now. */
function windupOf(e: Enemy): number {
  'worklet';
  const stats = ENEMIES[ENEMY_KINDS[e[E_KIND]]];
  const low = e[E_HP] <= stats.hp / 2;
  if (stats.behaviour === 'lunge') return PATTERNS.lunge.windup;
  if (stats.behaviour === 'slam') return low ? PATTERNS.slam.windupHurt : PATTERNS.slam.windup;
  if (stats.behaviour === 'king') return low ? PATTERNS.king.windupHurt : PATTERNS.king.windup;
  return Infinity;
}

/** This frame's move for a fighter at (px, py), or null when there's nobody left to fight. */
export function autopilot(
  pilot: Pilot,
  f: Fight,
  px: number,
  py: number,
  attack: Attack,
  level: number,
  map: PilotMap,
  dt: number,
  dodges = true,
): PilotMove | null {
  'worklet';
  const t = pilot.t;
  const alive = f.enemies.filter((e) => e[E_ALIVE] === 1);
  if (alive.length === 0) return null;
  const tileOf = (x: number, y: number) => Math.floor((y - 1) / TILE) * map.width + Math.floor(x / TILE);
  /** Head along the shortest walk towards (x, y). */
  const towards = (x: number, y: number): number[] => {
    const step = nextStep(map, tileOf(px, py), tileOf(x, y));
    if (step === -1) return [x - px, y - py];
    const wx = feetX(step % map.width);
    const wy = feetY(Math.floor(step / map.width));
    return step === tileOf(x, y) ? [x - px, y - py] : [wx - px, wy - py];
  };

  /** No wall a step that way. */
  const open = (vx: number, vy: number) => {
    // a unit-ish vector looks a step (12 pixels) ahead; a longer one looks further
    const len = Math.max(1, Math.hypot(vx, vy));
    const tx = px + (vx / len) * 12 * len;
    const ty = py - 4 + (vy / len) * 12 * len;
    return !map.solid[Math.floor(ty / TILE) * map.width + Math.floor(tx / TILE)];
  };
  /**
   * Back off that way, or as near it as the walls allow: of eight directions, the open one (two
   * steps clear, so not into a corner) closest to the way you want to go.
   */
  const away = (vx: number, vy: number): number[] => {
    const len = Math.hypot(vx, vy) || 1;
    let best = [vx, vy];
    let bestScore = -Infinity;
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4;
      const cx = Math.cos(a);
      const cy = Math.sin(a);
      if (!open(cx, cy)) continue;
      const room = open(cx * 2.2, cy * 2.2) ? 0.35 : 0;
      const score = (cx * vx + cy * vy) / len + room;
      if (score > bestScore) {
        bestScore = score;
        best = [cx, cy];
      }
    }
    return best;
  };

  // Pick the nearest enemy, face it, and decide whether to strike, wait, dodge or move.
  let target = alive[0];
  for (const e of alive) {
    if (Math.hypot(e[E_X] - px, e[E_Y] - py) < Math.hypot(target[E_X] - px, target[E_Y] - py)) target = e;
  }
  const kind = ENEMIES[ENEMY_KINDS[target[E_KIND]]];
  const dx = target[E_X] - px;
  const dy = target[E_Y] - py;
  const dist = Math.hypot(dx, dy);
  const facing = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 2 : 3) : dy < 0 ? 1 : 0;
  const shielded = guarded(target);
  const isBoss = kind.size === 2 || kind.behaviour === 'king';
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
    // keep clear, as a player would: further from a giant (twice the size, and a slam that spreads),
    // out of a lunge's dash, and sliding along a wall rather than backing into it
    // (never further than you can throw: a short-range bolt has to stay close enough to hit)
    const standoff = Math.min(kind.size === 2 ? 56 : kind.behaviour === 'lunge' ? 44 : 30, attack.range * 0.75);
    if (clear && (dist < standoff || (shielded && dist < 60))) [mx, my] = away(-dx, -dy);
    else if (!clear || dist > attack.range * 0.7 || target[E_AWAKE] === 0) [mx, my] = towards(target[E_X], target[E_Y]);
    else [mx, my] = [-dy, dx]; // strafe
  } else {
    const reach = attack.kind === 'burst' ? attack.range - 4 : attack.range + 4;
    inReach = dist < reach + (kind.size === 2 ? 6 : 0);
    // Close in when ready (and he's open); back off while recharging, or while Kaldor's guarded.
    if (shielded) [mx, my] = dist < 60 ? [-dx, -dy] : [-dy, dx];
    else if (
      (f.cooldown > 0.05 || (level >= CHARGE_LEVEL && isBoss && !kind.fixedHits && f.charge < CHARGE_TIME)) &&
      dist < 40
    )
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
    if (dodges && e[E_MODE] === WINDUP && d < 90 && e[E_MT] >= windupOf(e) - 0.15) {
      dodge = true;
      const ex = e[E_X] - px;
      const ey = e[E_Y] - py;
      [mx, my] = ENEMIES[ENEMY_KINDS[e[E_KIND]]].behaviour === 'slam' ? [-ex, -ey] : [-ey, ex];
    }
  }

  // Strike: tap, or (Lv 10 and up, against a boss that's open) hold and let go.
  // (not against the warden: every strike counts as one of his thirty, charged or not, so just strike)
  const charging = level >= CHARGE_LEVEL && isBoss && !shielded && !kind.fixedHits;
  let press = false;
  let held = false;
  let release = false;
  if (charging) {
    if (f.charge >= CHARGE_TIME && inReach) release = true;
    else held = true; // charge up, holding it until they're in reach
  } else if (!shielded && inReach) press = f.cooldown === 0;
  else if (pilot.wasHeld) release = true;

  const len = Math.hypot(mx, my) || 1;
  return {
    pilot: { wasHeld: held, t: t + dt },
    stickX: mx / len,
    stickY: my / len,
    facing,
    press,
    held,
    release,
    dodge,
  };
}
