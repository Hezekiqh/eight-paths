import type { Dimension } from '@/game';

import {
  E_ALIVE,
  E_STUN,
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
  type Attack,
  type Enemy,
} from './combat';
import { move, type Grid } from './engine';

// One frame of a fight, the same everywhere: the World's frame loop (on the
// UI thread, hence 'worklet') and the headless fight bot in the tests both
// call stepFight, so the balance table plays by the real rules.

/** Your dodge roll: how long, how fast (art pixels a second), and how soon again. */
export const ROLL = { time: 0.28, speed: 150, cooldown: 0.75 };
/** Hold the attack this long, then let go, for a charged attack (Path Lv 10 and up). */
export const CHARGE_TIME = 0.5;
/** Path levels that unlock the charged attack, then each Path's special. */
export const CHARGE_LEVEL = 10;
export const SPECIAL_LEVEL = 20;
const BOLT_SPEED = 150;
/** Art pixels per tile (maps.ts TILE; not imported, to keep this file free of the map data). */
const TILE_PX = 16;

/**
 * Each Path's special, at Lv 20: what its charged attack becomes.
 * spin: hits all round you. spread: three bolts. mend: a heart back, once a
 * fight. stun: everyone near is stopped. rush: a charging palm. return: the
 * wrench flies back.
 */
export type Special = 'spin' | 'spread' | 'mend' | 'stun' | 'rush' | 'return';
export const SPECIALS: Record<Dimension, { kind: Special; name: string; does: string }> = {
  physical: { kind: 'spin', name: 'Whirlwind', does: 'the charged swing hits all around' },
  intellectual: { kind: 'spread', name: 'Firestorm', does: 'three fire bolts at once' },
  spiritual: { kind: 'mend', name: 'Mending Light', does: 'a heart back, once a fight' },
  financial: { kind: 'stun', name: 'Bribe', does: 'everyone near stops for a moment' },
  emotional: { kind: 'rush', name: 'Rushing Palm', does: 'charge in with the strike' },
  social: { kind: 'stun', name: 'Lullaby', does: 'everyone near stops for a moment' },
  occupational: { kind: 'return', name: 'Boomerang', does: 'the wrench flies back' },
  environmental: { kind: 'spread', name: 'Volley', does: 'three arrows at once' },
};

/** What a character can do in a fight, by their real level: for their sheet. */
export function movesFor(dimension: Dimension, level: number) {
  return [
    { level: CHARGE_LEVEL, name: 'Charged blow', does: 'hold, then let go: double damage', unlocked: level >= CHARGE_LEVEL },
    { level: SPECIAL_LEVEL, name: SPECIALS[dimension].name, does: SPECIALS[dimension].does, unlocked: level >= SPECIAL_LEVEL },
  ];
}

