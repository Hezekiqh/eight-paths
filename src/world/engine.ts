// Walking, collisions and party follow. Everything here runs on the UI thread
// inside the World's frame callback (hence 'worklet'), and in plain Jest.
// Worklet functions aren't hoisted, so each is defined before its first use.
// Positions are in art pixels; (x, y) is the point between a walker's feet.

const TILE = 16;

/** Walking speed in art pixels per second: four tiles a second. */
export const SPEED = 64;
/** The feet's footprint: 5 pixels either side of centre, 5 pixels deep. */
const HALF_WIDTH = 5;
const DEPTH = 5;
/** How far the player is nudged sideways to slip through a gap they're nearly lined up with. */
const SLIDE_REACH = 7;

/** Facing indices match FACINGS in maps.ts and the sprite sheet's column blocks. */
export const DOWN = 0;
export const UP = 1;
export const LEFT = 2;
export const RIGHT = 3;

export type Grid = { solid: number[]; width: number; height: number };

function solidPoint(grid: Grid, px: number, py: number): boolean {
  'worklet';
  const tx = Math.floor(px / TILE);
  const ty = Math.floor(py / TILE);
  if (tx < 0 || ty < 0 || tx >= grid.width || ty >= grid.height) return true;
  return grid.solid[ty * grid.width + tx] === 1;
}

/** True if feet standing at (x, y) would overlap anything solid. */
export function blocked(grid: Grid, x: number, y: number): boolean {
  'worklet';
  const l = x - HALF_WIDTH;
  const r = x + HALF_WIDTH - 0.001;
  const t = y - DEPTH;
  const b = y - 0.001;
  return solidPoint(grid, l, t) || solidPoint(grid, r, t) || solidPoint(grid, l, b) || solidPoint(grid, r, b);
}

/**
 * For a blocked step to (ax, ay): the sideways step (along x if `alongX`, else
 * along y) toward the nearest clear spot within reach, at most `amount`. 0 if none.
 */
function ease(grid: Grid, ax: number, ay: number, amount: number, alongX: boolean): number {
  'worklet';
  for (let k = 1; k <= SLIDE_REACH; k++) {
    for (const dir of [-1, 1]) {
      const clear = alongX ? !blocked(grid, ax + dir * k, ay) : !blocked(grid, ax, ay + dir * k);
      if (clear) return dir * Math.min(amount, k);
    }
  }
  return 0;
}

/**
 * Moves by (dx, dy), each axis on its own so walls slide rather than stick.
 * Pushing straight into a corner that's nearly lined up with a gap eases the
 * player sideways into it, so one-tile aisles don't need pixel-perfect aim.
 */
export function move(grid: Grid, x: number, y: number, dx: number, dy: number): [number, number] {
  'worklet';
  let nx = x;
  let ny = y;
  if (dx !== 0) {
    if (!blocked(grid, x + dx, ny)) nx = x + dx;
    else if (dy === 0) {
      const s = ease(grid, x + dx, ny, Math.abs(dx), false);
      if (s !== 0 && !blocked(grid, x, ny + s)) ny += s;
    }
  }
  if (dy !== 0) {
    if (!blocked(grid, nx, y + dy)) ny = y + dy;
    else if (dx === 0) {
      const s = ease(grid, nx, y + dy, Math.abs(dy), true);
      if (s !== 0 && !blocked(grid, nx + s, ny)) nx += s;
    }
  }
  return [nx, ny];
}

/**
 * Which way to face for a stick direction. Keeps the current facing near the
 * diagonals, so walking diagonally doesn't flicker between two sprites.
 */
export function facingFor(ix: number, iy: number, current: number): number {
  'worklet';
  const ax = Math.abs(ix);
  const ay = Math.abs(iy);
  const horizontal = ax > ay;
  const dominant = horizontal ? (ix < 0 ? LEFT : RIGHT) : iy < 0 ? UP : DOWN;
  if (dominant === current) return current;
  const along = current === LEFT ? -ix : current === RIGHT ? ix : current === UP ? -iy : iy;
  // stay put while the current direction still carries most of the push
  if (along > 0 && along >= Math.max(ax, ay) * 0.8) return current;
  return dominant;
}

/** How far past the feet A reaches: bump into something (or nearly) to talk to it. */
const REACH = 6;

/** The tile just in front of feet at (x, y) facing `facing`. */
export function tileAhead(x: number, y: number, facing: number): [number, number] {
  'worklet';
  let px = x;
  let py = y - DEPTH / 2;
  if (facing === LEFT) px = x - HALF_WIDTH - REACH;
  if (facing === RIGHT) px = x + HALF_WIDTH + REACH;
  if (facing === UP) py = y - DEPTH - REACH;
  if (facing === DOWN) py = y + REACH;
  return [Math.floor(px / TILE), Math.floor(py / TILE)];
}

// ---- party follow
//
// The lead leaves a trail of recent positions (a flat [x, y, x, y, …] list,
// newest last, about a pixel apart). Each follower stands a fixed distance
// back along it, so the party walks the lead's exact path, around corners.

/** How far apart the party walks, in trail points (about a pixel each). */
export const FOLLOW_GAP = 14;
/** Enough trail for three followers. */
export const TRAIL_POINTS = FOLLOW_GAP * 3 + 4;

