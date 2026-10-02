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
  /** How it looks (see attack-effects.tsx). */
  look: AttackLook;
};

export type AttackLook = 'sword' | 'fire' | 'light' | 'coin' | 'palm' | 'lute' | 'wrench' | 'arrow';

export const ATTACKS: Record<Dimension, Attack> = {
  physical: {
    kind: 'melee',
    range: 20,
    damage: 2,
    cooldown: 0.35,
    knock: 10,
    stun: 0,
    color: '#F0F0FF',
    look: 'sword',
  }, // sword swing
  intellectual: {
    kind: 'bolt',
    range: 120,
    damage: 2,
    cooldown: 0.5,
    knock: 4,
    stun: 0,
    color: '#FF8A3D',
    look: 'fire',
  }, // fire bolt
  spiritual: {
    kind: 'burst',
    range: 30,
    damage: 1,
    cooldown: 0.6,
    knock: 12,
    stun: 0.3,
    color: '#FFE9A0',
    look: 'light',
  }, // light burst
  financial: {
    kind: 'bolt',
    range: 90,
    damage: 1,
    cooldown: 0.45,
    knock: 2,
    stun: 1.2,
    color: '#FFC940',
    look: 'coin',
  }, // stunning coin
  emotional: {
    kind: 'melee',
    range: 16,
    damage: 2,
    cooldown: 0.4,
    knock: 26,
    stun: 0.2,
    color: '#2DD4BF',
    look: 'palm',
  }, // palm strike
  social: { kind: 'burst', range: 36, damage: 1, cooldown: 0.6, knock: 22, stun: 0, color: '#FF4FD8', look: 'lute' }, // lute shockwave
  occupational: {
    kind: 'bolt',
    range: 70,
    damage: 2,
    cooldown: 0.55,
    knock: 6,
    stun: 0.3,
    color: '#C8C8D0',
    look: 'wrench',
  }, // thrown wrench
  environmental: {
    kind: 'bolt',
    range: 160,
    damage: 2,
    cooldown: 0.6,
    knock: 4,
    stun: 0,
    color: '#A0D060',
    look: 'arrow',
  }, // arrow
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
  /**
   * How it behaves: chases on sight, waits until you're close, stands and
   * shouts, crouches and lunges (raiders), winds up a ground slam (Aurek), or
   * charges and can only be hurt once a torch gutters (Kaldor).
   */
  behaviour: 'chase' | 'ambush' | 'shout' | 'lunge' | 'slam' | 'king';
  /** 2 for the giants: drawn twice as big, and bigger to hit and to touch. */
  size?: number;
};

