import type { Dimension } from '@/game';

import { move, type Grid } from './engine';

// Real-time combat in the World. Runs on the UI thread inside the frame loop
// (hence 'worklet'), and in plain Jest. Positions are in art pixels, at feet.
// Real habits make you stronger: your character's real level adds to their damage.

/** How each Path fights. */
export type AttackKind = 'melee' | 'bolt' | 'burst';
export type Attack = {
  kind: AttackKind;
  /** Melee reach or burst radius, in art pixels; for bolts, how far they fly. */
  range: number;
  damage: number;
  /** Seconds between attacks. */
  cooldown: number;
  /** Knocks the enemy back this far. */
  knock: number;
  /** Stuns the enemy for this long, in seconds. */
  stun: number;
  /** The attack's colour, for its flash, bolt or ring. */
  color: string;
};

export const ATTACKS: Record<Dimension, Attack> = {
  physical: { kind: 'melee', range: 20, damage: 2, cooldown: 0.35, knock: 10, stun: 0, color: '#F0F0FF' }, // sword swing
  intellectual: { kind: 'bolt', range: 120, damage: 2, cooldown: 0.5, knock: 4, stun: 0, color: '#FF8A3D' }, // fire bolt
  spiritual: { kind: 'burst', range: 30, damage: 1, cooldown: 0.7, knock: 12, stun: 0.3, color: '#FFE9A0' }, // light burst
  financial: { kind: 'bolt', range: 90, damage: 1, cooldown: 0.45, knock: 2, stun: 1.2, color: '#FFC940' }, // stunning coin
  emotional: { kind: 'melee', range: 16, damage: 2, cooldown: 0.4, knock: 26, stun: 0.2, color: '#2DD4BF' }, // palm strike
  social: { kind: 'burst', range: 36, damage: 1, cooldown: 0.8, knock: 22, stun: 0, color: '#FF4FD8' }, // lute shockwave
  occupational: { kind: 'bolt', range: 70, damage: 2, cooldown: 0.55, knock: 6, stun: 0.3, color: '#C8C8D0' }, // thrown wrench
  environmental: { kind: 'bolt', range: 160, damage: 2, cooldown: 0.6, knock: 4, stun: 0, color: '#A0D060' }, // arrow
};

/** Extra damage from real habits: one more point for every 10 levels your character has. */
export function damageFor(attack: Attack, level: number): number {
  'worklet';
  return attack.damage + Math.floor(Math.max(0, level) / 10);
}

export const ENEMY_KINDS = ['shadow', 'rusted', 'echo', 'sleeper', 'raider', 'aurek', 'kaldor'] as const;
export type EnemyKind = (typeof ENEMY_KINDS)[number];

type EnemyStats = {
  hp: number;
  /** Art pixels per second. */
  speed: number;
  /** Starts chasing within this distance. */
  sight: number;
  /** How it behaves: chases on sight, waits until you're close, or stands and shouts. */
  behaviour: 'chase' | 'ambush' | 'shout';
};

export const ENEMIES: Record<EnemyKind, EnemyStats> = {
  shadow: { hp: 3, speed: 34, sight: 70, behaviour: 'chase' }, // shadow soldiers, drilling in the dark
  rusted: { hp: 5, speed: 22, sight: 26, behaviour: 'ambush' }, // empty armour that follows once you pass
  echo: { hp: 4, speed: 0, sight: 52, behaviour: 'shout' }, // a drill sergeant's echo; its shout stuns
  sleeper: { hp: 3, speed: 18, sight: 400, behaviour: 'chase' }, // Baron Plush's sofa-bearers, sleepwalking at you
  raider: { hp: 5, speed: 40, sight: 200, behaviour: 'chase' }, // the horde's pit fighters
  aurek: { hp: 12, speed: 30, sight: 300, behaviour: 'chase' }, // Aurek the Tall, raised and bound
  kaldor: { hp: 26, speed: 38, sight: 400, behaviour: 'chase' }, // the Kingbreaker himself
};

/**
 * Drowsiness (Baron Plush's fight): fills while you stand still, drains while
 * you move. Full, and you fall asleep. Real Resilience slows it: up to half as
 * fast by Lv 20.
 */
export const DROWSY_FILL = 0.3;
export const DROWSY_DRAIN = 0.35;
export function drowsyRate(resilienceLevel: number): number {
  'worklet';
  return DROWSY_FILL * (1 - Math.min(0.5, Math.max(0, resilienceLevel - 5) / 30));
}

/**
 * An enemy on the UI thread: [kind, x, y, hp, awake (0/1), timer, stun, alive (0/1)].
 * A flat tuple, so it's cheap to copy each frame.
 */
export type Enemy = [number, number, number, number, number, number, number, number];
export const E_KIND = 0;
export const E_X = 1;
export const E_Y = 2;
export const E_HP = 3;
export const E_AWAKE = 4;
export const E_TIMER = 5;
export const E_STUN = 6;
export const E_ALIVE = 7;