/** Everything that changes in a fight from frame to frame. */
export type Fight = {
  enemies: Enemy[];
  /** Bolts in flight: [x, y, dx, dy, travelled, power, returned (0/1)]. */
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
  /** The Cleric's mend is used up this fight. */
  mended: boolean;
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

export function startFight(enemies: Enemy[]): Fight {
  'worklet';
  return {
    enemies,
    bolts: [],
    hp: HEARTS,
    mercy: 0,
    cooldown: 0,
    dazed: 0,
    roll: 0,
    rollX: 0,
    rollY: 0,
    rollCool: 0,
    charge: 0,
    mended: false,
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
  /** Their real level: Lv 10 charges, Lv 20 adds the special. */
  level: number;
  special: Special;
  /** A boss fight: won once every enemy is down. Plush throws pillows from (bossX, bossY). */
  boss: boolean;
  bossX: number;
  bossY: number;
  throws: boolean;
  /** Drowsiness a second while standing still (Plush), or 0. */
  drowsy: number;
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

/** One frame of a fight. Returns the fight after, and what happened. */
export function stepFight(f0: Fight, input: FightInput, rules: FightRules, dt: number): { fight: Fight; events: FightEvents } {
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
  const special = rules.level >= SPECIAL_LEVEL;
  let strike = 0; // 0 none, 1 normal, 2 charged
  if (input.press && f.cooldown === 0 && f.roll === 0) strike = 1;
  if (canCharge) {
    if (input.held) f.charge += dt;
    if (input.release) {
      if (f.charge >= CHARGE_TIME && f.roll === 0) strike = 2;
      f.charge = 0;
    }
  }
  if (strike > 0) {
    const power = strike === 2 ? 2 : 1;
    const damage = rules.damage * power;
    f.cooldown = attack.cooldown;
    ev.swing = true;
    ev.charged = strike === 2;
    const kind = strike === 2 && special ? rules.special : null;
    if (kind === 'mend' && !f.mended) {
      f.mended = true;
      f.hp = Math.min(HEARTS, f.hp + 1);
      ev.mended = true;
    }
    if (kind === 'stun') {
      for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (e[E_ALIVE] === 1 && Math.hypot(e[E_X] - px, e[E_Y] - py) < 90) {
          const n = e.slice();
          n[E_STUN] = Math.max(n[E_STUN], 2.2);
          enemies = [...enemies.slice(0, i), n, ...enemies.slice(i + 1)];
        }
      }
    }
    if (kind === 'rush') {
      // Charge forward, stopping short of whoever's in the way.
      let reach = 36;
      for (const e of enemies) {
        if (e[E_ALIVE] === 0) continue;
        const ahead = (e[E_X] - px) * FACE_X[fc] + (e[E_Y] - py) * FACE_Y[fc];
        const across = Math.abs((e[E_X] - px) * FACE_Y[fc] - (e[E_Y] - py) * FACE_X[fc]);
        if (ahead > 0 && across < 14) reach = Math.min(reach, Math.max(0, ahead - 12 - 4 * (sizeOf(e) - 1)));
      }
      ev.moveX += FACE_X[fc] * reach;
      ev.moveY += FACE_Y[fc] * reach;
      f.mercy = Math.max(f.mercy, 0.6);
    }
    if (kind === 'spin') {
      enemies = hitAround(grid, enemies, px, py - 6, attack.range + 8, damage, attack.knock * 1.5, attack.stun);
      f.flash = [px, py - 4, attack.range + 8, 0.3, px, py, fc, 0.3];
      f.ring = [px, py - 6, attack.range + 8, 0.3, 0.3];
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
      if (strike === 2) f.ring = [px, py - 8, r, 0.35, 0.35];
    } else {
      const [dx, dy] = aim(enemies, px, py, fc, input.stickX, input.stickY, attack.range);
      const shots = kind === 'spread' ? [-0.3, 0, 0.3] : [0];
      const bolts = f.bolts.slice();
      for (const a of shots) {
        const c = Math.cos(a);
        const s = Math.sin(a);
        bolts.push([px, py - 8, dx * c - dy * s, dx * s + dy * c, 0, power, kind === 'return' ? 0 : 1]);
      }
      f.bolts = bolts;
      if (strike === 2) f.ring = [px, py - 8, 12, 0.2, 0.2];
    }
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
      let struck = false;
      for (const e of enemies) {
        if (e[E_ALIVE] === 1 && Math.hypot(e[E_X] - bx, e[E_Y] - 8 * sizeOf(e) - by) < 9 * sizeOf(e)) struck = true;
      }
      if (struck) {
        enemies = hitAround(grid, enemies, bx, by + 8, 10, rules.damage * b[5], attack.knock, attack.stun);
      }
      const pierce = b[5] > 1;
      if (wall || (struck && !pierce)) continue;
      if (travelled < attack.range) next.push([bx, by, b[2], b[3], travelled, b[5], b[6]]);
      else if (b[6] === 0) next.push([bx, by, -b[2], -b[3], 0, b[5], 1]); // the boomerang comes back
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

  // ---- the enemies' turn.
  const rolling = f.roll > 0;
  const r = stepEnemies(grid, enemies, px, py, dt, f.mercy === 0 && !rolling);
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
      if (nx > 0 && ny > 0 && nx < grid.width * TILE_PX && ny < grid.height * TILE_PX) flying.push([nx, ny, p[2], p[3]]);
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
    for (const e of f.enemies) standing += e[E_ALIVE];
    if (standing === 0) {
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

