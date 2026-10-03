import type { Dimension } from '@/game';

import {
  E_ALIVE,
  E_DEBT,
  E_HP,
  E_KIND,
  ENEMIES,
  ENEMY_KINDS,
  E_MODE,
  E_STUN,
  E_TAKEN,
  E_X,
  E_Y,
  HEARTS,
  MERCY,
  PATTERNS,
  hitAround,
  sizeOf,
  stepEnemies,
  strikePoint,
  strikes,
  unstunnable,
  type Attack,
  type Enemy,
  EXPOSED,
  guarded,
} from './combat';
import { move, type Grid } from './engine';
import type { SignatureKind } from './signatures';

// One frame of a fight, the same everywhere: the World's frame loop (on the
// UI thread, hence 'worklet') and the headless fight bot in the tests both
// call stepFight, so the balance table plays by the real rules.

/** Your dodge roll: how long, how fast (art pixels a second), and how soon again. */
export const ROLL = { time: 0.28, speed: 150, cooldown: 0.75 };
/** Hold the attack this long, then let go, for a charged attack (Path Lv 10 and up). */
export const CHARGE_TIME = 0.7;
/** A charged blow's recovery, as a share of the attack's own cooldown. */
const CHARGE_RECOVERY = 1.5;

/** A charged blow's damage: half as much again (at least one more). */
export function chargedDamage(damage: number): number {
  'worklet';
  return Math.max(damage + 1, Math.floor(damage * 1.5));
}
/** Path levels that unlock the charged attack, then each Path's special. */
export const CHARGE_LEVEL = 10;
export const SPECIAL_LEVEL = 20;
/** Below CHARGE_LEVEL, Aurek waits this long between slams (PATTERNS.slam.rest otherwise). */
const SLAM_REST_LOW = 2.2;
const BOLT_SPEED = 150;
/** Art pixels per tile (maps.ts TILE; not imported, to keep this file free of the map data). */
const TILE_PX = 16;

/**
 * Each Path's special, at Lv 20: what its charged attack becomes.
 * spin: hits all round you. spread: three bolts. mend: a heart back, once a
 * fight. stun: everyone near is stopped. rush: a charging palm. return: the
 * wrench flies back.
 */
export type PathSpecial = 'spin' | 'spread' | 'mend' | 'stun' | 'rush' | 'return';
/** A Path's special, or a character's own signature (signatures.ts). */
export type Special = PathSpecial | SignatureKind;
export const SPECIALS: Record<Dimension, { kind: PathSpecial; name: string; does: string }> = {
  physical: { kind: 'spin', name: 'Whirlwind', does: 'the charged swing hits all around' },
  intellectual: { kind: 'spread', name: 'Firestorm', does: 'three fire bolts at once' },
  spiritual: { kind: 'mend', name: 'Mending Light', does: 'a heart back, once a fight' },
  financial: { kind: 'stun', name: 'Bribe', does: 'everyone near stops for a moment' },
  emotional: { kind: 'rush', name: 'Rushing Palm', does: 'charge in with the strike' },
  social: { kind: 'stun', name: 'Lullaby', does: 'everyone near stops for a moment' },
  occupational: { kind: 'return', name: 'Boomerang', does: 'the wrench flies back' },
  environmental: { kind: 'spread', name: 'Volley', does: 'three arrows at once' },
};

/** Ysolde's debt: seconds between each heart it takes. */
export const DEBT_TICK = 0.8;
/** Moss's Arrow Barrage: how far it reaches, and when each volley lands after he lets go. */
export const BARRAGE = { range: 140, volleys: [0.3, 0.55], radius: 14 };
/** Oren's still breath, and the beat between Pip's two shockwaves. */
const BREATH = 0.5;
const ENCORE = 0.35;

/** What a character can do in a fight, by their real level: for their sheet. A signature replaces both. */
export function movesFor(
  dimension: Dimension,
  level: number,
  signature: { name: string; does: string } | null = null,
  signatureLevel = CHARGE_LEVEL,
) {
  if (signature)
    return [{ level: signatureLevel, name: signature.name, does: signature.does, unlocked: level >= signatureLevel }];
  return [
    {
      level: CHARGE_LEVEL,
      name: 'Charged blow',
      does: 'hold, then let go: half as much again',
      unlocked: level >= CHARGE_LEVEL,
    },
    {
      level: SPECIAL_LEVEL,
      name: SPECIALS[dimension].name,
      does: SPECIALS[dimension].does,
      unlocked: level >= SPECIAL_LEVEL,
    },
  ];
}

