import { walkFrame } from './engine';
import { TILE } from './maps';

// A march: a short scripted walk, a cutscene in the room itself (author, Oct 3, 2026: the guards
// march you down to the cell; Brannoc bolts through the bars). Everyone in it walks their own path
// at one speed, starting together, and stops at the end of it.
//
// For the UI thread it's flat numbers: [t, speed, count, linger, arrived, ...each actor], where an actor is
// [row, face at the end (-1: the way they last walked), point count, x0, y0, x1, y1, ...] in
// art pixels at the feet. Row -1 is you: the march moves the lead itself. A lingering march
// keeps everyone standing where they arrived (a guard waiting while someone talks) until the
// next march replaces it; `arrived` says its end has been reported.

/** The most actors a march draws, besides you. */
export const MARCH_ACTORS = 4;
/** Numbers before the first actor: t, speed, count, linger, arrived. */
export const MARCH_HEAD = 5;
/** A beat at the end, everyone standing, before the march is over. */
const HOLD = 0.35;

export type Actor = {
  /** The walker row in the sheet; -1 for you. */
  row: number;
  /** Tiles to walk through, in order; one tile to stand still. */
  path: [number, number][];
  /**
   * 0 down, 1 up, 2 left, 3 right: which way to face once there. 4: out cold, flat on their back the whole way
   * (Brannoc); 5: the same, carried, held up off the ground.
   */
  face?: number;
};

const feet = ([x, y]: [number, number]) => [x * TILE + TILE / 2, y * TILE + TILE - 2];

/** A new march, in tiles per second; `linger`: everyone stays put once there, until the next march. */
export function newMarch(actors: Actor[], tilesPerSecond = 3, linger = false): number[] {
  const out = [0, tilesPerSecond * TILE, actors.length, linger ? 1 : 0, 0];
  for (const a of actors) out.push(a.row, a.face ?? -1, a.path.length, ...a.path.flatMap(feet));
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
 * Where everyone is, `t` seconds in: one [row, facing, frame, x, y, walking (0/1)] each, and whether
 * it's over (everyone arrived, and the beat after).
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
    const face = m[i + 1];
    const n = m[i + 2];
    const pts = i + 3;
    let left = t * speed;
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
    if (walking === 0 && face >= 0) facing = face;
    longest = Math.max(longest, length);
    poses.push([row, facing, walkFrame(t * speed, walking === 1), x, y, walking]);
    i = pts + n * 2;
  }
  return { poses, done: t * speed >= longest + HOLD * speed };
}
