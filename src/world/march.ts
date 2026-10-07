import { walkFrame } from './engine';
import { TILE } from './maps';

// A march: a short scripted walk, a cutscene in the room itself (author, Oct 3, 2026: the guards
// march you down to the cell; Brannoc bolts through the bars). Everyone in it walks their own path
// at one speed, starting together, and stops at the end of it.
//
// For the UI thread it's flat numbers: [t, speed, count, linger, arrived, ...each actor], where an actor is
// [row, face at the end (-1: the way they last walked), flags, delay, pace, point count, x0, y0, x1, y1, ...] in
// art pixels at the feet. Flags: 1 snot, 2 vanish, 4 laugh (MF_*). Row -1 is you: the march moves the lead
// itself. A lingering march keeps everyone standing where they arrived (a guard waiting while someone talks)
// until the next march replaces it; `arrived` says its end has been reported.

/** The most actors a march draws, besides you. */
export const MARCH_ACTORS = 6;
/** Numbers before the first actor: t, speed, count, linger, arrived. */
export const MARCH_HEAD = 5;
/** Numbers before an actor's points: row, face, flags, delay, pace, point count. */
export const ACTOR_HEAD = 6;
/** A beat at the end, everyone standing, before the march is over. */
const HOLD = 0.35;
/** An actor's face for someone who's gone once they get there: up the ladder, out of sight. */
export const GONE = 6;
/** How fast a march walks unless told otherwise, in tiles per second (before the game's speed). */
export const MARCH_PACE = 3;
/** Actor flags: a snot bubble; gone in a puff at the end of the path; laughing while they wait to set off. */
export const MF_SNOT = 1;
export const MF_VANISH = 2;
export const MF_LAUGH = 4;

export type Actor = {
  /** The walker row in the sheet; -1 for you. */
  row: number;
  /** Tiles to walk through, in order; one tile to stand still. */
  path: [number, number][];
  /**
   * 0 down, 1 up, 2 left, 3 right: which way to face once there. 4: out cold, flat on their back the whole way
   * (Brannoc); 5: the same, carried, held up off the ground. GONE (6): gone once there (up a ladder, out a door).
   */
  face?: number;
  /** Fast asleep the whole way, a snot bubble swelling at the nose (Brannoc sleepwalking to the warden). */
  snot?: boolean;
  /** Seconds standing at the start of the path before setting off (everyone else is already walking). */
  delay?: number;
  /** How much faster than the march they go (2: twice as fast; Felix, dashing off). */
  pace?: number;
  /** Shoulders shaking, laughing, while they wait out their delay (Felix). */
  laugh?: boolean;
  /** Gone at the end of the path, in a puff (Kaldor's shadows, going out of him). */
  vanish?: boolean;
};

const feet = ([x, y]: [number, number]) => [x * TILE + TILE / 2, y * TILE + TILE - 2];

/** A new march, in tiles per second; `linger`: everyone stays put once there, until the next march. */
export function newMarch(actors: Actor[], tilesPerSecond = MARCH_PACE, linger = false): number[] {
  const out = [0, tilesPerSecond * TILE, actors.length, linger ? 1 : 0, 0];
  for (const a of actors) {
    const flags = (a.snot ? MF_SNOT : 0) | (a.vanish ? MF_VANISH : 0) | (a.laugh ? MF_LAUGH : 0);
    out.push(a.row, a.face ?? -1, flags, a.delay ?? 0, a.pace ?? 1, a.path.length, ...a.path.flatMap(feet));
  }
  return out;
}

/** 0 down, 1 up, 2 left, 3 right, for a step of (dx, dy). */
function facingOf(dx: number, dy: number, was: number): number {
  'worklet';
  if (dx === 0 && dy === 0) return was;
  if (Math.abs(dx) >= Math.abs(dy)) return dx < 0 ? 2 : 3;
  return dy < 0 ? 1 : 0;
}

/**
 * Where everyone is, `t` seconds in: one [row, facing, frame, x, y, walking (0/1), snot (0/1), gone (0/1),
 * laughing (0/1)] each, and whether it's over (everyone arrived, and the beat after). Gone: not drawn, once there,
 * for whoever leaves (face GONE: up a ladder, out a door) or vanishes (in a puff: marchVanished).
 */
