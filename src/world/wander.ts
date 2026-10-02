// People who walk about (NpcObject.wander): a stroll to a tile nearby, a
// pause, a look around, another stroll, never far from home. Runs on the UI
// thread inside the World's frame callback (hence 'worklet'), and in plain Jest.
// A walker takes the tile they're stepping into in the solid grid before they
// set off and gives the old one back when they get there, so the player bumps
// into them like anyone else, and they never step onto the player.

const TILE = 16;

/** A stroll: about a tile and a half a second. */
export const WANDER_SPEED = 24;

/**
 * One row per NPC, in map order, as a flat tuple so it's cheap to copy each frame:
 * [home x, home y, tile x, tile y, to x, to y, how far along the step (0 to 1),
 * seconds to wait, how far from home (0: stands still), which way (0 any, 1 across, 2 up and down),
 * random seed, facing].
 */
export type Wanderer = number[];
export const W_HX = 0;
export const W_HY = 1;
export const W_X = 2;
export const W_Y = 3;
export const W_TX = 4;
export const W_TY = 5;
export const W_T = 6;
export const W_WAIT = 7;
export const W_R = 8;
export const W_AXIS = 9;
export const W_SEED = 10;
export const W_FACING = 11;

/** Facing indices, as in engine.ts: down, up, left, right. */
const STEPS = [
  [0, 1],
  [0, -1],
  [-1, 0],
  [1, 0],
];

export type WanderSpec = { x: number; y: number; facing: number; wander?: number; along?: 'x' | 'y' };

/** Everyone standing at home, facing their own way, each with a seed of their own. */
export function newWanderers(npcs: WanderSpec[]): Wanderer[] {
  return npcs.map((n, i) => [
    n.x,
    n.y,
    n.x,
    n.y,
    n.x,
    n.y,
    0,
    1 + (i % 4) * 0.7,
    n.wander ?? 0,
    n.along === 'x' ? 1 : n.along === 'y' ? 2 : 0,
    (n.x * 7919 + n.y * 104729 + i * 31) % 2147483646 || 1,
    n.facing,
  ]);
}

/** The next seed and a number from 0 to 1 (a Park-Miller generator: small enough for doubles). */
function roll(seed: number): [number, number] {
  'worklet';
  const next = (seed * 16807) % 2147483647;
  return [next, next / 2147483647];
}

/** True if the player's feet at (px, py) touch tile (tx, ty), with a little room to spare. */
function underPlayer(tx: number, ty: number, px: number, py: number): boolean {
  'worklet';
  const pad = 2;
  return px + 5 + pad > tx * TILE && px - 5 - pad < (tx + 1) * TILE && py + pad > ty * TILE && py - 5 - pad < (ty + 1) * TILE;
}

/**
 * Everyone's next moment: strolls carry on, pauses run down, and anyone done
 * waiting turns to look about or sets off for a free tile near home. Returns
 * the new rows and the solid grid (the same array when nobody took or gave back a tile).
 */
export function stepWanderers(
  rows: Wanderer[],
  solid: number[],
  width: number,
  height: number,
  px: number,
  py: number,
  dt: number,
  /** Tiles nobody strolls onto, as y * width + x: the doorways and road ends, so nobody blocks the way out. */
  avoid: number[] = [],
): { rows: Wanderer[]; solid: number[] } {
  'worklet';
  let grid = solid;
  const out: Wanderer[] = [];
  for (let i = 0; i < rows.length; i++) {
    const w = rows[i].slice();
    out.push(w);
    if (w[W_R] <= 0) continue;
    const stepping = w[W_TX] !== w[W_X] || w[W_TY] !== w[W_Y];
    if (stepping) {
      w[W_T] += (WANDER_SPEED * dt) / TILE;
      if (w[W_T] >= 1) {
        if (grid === solid) grid = solid.slice();
        grid[w[W_Y] * width + w[W_X]] = 0;
        w[W_X] = w[W_TX];
        w[W_Y] = w[W_TY];
        w[W_T] = 0;
        const [s, r] = roll(w[W_SEED]);
        w[W_SEED] = s;
        w[W_WAIT] = 1.5 + r * 3;
      }
      continue;
    }
    w[W_WAIT] -= dt;
    if (w[W_WAIT] > 0) continue;
    const [s1, r1] = roll(w[W_SEED]);
    const [s2, r2] = roll(s1);
    w[W_SEED] = s2;
    // Sometimes they just look about.
    if (r1 < 0.3) {
      w[W_FACING] = Math.floor(r2 * 4) % 4;
      w[W_WAIT] = 1 + r2 * 2;
      continue;
    }
    const choices = w[W_AXIS] === 1 ? [2, 3] : w[W_AXIS] === 2 ? [0, 1] : [0, 1, 2, 3];
    const dir = choices[Math.floor(r2 * choices.length) % choices.length];
    const tx = w[W_X] + STEPS[dir][0];
    const ty = w[W_Y] + STEPS[dir][1];
    const near = Math.abs(tx - w[W_HX]) <= w[W_R] && Math.abs(ty - w[W_HY]) <= w[W_R];
    const inside = tx >= 0 && ty >= 0 && tx < width && ty < height;
    w[W_FACING] = dir;
    const free = inside && grid[ty * width + tx] === 0 && !avoid.includes(ty * width + tx);
    if (near && free && !underPlayer(tx, ty, px, py)) {
      if (grid === solid) grid = solid.slice();
      grid[ty * width + tx] = 1;
      w[W_TX] = tx;
      w[W_TY] = ty;
      w[W_T] = 0;
    } else w[W_WAIT] = 0.6;
  }
  return { rows: out, solid: grid };
}

/** Where someone's feet are now, in art pixels (between tiles while they stroll). */
export function wandererFeet(w: Wanderer): [number, number] {
  'worklet';
  const x = w[W_X] + (w[W_TX] - w[W_X]) * w[W_T];
  const y = w[W_Y] + (w[W_TY] - w[W_Y]) * w[W_T];
  return [x * TILE + TILE / 2, y * TILE + TILE - 2];
}

/** The tile someone counts as standing on, for talking to them: where they're headed once past halfway. */
export function wandererTile(w: Wanderer): [number, number] {
  'worklet';
  return w[W_T] >= 0.5 ? [w[W_TX], w[W_TY]] : [w[W_X], w[W_Y]];
}

/** True while they're mid-stroll (for the walk cycle). */
export function strolling(w: Wanderer): boolean {
  'worklet';
  return w[W_TX] !== w[W_X] || w[W_TY] !== w[W_Y];
}

/** Who is standing on tile (tx, ty) right now, if anyone: `rows` follow `ids`, and anyone without a row is at home. */
export function whoIsAt<T extends { id: string; x: number; y: number }>(
  npcs: T[],
  ids: string[],
  rows: Wanderer[],
  tx: number,
  ty: number,
): T | undefined {
  return npcs.find((n) => {
    const w = rows[ids.indexOf(n.id)];
    const [x, y] = w ? wandererTile(w) : [n.x, n.y];
    return x === tx && y === ty;
  });
}

/** Someone you've just spoken to turns to face you, and stays put a while before strolling on. */
export function turnToTalk(rows: Wanderer[], row: number, facing: number): Wanderer[] {
  if (!rows[row]) return rows;
  const out = rows.slice();
  const w = rows[row].slice();
  w[W_FACING] = facing;
  w[W_WAIT] = Math.max(w[W_WAIT], 4);
  out[row] = w;
  return out;
}