export const ENEMIES: Record<EnemyKind, EnemyStats> = {
  shadow: { hp: 3, speed: 34, sight: 70, behaviour: 'chase' }, // shadow soldiers, drilling in the dark
  rusted: { hp: 5, speed: 22, sight: 26, behaviour: 'ambush' }, // empty armour that follows once you pass
  echo: { hp: 4, speed: 0, sight: 52, behaviour: 'shout' }, // a drill sergeant's echo; its shout stuns
  sleeper: { hp: 3, speed: 18, sight: 400, behaviour: 'chase' }, // Baron Plush's sofa-bearers, sleepwalking at you
  raider: { hp: 8, speed: 36, sight: 200, behaviour: 'lunge' }, // the horde's pit fighters
  aurek: { hp: 12, speed: 24, sight: 300, behaviour: 'slam', size: 2 }, // Aurek the Tall, raised and bound
  kaldor: { hp: 20, speed: 32, sight: 400, behaviour: 'king' }, // the Kingbreaker himself
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
 * An enemy on the UI thread, as a flat tuple so it's cheap to copy each frame:
 * [kind, x, y, hp, awake (0/1), timer, stun, alive (0/1), mode, time in mode,
 * locked direction x, y, struck-but-unhurt this frame (0/1), charges since the last window,
 * damage taken in this window, seconds to the next tick of debt (0: owes nothing; Ysolde's Collect the Tab)].
 */
export type Enemy = number[];
export const E_KIND = 0;
export const E_X = 1;
export const E_Y = 2;
export const E_HP = 3;
export const E_AWAKE = 4;
export const E_TIMER = 5;
export const E_STUN = 6;
export const E_ALIVE = 7;
export const E_MODE = 8;
export const E_MT = 9;
export const E_DX = 10;
export const E_DY = 11;
export const E_CLANG = 12;
export const E_COUNT = 13;
export const E_TAKEN = 14;
export const E_DEBT = 15;

/** What a patterned enemy is doing: chasing, winding up (the tell), lunging or charging, getting up, or (Kaldor) open to hits. */
export const CHASE = 0;
export const WINDUP = 1;
export const DASH = 2;
export const RECOVER = 3;
export const EXPOSED = 4;

export function spawnEnemy(kind: EnemyKind, x: number, y: number): Enemy {
  return [ENEMY_KINDS.indexOf(kind), x, y, ENEMIES[kind].hp, 0, 0, 0, 1, CHASE, 0, 0, 0, 0, 0, 0, 0];
}

export function sizeOf(e: Enemy): number {
  'worklet';
  return ENEMIES[ENEMY_KINDS[e[E_KIND]]].size ?? 1;
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
/** Touching an enemy hurts within this distance (a little more for the giants). */
const TOUCH = 10;
const TOUCH_PER_SIZE = 4;

/**
 * Each pattern's timings, in seconds and art pixels per second. The windup is
 * the tell: the enemy stops, flashes red, and commits to a direction.
 */
export const PATTERNS = {
  lunge: { range: 80, rest: 0.6, windup: 0.38, dash: 0.4, speed: 140, recover: 0.45 },
  slam: { range: 44, rest: 0.8, windup: 0.8, windupHurt: 0.55, recover: 1.6, recoverHurt: 1.2 },
  /** A slam's ring: how far it spreads, how long it takes, how thick it hurts. */
  wave: { radius: 38, grow: 0.3, life: 0.45, band: 7 },
  king: {
    range: 110,
    rest: 1.2,
    windup: 0.7,
    windupHurt: 0.45,
    dash: 0.8,
    speed: 170,
    recover: 0.4,
    commit: 0.25,
    exposed: 4,
    windowShare: 1 / 3,
    missesToGutter: 2,
  },
};

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
  /** Where slams landed this frame: [x, y, …], each the start of a spreading ring. */
  slams: number[];
  /** A torch guttered: Kaldor's shadow is back and he can be hurt. */
  guttered: boolean;
};

/** Moves every enemy a frame, and works out what they did to the player. */
export function stepEnemies(
  grid: Grid,
  enemies: Enemy[],
  px: number,
  py: number,
  dt: number,
  canHurt: boolean,
  slamRest: number = PATTERNS.slam.rest,
): StepResult {
  'worklet';
  const out: Enemy[] = [];
  let hurt = 0;
  let pushX = 0;
  let pushY = 0;
  let stun = 0;
  let shoutX = -1;
  let shoutY = -1;
  const slams: number[] = [];
  let guttered = false;
  for (const e0 of enemies) {
    const e = e0.slice();
    e[E_CLANG] = 0;
    if (e[E_ALIVE] === 0) {
      out.push(e);
      continue;
    }
    const stats = ENEMIES[ENEMY_KINDS[e[E_KIND]]];
    const dx = px - e[E_X];
    const dy = py - e[E_Y];
    const dist = Math.hypot(dx, dy);
    const size = stats.size ?? 1;
    if (e[E_STUN] > 0) e[E_STUN] = Math.max(0, e[E_STUN] - dt);
    if (dist < stats.sight) e[E_AWAKE] = 1;
    const free = e[E_AWAKE] === 1 && e[E_STUN] === 0;
    const chase = () => {
      if (dist > 1) {
        const [nx, ny] = move(grid, e[E_X], e[E_Y], (dx / dist) * stats.speed * dt, (dy / dist) * stats.speed * dt);
        e[E_X] = nx;
        e[E_Y] = ny;
      }
    };
    const to = (mode: number) => {
      e[E_MODE] = mode;
      e[E_MT] = 0;
    };
    const lock = () => {
      const d = dist || 1;
      e[E_DX] = dx / d;
      e[E_DY] = dy / d;
    };
    /** Runs along the locked direction; false if a wall stopped it short. */
    const dash = (speed: number) => {
      const want = speed * dt;
      const [nx, ny] = move(grid, e[E_X], e[E_Y], e[E_DX] * want, e[E_DY] * want);
      const got = Math.hypot(nx - e[E_X], ny - e[E_Y]);
      e[E_X] = nx;
      e[E_Y] = ny;
      return want === 0 || got >= want * 0.5;
    };
    const hurtLow = e[E_HP] <= ENEMIES[ENEMY_KINDS[e[E_KIND]]].hp / 2;
    if (free) e[E_MT] += dt;

    if (stats.behaviour === 'shout') {
      e[E_TIMER] += dt;
      if (free && e[E_TIMER] >= SHOUT_EVERY) {
        e[E_TIMER] = 0;
        shoutX = e[E_X];
        shoutY = e[E_Y];
        if (dist < SHOUT_RANGE) stun = SHOUT_STUN;
      }
    } else if (stats.behaviour === 'lunge' && free) {
      const P = PATTERNS.lunge;
      if (e[E_MODE] === CHASE) {
        chase();
        if (dist < P.range && e[E_MT] >= P.rest) {
          to(WINDUP);
          lock();
        }
      } else if (e[E_MODE] === WINDUP && e[E_MT] >= P.windup) to(DASH);
      else if (e[E_MODE] === DASH) {
        if (!dash(P.speed) || e[E_MT] >= P.dash) to(RECOVER);
      } else if (e[E_MODE] === RECOVER && e[E_MT] >= P.recover) to(CHASE);
    } else if (stats.behaviour === 'slam' && free) {
      const P = PATTERNS.slam;
      if (e[E_MODE] === CHASE) {
        chase();
        if (dist < P.range && e[E_MT] >= slamRest) to(WINDUP);
      } else if (e[E_MODE] === WINDUP && e[E_MT] >= (hurtLow ? P.windupHurt : P.windup)) {
        slams.push(e[E_X], e[E_Y]);
        to(RECOVER);
      } else if (e[E_MODE] === RECOVER && e[E_MT] >= (hurtLow ? P.recoverHurt : P.recover)) to(CHASE);
    } else if (stats.behaviour === 'king' && free) {
      const P = PATTERNS.king;
      const gutter = () => {
        to(EXPOSED);
        e[E_COUNT] = 0;
        guttered = true;
      };
      if (e[E_MODE] === CHASE) {
        chase();
        if (dist < P.range && e[E_MT] >= P.rest) {
          to(WINDUP);
          lock();
        }
      } else if (e[E_MODE] === WINDUP) {
        const windup = hurtLow ? P.windupHurt : P.windup;
        // He tracks you through the tell, then commits: the last beat is your chance to roll aside.
        if (e[E_MT] < windup - P.commit) lock();
        if (e[E_MT] >= windup) to(DASH);
      } else if (e[E_MODE] === DASH) {
        if (!dash(P.speed)) gutter();
        else if (e[E_MT] >= P.dash) {
          e[E_COUNT] += 1;
          if (e[E_COUNT] >= P.missesToGutter) gutter();
          else to(RECOVER);
        }
      } else if (e[E_MODE] === RECOVER && e[E_MT] >= P.recover) to(CHASE);
      else if (
        e[E_MODE] === EXPOSED &&
        (e[E_MT] >= P.exposed || e[E_TAKEN] >= Math.ceil(ENEMIES[ENEMY_KINDS[e[E_KIND]]].hp * P.windowShare))
      ) {
        // The window closes when it runs out, or once he's taken his share: he's back on his feet.
        e[E_TAKEN] = 0;
        // Hurt, he comes straight back at you.
        if (hurtLow) {
          to(WINDUP);
          lock();
        } else to(CHASE);
      }
    } else if (stats.behaviour === 'chase' || stats.behaviour === 'ambush') {
      if (free && dist > 1) chase();
    }
    // Touching hurts, except while stunned, winding up (the tell is safe; what follows isn't), getting up, or open to hits.
    const harmless = e[E_STUN] > 0 || e[E_MODE] === WINDUP || e[E_MODE] === RECOVER || e[E_MODE] === EXPOSED;
    if (canHurt && hurt === 0 && dist < TOUCH + TOUCH_PER_SIZE * (size - 1) && !harmless) {
      hurt = 1;
      const d = dist || 1;
      pushX = (dx / d) * 12;
      pushY = (dy / d) * 12;
    }
    out.push(e);
  }
  return { enemies: out, hurt, pushX, pushY, stun, shoutX, shoutY, slams, guttered };
}

/** Bosses with a pattern can't be stunned out of it: Aurek and Kaldor. */
export function unstunnable(e: Enemy): boolean {
  'worklet';
  const b = ENEMIES[ENEMY_KINDS[e[E_KIND]]].behaviour;
  return b === 'slam' || b === 'king';
}

/** True for an enemy whose hide turns half of each close blow right now: Aurek, except while he rises after a slam. Missiles find the stitches. */
export function armoured(e: Enemy): boolean {
  'worklet';
  return ENEMIES[ENEMY_KINDS[e[E_KIND]]].behaviour === 'slam' && e[E_MODE] !== RECOVER;
}

/** True for an enemy who shrugs off hits right now: Kaldor, until a torch gutters. */
export function guarded(e: Enemy): boolean {
  'worklet';
  return ENEMIES[ENEMY_KINDS[e[E_KIND]]].behaviour === 'king' && e[E_MODE] !== EXPOSED;
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
  /** Enemies (a bit per index) this blow passes over: a piercing bolt hits each one once. */
  skip = 0,
  /** A blade or a fist, not a missile: Aurek's hide turns half of it. */
  close = true,
): Enemy[] {
  'worklet';
  const out: Enemy[] = [];
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i].slice();
    if (skip & (1 << i)) {
      out.push(e);
      continue;
    }
    const dx = e[E_X] - x;
    const dy = e[E_Y] - y;
    const dist = Math.hypot(dx, dy);
    if (e[E_ALIVE] === 1 && dist <= radius + (sizeOf(e) - 1) * 6) {
      if (guarded(e)) {
        e[E_CLANG] = 1;
        e[E_AWAKE] = 1;
        out.push(e);
        continue;
      }
      // Aurek's stitched hide turns half of every close blow, except while he's getting up after a slam.
      const dealt = close && armoured(e) ? Math.max(1, Math.floor(damage / 2)) : damage;
      e[E_HP] -= dealt;
      if (e[E_MODE] === EXPOSED) e[E_TAKEN] += dealt;
      e[E_AWAKE] = 1;
      if (!unstunnable(e)) e[E_STUN] = Math.max(e[E_STUN], stun);
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

/** What the player's attacks did this frame, found by comparing enemies before and after. */
export type Strikes = {
  hits: number;
  kills: number;
  /** Blows that landed on someone who shrugged them off (Kaldor, guarded). */
  clangs: number;
  /** A boss (Aurek, Kaldor) or a boss's bearer was among those struck. */
  big: boolean;
  /** Where each enemy fell: [x, y, x, y, …]. */
  fell: number[];
  /** Index of each enemy struck, for its white flash. */
  struck: number[];
};

const BIG = ['aurek', 'kaldor'];

export function strikes(before: Enemy[], after: Enemy[]): Strikes {
  'worklet';
  const out: Strikes = { hits: 0, kills: 0, clangs: 0, big: false, fell: [], struck: [] };
  for (let i = 0; i < after.length; i++) {
    const b = before[i];
    const a = after[i];
    if (!b || b[E_ALIVE] === 0) continue;
    if (a[E_CLANG] === 1 && b[E_CLANG] === 0) out.clangs++;
    if (a[E_HP] >= b[E_HP]) continue;
    out.hits++;
    out.struck.push(i);
    if (BIG.includes(ENEMY_KINDS[a[E_KIND]])) out.big = true;
    if (a[E_ALIVE] === 0) {
      out.kills++;
      out.fell.push(a[E_X], a[E_Y]);
    }
  }
  return out;
}

/** Game feel, in seconds and art pixels: how long the world holds on a hit, and how hard the screen shakes. */
export const FEEL = {
  hitStop: 0.05,
  killStop: 0.09,
  bigStop: 0.14,
  hitShake: 1,
  killShake: 2,
  hurtShake: 3,
  shakeTime: 0.18,
  /** How long a struck enemy shows white. */
  flash: 0.09,
  /** How long a fallen enemy's puff lasts. */
  puff: 0.35,
};

/** The point in front of the player where a swing lands, for facing down/up/left/right. */
export function strikePoint(x: number, y: number, facing: number, reach: number): [number, number] {
  'worklet';
  if (facing === 1) return [x, y - 6 - reach / 2];
  if (facing === 2) return [x - reach / 2 - 2, y - 4];
  if (facing === 3) return [x + reach / 2 + 2, y - 4];
  return [x, y + reach / 2 - 2];
}