export function marchPoses(m: number[], t: number): { poses: number[][]; done: boolean } {
  'worklet';
  const speed = m[1];
  const count = m[2];
  const poses: number[][] = [];
  let longest = 0;
  let i = MARCH_HEAD;
  for (let k = 0; k < count; k++) {
    const row = m[i];
    const leaves = m[i + 1] === GONE;
    const face = leaves ? -1 : m[i + 1];
    const flags = m[i + 2];
    const delay = m[i + 3];
    const pace = m[i + 4];
    const n = m[i + 5];
    const pts = i + ACTOR_HEAD;
    const run = Math.max(0, t - delay) * speed * pace;
    let left = run;
    let x = m[pts];
    let y = m[pts + 1];
    let facing = face >= 0 ? face : 0;
    let walking = 0;
    let length = 0;
    for (let s = 0; s < n - 1; s++) {
      const ax = m[pts + s * 2];
      const ay = m[pts + s * 2 + 1];
      const bx = m[pts + s * 2 + 2];
      const by = m[pts + s * 2 + 3];
      const seg = Math.hypot(bx - ax, by - ay);
      length += seg;
      if (left <= 0) continue;
      if (face < 4) facing = facingOf(bx - ax, by - ay, facing);
      if (left >= seg) {
        x = bx;
        y = by;
        left -= seg;
      } else {
        x = ax + ((bx - ax) * left) / seg;
        y = ay + ((by - ay) * left) / seg;
        left = 0;
        walking = 1;
      }
    }
    const there = run >= length;
    if (walking === 0 && face >= 0) facing = face;
    // laughing while they wait: a shake and a hop (as an NPC leaving does, world-view.tsx)
    const laughing = (flags & MF_LAUGH) !== 0 && t < delay ? 1 : 0;
    if (laughing === 1) {
      const beat = Math.floor(t * 12);
      x += beat % 2 === 1 ? 1 : -1;
      y -= beat % 3 === 0 ? 2 : 0;
    }
    longest = Math.max(longest, delay * speed + length / pace);
    const gone = there && (leaves || ((flags & MF_VANISH) !== 0 && length > 0)) ? 1 : 0;
    poses.push([row, facing, walkFrame(run, walking === 1), x, y, walking, flags & MF_SNOT, gone, laughing]);
    i = pts + n * 2;
  }
  return { poses, done: t * speed >= longest + HOLD * speed };
}

/**
 * Where anyone who vanishes got to the end of their path between `t0` and `t1` seconds in: [x, y, ...], for a
 * puff there.
 */
export function marchVanished(m: number[], t0: number, t1: number): number[] {
  'worklet';
  const speed = m[1];
  const count = m[2];
  const out: number[] = [];
  let i = MARCH_HEAD;
  for (let k = 0; k < count; k++) {
    const flags = m[i + 2];
    const delay = m[i + 3];
    const pace = m[i + 4];
    const n = m[i + 5];
    const pts = i + ACTOR_HEAD;
    if ((flags & MF_VANISH) !== 0 && n > 1) {
      let length = 0;
      for (let s = 0; s < n - 1; s++)
        length += Math.hypot(m[pts + s * 2 + 2] - m[pts + s * 2], m[pts + s * 2 + 3] - m[pts + s * 2 + 1]);
      const at = delay + length / (speed * pace);
      if (t0 < at && at <= t1) out.push(m[pts + (n - 1) * 2], m[pts + (n - 1) * 2 + 1]);
    }
    i = pts + n * 2;
  }
  return out;
}

/**
 * Someone flickering out (Felix fading into nothing): whether they're drawn on this frame, `p` of the way through
 * (0 to 1). Every frame at first, then three in four, two, one, none.
 */
export function fadeShown(p: number, frame: number): boolean {
  'worklet';
  return (frame % 4) + 1 > Math.floor(Math.max(0, p) * 5);
}

/**
 * A walk for a march from one tile to another round the walls (`solid`, y * width + x), the fewest steps, as the
 * corners only: straight lines between them. Nowhere to get through: straight there, through whatever's in the way.
 */
export function walkPath(
  solid: readonly number[],
  width: number,
  height: number,
  from: [number, number],
  to: [number, number],
): [number, number][] {
  const key = (x: number, y: number) => y * width + x;
  const came = new Map<number, number>([[key(...from), -1]]);
  const queue: [number, number][] = [from];
  const steps = [
    [0, 1],
    [0, -1],
    [-1, 0],
    [1, 0],
  ];
  while (queue.length > 0 && !came.has(key(...to))) {
    const [x, y] = queue.shift()!;
    for (const [dx, dy] of steps) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height || came.has(key(nx, ny))) continue;
      if (solid[key(nx, ny)] && !(nx === to[0] && ny === to[1])) continue;
      came.set(key(nx, ny), key(x, y));
      queue.push([nx, ny]);
    }
  }
  if (!came.has(key(...to))) return from[0] === to[0] && from[1] === to[1] ? [from] : [from, to];
  const tiles: [number, number][] = [];
  for (let k = key(...to); k !== -1; k = came.get(k)!) tiles.unshift([k % width, Math.floor(k / width)]);
  // keep the corners
  return tiles.filter((t, i) => {
    if (i === 0 || i === tiles.length - 1) return true;
    const [px, py] = tiles[i - 1];
    const [nx, ny] = tiles[i + 1];
    return !(px === nx || py === ny);
  });
}