/** Everything that changes in a fight from frame to frame. */
export type Fight = {
  enemies: Enemy[];
  /** Bolts in flight: [x, y, dx, dy, travelled, power, turns back this many more times, enemies already hit (a bit each), size]. */
  bolts: number[][];
  hp: number;
  /** Seconds you can't be hurt again; seconds until you can attack again; seconds dazed by a shout. */
  mercy: number;
  cooldown: number;
  dazed: number;
  /** Rolling: time left, which way, and seconds until you can roll again. */
  roll: number;
  rollX: number;
  rollY: number;
  rollCool: number;
  /** How long the attack has been held (0 when it isn't). */
  charge: number;
  /** Let go fully charged while still recovering: the charged blow goes as soon as you're ready. */
  primed: boolean;
  /** The Cleric's mend is used up this fight. */
  mended: boolean;
  /** A blow still to come: [seconds left, what (1 Oren's palm, 2 Pip's encore), facing]. */
  delayed: number[];
  /** Arrows falling from Moss's Arrow Barrage: [x, y, seconds until they land]. */
  rain: number[][];
  /** The barrage is spent for this fight (once a day: see `barrageReady`). */
  rained: boolean;
  /** Baron Plush's pillows [x, y, dx, dy], and seconds until the next throw. */
  pillows: number[][];
  throwIn: number;
  /** Aurek's slams spreading: [x, y, age]. */
  waves: number[][];
  sleepy: number;
  /**
   * The last swing or burst, for attack-effects.tsx: [strike x, strike y,
   * radius, time left, your x, your y, facing, duration]; and a charged
   * attack's ring: [x, y, radius, time left, duration].
   */
  flash: number[];
  ring: number[];
  /** The last shout's ring: [x, y, time left]. */
  shout: number[];
  won: boolean;
  fallen: boolean;
};

export function startFight(enemies: Enemy[], hearts: number = HEARTS): Fight {
  'worklet';
  return {
    enemies,
    bolts: [],
    hp: hearts,
    mercy: 0,
    cooldown: 0,
    dazed: 0,
    roll: 0,
    rollX: 0,
    rollY: 0,
    rollCool: 0,
    charge: 0,
    primed: false,
    mended: false,
    delayed: [0, 0, 0],
    rain: [],
    rained: false,
    pillows: [],
    throwIn: 1.5,
    waves: [],
    sleepy: 0,
    flash: [0, 0, 0, 0, 0, 0, 0, 0],
    ring: [0, 0, 0, 0, 0],
    shout: [0, 0, 0],
    won: false,
    fallen: false,
  };
}

/** How the walking character fights, and where the fight is. */
export type FightRules = {
  grid: Grid;
  attack: Attack;
  /** Damage per blow (their real level adds to it). */
  damage: number;
  /** Their real level: Lv 10 charges, and from `specialLevel` the charged blow becomes `special`. */
  level: number;
  special: Special;
  /** SPECIAL_LEVEL for a Path's special; a signature comes at SIGNATURE_LEVEL. */
  specialLevel?: number;
  /** Moss can loose his Arrow Barrage: a real habit done today, and not yet used today. */
  barrageReady?: boolean;
  /** A boss fight: won once every enemy is down. Plush throws pillows from (bossX, bossY). */
  boss: boolean;
  bossX: number;
  bossY: number;
  throws: boolean;
  /** Drowsiness a second while standing still (Plush), or 0. */
  drowsy: number;
  /** Most hearts you can have (mending stops here). */
  maxHp: number;
  /**
   * A boss you can't beat, only hold out against: the fight is "won" (over) once any enemy has
   * taken this many hp, still standing. 0: off. The Kaldorium's warden on the prison route.
   */
  holdOut?: number;
};

export type FightInput = {
  /** Your feet, and which way you face (down, up, left, right). */
  x: number;
  y: number;
  facing: number;
  /** The stick, -1 to 1 each way. */
  stickX: number;
  stickY: number;
  /** You walked this frame (drowsiness drains). */
  moved: boolean;
  /** The attack button went down this frame, is down, or came up this frame. */
  press: boolean;
  held: boolean;
  release: boolean;
  /** The dodge button was pressed. */
  dodge: boolean;
};