/** A fresh trail with everyone standing on the lead. */
export function startTrail(x: number, y: number): number[] {
  const trail: number[] = [];
  for (let i = 0; i < TRAIL_POINTS; i++) trail.push(x, y);
  return trail;
}

/** Adds the lead's new position to the trail if they've moved far enough, dropping the oldest. */
export function extendTrail(trail: number[], x: number, y: number): number[] {
  'worklet';
  const n = trail.length;
  const lx = trail[n - 2];
  const ly = trail[n - 1];
  if (Math.abs(x - lx) + Math.abs(y - ly) < 1) return trail;
  const next = trail.slice(2);
  next.push(x, y);
  return next;
}

/** Where follower `k` (1, 2, 3) stands, and which way they face. */
export function followerAt(trail: number[], k: number, leadFacing: number): [number, number, number] {
  'worklet';
  const count = trail.length / 2;
  const i = Math.max(0, count - 1 - k * FOLLOW_GAP);
  const x = trail[i * 2];
  const y = trail[i * 2 + 1];
  // face toward the point a few steps ahead of them on the trail
  const j = Math.min(count - 1, i + 4);
  const dx = trail[j * 2] - x;
  const dy = trail[j * 2 + 1] - y;
  if (Math.abs(dx) + Math.abs(dy) < 0.5) return [x, y, leadFacing];
  const facing = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? LEFT : RIGHT) : dy < 0 ? UP : DOWN;
  return [x, y, facing];
}

/** The walk-cycle frame for distance walked: stand, step, stand, other step. */
export function walkFrame(distance: number, moving: boolean): number {
  'worklet';
  if (!moving) return 0;
  const phase = Math.floor(distance / 7) % 4;
  return phase === 1 ? 1 : phase === 3 ? 2 : 0;
}

/**
 * Draw order for walkers given as [row, facing, frame, x, y]: further up the
 * screen first. (A named worklet: an inline comparator gets hoisted out of the
 * frame loop by the React Compiler and can't run on the UI thread.)
 */
export function byFeet(a: number[], b: number[]): number {
  'worklet';
  return a[4] - b[4];
}

// ---- boulders
// Boulders sit on whole tiles (stored as y * width + x). Walk into one and keep
// pushing, and it slides a tile, if the tile beyond is open ground.

/** How long the player leans on a boulder before it moves, in seconds. */
export const PUSH_DELAY = 0.25;

/** The boulder on this tile, or -1. */
export function boulderAt(boulders: number[], tile: number): number {
  'worklet';
  return boulders.indexOf(tile);
}

/**
 * Pushes boulder `i` one tile by (dx, dy). Returns the new solid grid and
 * boulder list, or null if something's in the way (a wall, an NPC, another boulder).
 */
export function pushBoulder(
  solid: number[],
  width: number,
  height: number,
  boulders: number[],
  i: number,
  dx: number,
  dy: number,
): { solid: number[]; boulders: number[] } | null {
  'worklet';
  const from = boulders[i];
  const x = (from % width) + dx;
  const y = Math.floor(from / width) + dy;
  if (x < 0 || y < 0 || x >= width || y >= height) return null;
  const to = y * width + x;
  if (solid[to] === 1) return null;
  const nextSolid = solid.slice();
  nextSolid[from] = 0;
  nextSolid[to] = 1;
  const nextBoulders = boulders.slice();
  nextBoulders[i] = to;
  return { solid: nextSolid, boulders: nextBoulders };
}

/**
 * The boulder the player is leaning on: feet right up against one, straight
 * ahead in the way they face. -1 if none. Walking into it should push it, not
 * ease them round it (move() slips walkers past corners, and a lone boulder
 * always has a gap beside it).
 */
export function leaningOn(grid: Grid, boulders: number[], x: number, y: number, facing: number): number {
  'worklet';
  if (boulders.length === 0) return -1;
  const dx = facing === LEFT ? -1 : facing === RIGHT ? 1 : 0;
  const dy = facing === UP ? -1 : facing === DOWN ? 1 : 0;
  if (!blocked(grid, x + dx, y + dy)) return -1;
  // Every tile the feet would step into; lean only if it's a boulder that's in the way, not a wall.
  const l = Math.floor((x + dx - HALF_WIDTH) / TILE);
  const r = Math.floor((x + dx + HALF_WIDTH - 0.001) / TILE);
  const t = Math.floor((y + dy - DEPTH) / TILE);
  const b = Math.floor((y + dy - 0.001) / TILE);
  let found = -1;
  for (let ty = t; ty <= b; ty++) {
    for (let tx = l; tx <= r; tx++) {
      const tile = ty * grid.width + tx;
      if (grid.solid[tile] !== 1) continue;
      const i = boulderAt(boulders, tile);
      if (i === -1) return -1;
      found = i;
    }
  }
  return found;
}

/** True when every plate has a boulder on it. */
export function platesCovered(plates: number[], boulders: number[]): boolean {
  'worklet';
  if (plates.length === 0) return false;
  for (const p of plates) if (boulders.indexOf(p) === -1) return false;
  return true;
}