export function spawnEnemy(kind: EnemyKind, x: number, y: number): Enemy {
  return [ENEMY_KINDS.indexOf(kind), x, y, ENEMIES[kind].hp, 0, 0, 0, 1];
}

/** Hearts you start each visit with. */
export const HEARTS = 5;
/** Seconds you can't be hurt again after a hit. */
export const MERCY = 1;
/** A shout stuns you for this long. */
export const SHOUT_STUN = 0.8;
/** How often an echo shouts, and how far it carries. */
const SHOUT_EVERY = 2.6;
const SHOUT_RANGE = 46;
/** Touching an enemy hurts within this distance. */
const TOUCH = 10;

export type StepResult = {
  enemies: Enemy[];
  /** Hearts lost this frame (0 or 1). */
  hurt: number;
  /** Knock the player this way, in art pixels. */
  pushX: number;
  pushY: number;
  /** Stun the player for this long (a shout landed). */
  stun: number;
  /** Where a shout went off this frame, for its ring: x, y (or -1). */
  shoutX: number;
  shoutY: number;
};

/** Moves every enemy a frame, and works out what they did to the player. */
export function stepEnemies(
  grid: Grid,
  enemies: Enemy[],
  px: number,
  py: number,
  dt: number,
  canHurt: boolean,
): StepResult {
  'worklet';
  const out: Enemy[] = [];
  let hurt = 0;
  let pushX = 0;
  let pushY = 0;
  let stun = 0;
  let shoutX = -1;
  let shoutY = -1;
  for (const e0 of enemies) {
    const e = e0.slice() as Enemy;
    if (e[E_ALIVE] === 0) {
      out.push(e);
      continue;
    }
    const stats = ENEMIES[ENEMY_KINDS[e[E_KIND]]];
    const dx = px - e[E_X];
    const dy = py - e[E_Y];
    const dist = Math.hypot(dx, dy);
    if (e[E_STUN] > 0) e[E_STUN] = Math.max(0, e[E_STUN] - dt);
    if (dist < stats.sight) e[E_AWAKE] = 1;
    if (stats.behaviour === 'shout') {
      e[E_TIMER] += dt;
      if (e[E_AWAKE] === 1 && e[E_STUN] === 0 && e[E_TIMER] >= SHOUT_EVERY) {
        e[E_TIMER] = 0;
        shoutX = e[E_X];
        shoutY = e[E_Y];
        if (dist < SHOUT_RANGE) stun = SHOUT_STUN;
      }
    } else if (e[E_AWAKE] === 1 && e[E_STUN] === 0 && dist > 1) {
      const [nx, ny] = move(grid, e[E_X], e[E_Y], (dx / dist) * stats.speed * dt, (dy / dist) * stats.speed * dt);
      e[E_X] = nx;
      e[E_Y] = ny;
    }
    if (canHurt && hurt === 0 && dist < TOUCH && e[E_STUN] === 0) {
      hurt = 1;
      const d = dist || 1;
      pushX = (dx / d) * 12;
      pushY = (dy / d) * 12;
    }
    out.push(e);
  }
  return { enemies: out, hurt, pushX, pushY, stun, shoutX, shoutY };
}

/** Damages every enemy within `radius` of (x, y), knocking them away from it. Returns the enemies after. */
export function hitAround(
  grid: Grid,
  enemies: Enemy[],
  x: number,
  y: number,
  radius: number,
  damage: number,
  knock: number,
  stun: number,
): Enemy[] {
  'worklet';
  const out: Enemy[] = [];
  for (const e0 of enemies) {
    const e = e0.slice() as Enemy;
    const dx = e[E_X] - x;
    const dy = e[E_Y] - y;
    const dist = Math.hypot(dx, dy);
    if (e[E_ALIVE] === 1 && dist <= radius) {
      e[E_HP] -= damage;
      e[E_AWAKE] = 1;
      e[E_STUN] = Math.max(e[E_STUN], stun);
      if (e[E_HP] <= 0) e[E_ALIVE] = 0;
      else if (knock > 0) {
        const d = dist || 1;
        const [nx, ny] = move(grid, e[E_X], e[E_Y], (dx / d) * knock, (dy / d) * knock);
        e[E_X] = nx;
        e[E_Y] = ny;
      }
    }
    out.push(e);
  }
  return out;
}

/** The point in front of the player where a swing lands, for facing down/up/left/right. */
export function strikePoint(x: number, y: number, facing: number, reach: number): [number, number] {
  'worklet';
  if (facing === 1) return [x, y - 6 - reach / 2];
  if (facing === 2) return [x - reach / 2 - 2, y - 4];
  if (facing === 3) return [x + reach / 2 + 2, y - 4];
  return [x, y + reach / 2 - 2];
}