/** What happened this frame, for sounds, buzzes, flashes and shakes. */
export type FightEvents = {
  swing: boolean;
  charged: boolean;
  hits: number;
  kills: number;
  clangs: number;
  big: boolean;
  /** Where enemies fell: [x, y, …]; which were struck (by index), for their flash. */
  fell: number[];
  struck: number[];
  hurt: boolean;
  rolled: boolean;
  mended: boolean;
  /** A signature went off: they shout. */
  signature: boolean;
  /** The Arrow Barrage went up (its one use of the day). */
  barrage: boolean;
  /** Enemies (by index) that paid a heart of debt this frame. */
  ticked: number[];
  slam: boolean;
  guttered: boolean;
  shout: boolean;
  won: boolean;
  fallen: boolean;
  /** Move the player this far this frame (a roll, a rush, a knock), in art pixels. */
  moveX: number;
  moveY: number;
};

const FACE_X = [0, 0, -1, 1];
const FACE_Y = [1, -1, 0, 0];

/**
 * Where to throw: at the nearest enemy in range (a phone has no second stick
 * to aim with, so bolts find their own mark, as in Archero), else where
 * you're pushing, else where you face.
 */
export function aim(enemies: Enemy[], x: number, y: number, facing: number, sx: number, sy: number, range: number) {
  'worklet';
  let best = -1;
  let bestD = range;
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (e[E_ALIVE] === 0) continue;
    const d = Math.hypot(e[E_X] - x, e[E_Y] - y);
    if (d < bestD) {
      best = i;
      bestD = d;
    }
  }
  if (best >= 0) {
    const dx = enemies[best][E_X] - x;
    const dy = enemies[best][E_Y] - 8 * (sizeOf(enemies[best]) - 1) - y;
    const d = Math.hypot(dx, dy) || 1;
    return [dx / d, dy / d];
  }
  const pushing = Math.hypot(sx, sy) > 0.25;
  const ax = pushing ? sx : FACE_X[facing];
  const ay = pushing ? sy : FACE_Y[facing];
  const d = Math.hypot(ax, ay) || 1;
  return [ax / d, ay / d];
}

const PATH_SPECIALS: Special[] = ['spin', 'spread', 'mend', 'stun', 'rush', 'return'];

/** How far a charging palm goes, up to `most`, stopping short of whoever's in the way. */
function rushReach(enemies: Enemy[], px: number, py: number, fc: number, most: number): number {
  'worklet';
  let reach = most;
  for (const e of enemies) {
    if (e[E_ALIVE] === 0) continue;
    const ahead = (e[E_X] - px) * FACE_X[fc] + (e[E_Y] - py) * FACE_Y[fc];
    const across = Math.abs((e[E_X] - px) * FACE_Y[fc] - (e[E_Y] - py) * FACE_X[fc]);
    if (ahead > 0 && across < 14) reach = Math.min(reach, Math.max(0, ahead - 12 - 4 * (sizeOf(e) - 1)));
  }
  return reach;
}

