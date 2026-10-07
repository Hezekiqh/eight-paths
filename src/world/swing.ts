import { TILE } from './maps';

// Brannoc's Super Super Swing (author, Episode 13; play-test, Oct 7, 2026): twenty strikes in, Brannoc gets up
// asleep, a snot bubble at his nose, sleepwalks to wherever the warden stands, and swings. The warden goes up, up,
// over the banners and out of the Kaloseum, and leaves a hole in them. The scene's order is in world.tsx; the
// pieces here are pure, so they can be tested, and the UI thread can run the ones marked 'worklet'.

/** Set with the hole's x (art pixels) once the warden has gone through the banners: `warden-hole:<x>`. */
export const WARDEN_HOLE = 'warden-hole:';
/** How far from the warden Brannoc stops to swing, in tiles (the warden is two tiles wide). */
export const STAND_OFF = 1.75;
/** The swing, from when it starts: the blade sweeps for SWING_ARC, and lands at SWING_STRIKE. */
export const SWING_ARC = 0.35;
export const SWING_STRIKE = 0.15;
/** How long after "BRANNOC SUPER SUPER SWING!" starts typing the swing starts, so the blow lands on its last word. */
export const SWING_DELAY = 0.45;
/** The white flash on the strike, and how long the warden takes to fly up and out of sight. */
export const FLASH_TIME = 0.5;
export const FLY_TIME = 1.6;
/** How far through his flight he goes through the banners (the hole shows from then on). */
export const BREACH_AT = 0.7;
/** Where the warden's flight ends: above the top of the map, out of the Kaloseum. */
export const FLY_TOP = -48;
/** How fast Brannoc sleepwalks, in tiles per second (before the game's speed): a slow, swaying shuffle. */
export const SLEEPWALK_PACE = 2.2;

/**
 * The scene on the UI thread (sim.swing): [seconds since the swing started, Brannoc's walker row, his feet x, y,
 * his facing, the warden's feet x, y, the hole's x]. Empty: no swing.
 */
export const SW_T = 0;
export const SW_ROW = 1;
export const SW_BX = 2;
export const SW_BY = 3;
export const SW_FACE = 4;
export const SW_WX = 5;
export const SW_WY = 6;
export const SW_HX = 7;

/** A tile from an NPC's feet (art pixels), fractional. */
const tileOf = (x: number, y: number): [number, number] => [(x - TILE / 2) / TILE, (y - (TILE - 2)) / TILE];

/**
 * Brannoc's sleepwalk from `from` (a tile) to beside the warden, whose feet are at `warden` (art pixels): he stops
 * on the near side (or the far side, or below him, if the near one is walled), facing him, swaying left and right
 * of the straight line as he goes. `free` says whether a tile can be stood on. The face is march.ts's (2 left, 3
 * right, 1 up).
 */
export function sleepwalkTo(
  from: [number, number],
  warden: [number, number],
  free: (x: number, y: number) => boolean = () => true,
): { path: [number, number][]; face: number; end: [number, number] } {
  const [wx, wy] = tileOf(...warden);
  const side = from[0] <= wx ? -1 : 1;
  const spots: [number, number, number][] = [
    [wx + side * STAND_OFF, wy, side < 0 ? 3 : 2],
    [wx - side * STAND_OFF, wy, side < 0 ? 2 : 3],
    [wx, wy + STAND_OFF, 1],
  ];
  const [ex, ey, face] = spots.find(([x, y]) => free(Math.round(x), Math.round(y))) ?? spots[0];
  // sway: a third of the way along, half a tile one side of the line; two thirds, half a tile the other
  const dx = ex - from[0];
  const dy = ey - from[1];
  const len = Math.hypot(dx, dy) || 1;
  const px = (-dy / len) * 0.5;
  const py = (dx / len) * 0.5;
  const at = (f: number, s: number): [number, number] => [from[0] + dx * f + px * s, from[1] + dy * f + py * s];
  const path: [number, number][] = len < 2 ? [from, [ex, ey]] : [from, at(1 / 3, 1), at(2 / 3, -1), [ex, ey]];
  return { path, face, end: [ex, ey] };
}

/**
 * Where the warden goes through the banners, in art pixels across a map `mapW` wide: straight up from where he
 * stood, kept clear of Barnaby's box in the middle of the top of the stands and of the map's edges.
 */
export function breachX(wx: number, mapW: number): number {
  const mid = mapW / 2;
  const box = 64;
  let x = Math.min(Math.max(wx, 40), mapW - 40);
  if (Math.abs(x - mid) < box) x = x < mid ? mid - box : mid + box;
  return Math.round(x);
}

/** The hole in the banners, if the warden's been through them: its x in art pixels. */
export function holeAt(flags: readonly string[]): number | null {
  const f = flags.find((x) => x.startsWith(WARDEN_HOLE));
  if (!f) return null;
  const x = Number(f.slice(WARDEN_HOLE.length));
  return Number.isFinite(x) ? x : null;
}

/**
 * The warden in flight, `t` seconds after the strike: [x, y, size, facing], from his feet at (wx, wy) up to the
 * hole at hx and out over the top. He shoots up fast and slows, shrinks as he goes (away into the sky), and
 * tumbles: his facing turns round and round. Past FLY_TIME he's gone (size 0).
 */
export function wardenFlight(t: number, wx: number, wy: number, hx: number): number[] {
  'worklet';
  if (t < 0) return [wx, wy, 2, 0];
  if (t >= FLY_TIME) return [hx, FLY_TOP, 0, 0];
  const f = t / FLY_TIME;
  const up = 1 - (1 - f) * (1 - f);
  const x = wx + (hx - wx) * f;
  const y = wy + (FLY_TOP - wy) * up;
  const size = 2 - 1.4 * f;
  const facing = [0, 3, 1, 2][Math.floor(t * 14) % 4];
  return [x, y, size, facing];
}