/** One frame of a fight. Returns the fight after, and what happened. */
export function stepFight(
  f0: Fight,
  input: FightInput,
  rules: FightRules,
  dt: number,
): { fight: Fight; events: FightEvents } {
  'worklet';
  const f: Fight = { ...f0 };
  const ev: FightEvents = {
    swing: false,
    charged: false,
    hits: 0,
    kills: 0,
    clangs: 0,
    big: false,
    fell: [],
    struck: [],
    hurt: false,
    rolled: false,
    mended: false,
    signature: false,
    barrage: false,
    ticked: [],
    slam: false,
    guttered: false,
    shout: false,
    won: false,
    fallen: false,
    moveX: 0,
    moveY: 0,
  };
  if (f.fallen || f.won) return { fight: f, events: ev };
  const { grid, attack } = rules;
  const px = input.x;
  const py = input.y;
  const fc = input.facing;
  f.mercy = Math.max(0, f.mercy - dt);
  f.cooldown = Math.max(0, f.cooldown - dt);
  f.dazed = Math.max(0, f.dazed - dt);
  f.rollCool = Math.max(0, f.rollCool - dt);

  // ---- your dodge: a quick roll you can't be hurt in.
  if (input.dodge && f.roll === 0 && f.rollCool === 0 && f.dazed === 0) {
    const pushing = Math.hypot(input.stickX, input.stickY) > 0.25;
    const rx = pushing ? input.stickX : FACE_X[fc];
    const ry = pushing ? input.stickY : FACE_Y[fc];
    const d = Math.hypot(rx, ry) || 1;
    f.roll = ROLL.time;
    f.rollX = rx / d;
    f.rollY = ry / d;
    f.rollCool = ROLL.cooldown + ROLL.time;
    ev.rolled = true;
  }
  if (f.roll > 0) {
    const t = Math.min(dt, f.roll);
    f.roll = Math.max(0, f.roll - dt);
    ev.moveX += f.rollX * ROLL.speed * t;
    ev.moveY += f.rollY * ROLL.speed * t;
  }

  // ---- your attack: a tap strikes at once; from Lv 10, holding charges it and letting go unleashes it.
  let enemies = f.enemies;
  const canCharge = rules.level >= CHARGE_LEVEL;
  const special = rules.level >= (rules.specialLevel ?? SPECIAL_LEVEL);
  let strike = 0; // 0 none, 1 normal, 2 charged
  if (input.press && f.cooldown === 0 && f.roll === 0) strike = 1;
  if (canCharge) {
    if (input.held) f.charge += dt;
    if (input.release) {
      if (f.charge >= CHARGE_TIME) f.primed = true;
      f.charge = 0;
    }
    // A charged blow waits for the last one to recover: no striking twice at once.
    if (f.primed && f.cooldown === 0 && f.roll === 0) {
      strike = 2;
      f.primed = false;
    }
  }
  if (strike > 0) {
    const power = strike === 2 ? 2 : 1;
    const damage = strike === 2 ? chargedDamage(rules.damage) : rules.damage;
    f.cooldown = attack.cooldown * (strike === 2 ? CHARGE_RECOVERY : 1);
    ev.swing = true;
    ev.charged = strike === 2;
    let kind: Special | null = strike === 2 && special ? rules.special : null;
    // The barrage goes up once a day, and only after a real habit: otherwise Moss's charged arrow is just that.
    if (kind === 'barrage') {
      if (rules.barrageReady && !f.rained) {
        const rain = f.rain.slice();
        for (const e of enemies) {
          if (e[E_ALIVE] === 0 || Math.hypot(e[E_X] - px, e[E_Y] - py) > BARRAGE.range) continue;
          for (const at of BARRAGE.volleys) rain.push([e[E_X], e[E_Y], at]);
        }
        f.rain = rain;
        f.rained = true;
        ev.barrage = true;
      } else kind = null;
    }
    ev.signature = kind !== null && !PATH_SPECIALS.includes(kind);
    if ((kind === 'mend' || kind === 'vigil') && !f.mended) {
      f.mended = true;
      f.hp = Math.min(rules.maxHp, f.hp + 1);
      ev.mended = true;
    }
    if (kind === 'stun' || kind === 'tab' || kind === 'vigil') {
      // A bribe or a lullaby stops everyone near; Ysolde's tab puts them in debt too; Wren's lantern reaches only the close.
      const reach = kind === 'vigil' ? 54 : 90;
      for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (e[E_ALIVE] === 1 && Math.hypot(e[E_X] - px, e[E_Y] - py) < reach) {
          const n = e.slice();
          if (!unstunnable(e)) n[E_STUN] = Math.max(n[E_STUN], kind === 'tab' ? 2 : 2.2);
          if (kind === 'tab' && !(n[E_DEBT] > 0)) n[E_DEBT] = DEBT_TICK;
          enemies = [...enemies.slice(0, i), n, ...enemies.slice(i + 1)];
        }
      }
      if (kind !== 'stun') f.ring = [px, py - 8, reach, 0.4, 0.4];
    }
    if (kind === 'rush') {
      const reach = rushReach(enemies, px, py, fc, 36);
      ev.moveX += FACE_X[fc] * reach;
      ev.moveY += FACE_Y[fc] * reach;
      f.mercy = Math.max(f.mercy, 0.6);
    }
    if (kind === 'breath') {
      // Oren stands still a beat, untouchable, then the palm goes (below, in the delayed blow).
      f.delayed = [BREATH, 1, fc];
      f.mercy = Math.max(f.mercy, BREATH + 0.3);
      f.dazed = Math.max(f.dazed, BREATH);
      f.ring = [px, py - 9, 14, BREATH, BREATH];
    } else if (kind === 'spin' || kind === 'sweetheart') {
      enemies = hitAround(grid, enemies, px, py - 6, attack.range + 8, damage, attack.knock * 1.5, attack.stun);
      f.flash = [px, py - 4, attack.range + 8, 0.3, px, py, fc, 0.3];
      f.ring = [px, py - 6, attack.range + 8, 0.3, 0.3];
      if (kind === 'sweetheart') {
        // …and then Brannoc remembers he's brave from a distance.
        ev.moveX -= FACE_X[fc] * 30;
        ev.moveY -= FACE_Y[fc] * 30;
        f.mercy = Math.max(f.mercy, 0.6);
      }
    } else if (attack.kind === 'melee') {
      const reach = attack.range * (strike === 2 ? 1.4 : 1);
      const [sx, sy] = strikePoint(px + ev.moveX, py + ev.moveY, fc, reach);
      const r = reach * 0.6 + 6;
      enemies = hitAround(grid, enemies, sx, sy, r, damage, attack.knock * power, attack.stun * power);
      f.flash = [sx, sy - 4, r - 2, 0.2, px, py, fc, 0.2];
      if (strike === 2) f.ring = [sx, sy - 4, r, 0.25, 0.25];
    } else if (attack.kind === 'burst') {
      const r = attack.range * (strike === 2 ? 1.5 : 1);
      enemies = hitAround(grid, enemies, px, py - 6, r, damage, attack.knock * power, attack.stun * power);
      f.flash = [px, py - 8, r, 0.35, px, py, fc, 0.35];
      if (strike === 2 && kind !== 'vigil') f.ring = [px, py - 8, r, 0.35, 0.35];
      if (kind === 'encore') f.delayed = [ENCORE, 2, fc];
    } else {
      const [dx, dy] = aim(enemies, px, py, fc, input.stickX, input.stickY, attack.range);
      const shots = kind === 'footnotes' ? [-0.5, -0.25, 0, 0.25, 0.5] : kind === 'spread' ? [-0.3, 0, 0.3] : [0];
      const fan = kind === 'footnotes' || kind === 'spread';
      const turns = kind === 'holdthis' ? 3 : kind === 'return' ? 1 : 0;
      const size = kind === 'holdthis' ? 3 : 1;
      const bolts = f.bolts.slice();
      for (const a of shots) {
        const c = Math.cos(a);
        const s = Math.sin(a);
        // A fan is ordinary bolts; any other charged bolt is one heavy, piercing one.
        const each = fan ? 1 : power;
        bolts.push([px, py - 8, dx * c - dy * s, dx * s + dy * c, 0, each, turns, 0, size]);
      }
      f.bolts = bolts;
      if (strike === 2) f.ring = [px, py - 8, 12 * size, 0.2, 0.2];
    }
  }

  // ---- a blow still to come: Oren's palm after his breath, Pip's second shockwave.
  if (f.delayed[0] > 0) {
    f.delayed = [f.delayed[0] - dt, f.delayed[1], f.delayed[2]];
    if (f.delayed[0] <= 0) {
      const what = f.delayed[1];
      const dfc = f.delayed[2];
      f.delayed = [0, 0, 0];
      if (what === 1) {
        const reach = rushReach(enemies, px, py, dfc, 28);
        ev.moveX += FACE_X[dfc] * reach;
        ev.moveY += FACE_Y[dfc] * reach;
        const r0 = attack.range * 1.6;
        const [sx, sy] = strikePoint(px + ev.moveX, py + ev.moveY, dfc, r0);
        const r = r0 * 0.6 + 8;
        enemies = hitAround(grid, enemies, sx, sy, r, chargedDamage(rules.damage), attack.knock * 3, 0.6);
        f.flash = [sx, sy - 4, r, 0.3, px, py, dfc, 0.3];
        f.ring = [sx, sy - 4, r + 6, 0.3, 0.3];
        f.mercy = Math.max(f.mercy, 0.4);
        ev.swing = true;
        ev.charged = true;
      } else if (what === 2) {
        // The encore carries further: it catches everyone the first wave knocked back.
        const r = attack.range * 2.2;
        enemies = hitAround(grid, enemies, px, py - 6, r, rules.damage, attack.knock * 1.5, attack.stun);
        f.flash = [px, py - 8, r, 0.35, px, py, dfc, 0.35];
        f.ring = [px, py - 8, r * 1.15, 0.35, 0.35];
        ev.swing = true;
        ev.charged = true;
      }
    }
  }

  // ---- the barrage lands where everyone stood when Moss let go: fast feet get out from under it.
  if (f.rain.length > 0) {
    const falling: number[][] = [];
    for (const r of f.rain) {
      const left = r[2] - dt;
      if (left > 0) falling.push([r[0], r[1], left]);
      else enemies = hitAround(grid, enemies, r[0], r[1], BARRAGE.radius, rules.damage, 4, 0.2, 0, false);
    }
    f.rain = falling;
  }
  // ---- bolts fly until they hit a wall, an enemy (a charged bolt goes through), or run out of range.
  if (f.bolts.length > 0) {
    const next: number[][] = [];
    for (const b of f.bolts) {
      const step = BOLT_SPEED * dt;
      const bx = b[0] + b[2] * step;
      const by = b[1] + b[3] * step;
      const travelled = b[4] + step;
      const tx = Math.floor(bx / TILE_PX);
      const ty = Math.floor(by / TILE_PX);
      const wall = tx < 0 || ty < 0 || tx >= grid.width || ty >= grid.height || grid.solid[ty * grid.width + tx] === 1;
      // Who it touches for the first time (a piercing bolt goes on, but hits each enemy once).
      let fresh = 0;
      for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        const touching =
          e[E_ALIVE] === 1 && Math.hypot(e[E_X] - bx, e[E_Y] - 8 * sizeOf(e) - by) < 9 * sizeOf(e) + (b[8] - 1) * 7;
        if (touching && !(b[7] & (1 << i))) fresh |= 1 << i;
      }
      const struck = fresh !== 0;
      if (struck) {
        enemies = hitAround(
          grid,
          enemies,
          bx,
          by + 8,
          10 + (b[8] - 1) * 7,
          b[5] > 1 ? chargedDamage(rules.damage) : rules.damage,
          attack.knock,
          attack.stun,
          ~fresh,
          false,
        );
      }
      const pierce = b[5] > 1;
      // Tamsin's huge wrench bounces off walls and comes back; anything else stops there.
      if (wall && b[8] > 1 && b[6] > 0) {
        next.push([b[0], b[1], -b[2], -b[3], 0, b[5], b[6] - 1, 0, b[8]]);
        continue;
      }
      if (wall || (struck && !pierce)) continue;
      if (travelled < attack.range) next.push([bx, by, b[2], b[3], travelled, b[5], b[6], b[7] | fresh, b[8]]);
      else if (b[6] > 0) next.push([bx, by, -b[2], -b[3], 0, b[5], b[6] - 1, 0, b[8]]); // a boomerang comes back, and can hit again
    }
    f.bolts = next;
  }

  // What your blows did.
  const s = strikes(f.enemies, enemies);
  ev.hits = s.hits;
  ev.kills = s.kills;
  ev.clangs = s.clangs;
  ev.big = s.big;
  ev.fell = s.fell;
  ev.struck = s.struck;

  // ---- debt: each enemy on Ysolde's tab pays a heart every DEBT_TICK until there's nothing left (Kaldor's guard only pauses it).
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (e[E_ALIVE] === 0 || !(e[E_DEBT] > 0)) continue;
    const n = e.slice();
    n[E_DEBT] -= dt;
    if (n[E_DEBT] <= 0) {
      n[E_DEBT] = DEBT_TICK;
      if (!guarded(n)) {
        n[E_HP] -= 1;
        if (n[E_MODE] === EXPOSED) n[E_TAKEN] += 1;
        ev.ticked.push(i);
        if (n[E_HP] <= 0) {
          n[E_ALIVE] = 0;
          n[E_DEBT] = 0;
          ev.kills += 1;
          ev.fell = [...ev.fell, n[E_X], n[E_Y]];
        }
      }
    }
    enemies = [...enemies.slice(0, i), n, ...enemies.slice(i + 1)];
  }

  // ---- the enemies' turn.
  const rolling = f.roll > 0;
  const r = stepEnemies(
    grid,
    enemies,
    px,
    py,
    dt,
    f.mercy === 0 && !rolling,
    rules.level < CHARGE_LEVEL ? SLAM_REST_LOW : PATTERNS.slam.rest,
  );
  f.enemies = r.enemies;
  let hurt = r.hurt;
  let pushX = r.pushX;
  let pushY = r.pushY;
  if (r.shoutX >= 0) {
    f.shout = [r.shoutX, r.shoutY - 8, 0.5];
    ev.shout = true;
  }
  if (r.stun > 0 && !rolling) f.dazed = Math.max(f.dazed, r.stun);
  if (r.guttered) ev.guttered = true;

  // Aurek's slams: a ring spreads along the ground; it hurts where its edge passes you.
  const W = PATTERNS.wave;
  const waves: number[][] = [];
  for (const w of f.waves) waves.push([w[0], w[1], w[2] + dt]);
  for (let i = 0; i < r.slams.length; i += 2) {
    waves.push([r.slams[i], r.slams[i + 1], 0]);
    ev.slam = true;
  }
  f.waves = waves.filter((w) => w[2] < W.life);
  if (f.mercy === 0 && !rolling && hurt === 0) {
    for (const w of f.waves) {
      if (w[2] > W.grow) continue;
      const radius = W.radius * (w[2] / W.grow);
      const d = Math.hypot(px - w[0], py - w[1]);
      if (Math.abs(d - radius) < W.band) {
        hurt = 1;
        const k = d || 1;
        pushX = ((px - w[0]) / k) * 14;
        pushY = ((py - w[1]) / k) * 14;
      }
    }
  }

  // Baron Plush lobs pillows from his sofa.
  if (rules.throws) {
    f.throwIn -= dt;
    const pillows = f.pillows.slice();
    if (f.throwIn <= 0) {
      f.throwIn = 2.2;
      const d = Math.hypot(px - rules.bossX, py - rules.bossY) || 1;
      pillows.push([rules.bossX, rules.bossY - 10, (px - rules.bossX) / d, (py - 8 - rules.bossY + 10) / d]);
    }
    const flying: number[][] = [];
    for (const p of pillows) {
      const nx = p[0] + p[2] * 70 * dt;
      const ny = p[1] + p[3] * 70 * dt;
      if (f.mercy === 0 && !rolling && Math.hypot(nx - px, ny - (py - 8)) < 8) {
        hurt = 1;
        continue;
      }
      if (nx > 0 && ny > 0 && nx < grid.width * TILE_PX && ny < grid.height * TILE_PX)
        flying.push([nx, ny, p[2], p[3]]);
    }
    f.pillows = flying;
  }

  // Drowsiness: standing still fills it, moving drains it. Full, and you fall asleep.
  if (rules.drowsy > 0) {
    f.sleepy = Math.min(1, Math.max(0, f.sleepy + (input.moved || rolling ? -0.35 : rules.drowsy) * dt));
    if (f.sleepy >= 1) {
      f.fallen = true;
      ev.fallen = true;
    }
  }

  if (hurt > 0) {
    f.mercy = MERCY;
    f.hp -= 1;
    f.charge = 0;
    f.primed = false;
    ev.hurt = true;
    ev.moveX += pushX;
    ev.moveY += pushY;
    if (f.hp <= 0) {
      f.fallen = true;
      ev.fallen = true;
    }
  }

  if (rules.boss && !f.fallen) {
    let standing = 0;
    let held = false;
    for (const e of f.enemies) {
      standing += e[E_ALIVE];
      const hold = rules.holdOut ?? 0;
      if (hold > 0 && e[E_ALIVE] === 1 && ENEMIES[ENEMY_KINDS[e[E_KIND]]].hp - e[E_HP] >= hold) held = true;
    }
    if (standing === 0 || held) {
      f.won = true;
      f.pillows = [];
      f.waves = [];
      ev.won = true;
    }
  }

  // Effects wind down.
  if (f.flash[3] > 0) f.flash = [...f.flash.slice(0, 3), Math.max(0, f.flash[3] - dt), ...f.flash.slice(4)];
  if (f.ring[3] > 0) f.ring = [f.ring[0], f.ring[1], f.ring[2], Math.max(0, f.ring[3] - dt), f.ring[4]];
  if (f.shout[2] > 0) f.shout = [f.shout[0], f.shout[1], Math.max(0, f.shout[2] - dt)];
  return { fight: f, events: ev };
}

/** Applies a fight's push to the player through walls: the walking engine's `move`. */
export function pushPlayer(grid: Grid, x: number, y: number, dx: number, dy: number): [number, number] {
  'worklet';
  if (dx === 0 && dy === 0) return [x, y];
  return move(grid, x, y, dx, dy);
}
