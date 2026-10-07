import { TILE } from './maps';

// Brannoc's Super Super Swing (author, Episode 13; play-test, Oct 7, 2026): twenty strikes in, Brannoc gets up
// asleep, a snot bubble at his nose, sleepwalks to wherever the warden stands, and swings. The warden goes up, up,
// over the banners and out of the Kaloseum, and leaves a hole in them. The scene's order is in world.tsx; the
// pieces here are pure, so they can be tested, and the UI thread can run the ones marked 'worklet'.

/** Set with the hole's x (art pixels) once the warden has gone through the banners: `warden-hole:<x>`. */
export const WARDEN_HOLE = 'warden-hole:';
/** How far from the warden Brannoc stops to swing, in tiles (the warden is two tiles wide). */
export const STAND_OFF = 1.75;
/**
 * The swing, from when it starts (author, Oct 7, 2026: "a short wind-up"): he raises the blade up and back over his
 * shoulder for SWING_WINDUP, sweeps it over and down for SWING_SWEEP, and it lands at SWING_STRIKE; its trail fades
 * for SWING_TRAIL after.
 */
export const SWING_WINDUP = 0.4;
export const SWING_SWEEP = 0.18;
export const SWING_STRIKE = SWING_WINDUP + SWING_SWEEP;
export const SWING_TRAIL = 0.5;
/** The blade's angles (radians, facing right; mirrored facing left): at rest, raised back, and where it ends. */
export const BLADE_REST = -0.5;
export const BLADE_RAISED = -2.4;
export const BLADE_END = 0.9;
/** How long the swing waits after "BRANNOC SUPER SUPER SWING!" starts typing, so the blow lands on its last word. */
export const SWING_DELAY = 0.25;
/** The white flash on the strike, and how bright it gets; the impact star at the blade's tip. */
export const FLASH_TIME = 0.4;
export const FLASH_PEAK = 0.7;
export const IMPACT_TIME = 0.3;
/** How long the warden takes to fly up through the banners and out of sight, and how far through it he hits them. */
export const FLY_TIME = 1.8;
export const BREACH_AT = 0.55;
/** After he's gone, the camera holds on the hole for a beat before it comes back down. */
export const HOLE_HOLD = 1.4;
/** Where the warden's flight ends: above the top of the map, out of the Kaloseum. */
export const FLY_TOP = -64;
/** How fast Brannoc sleepwalks, in tiles per second (before the game's speed): a slow, swaying shuffle. */
export const SLEEPWALK_PACE = 2.2;

/**
 * The scene on the UI thread (sim.swing): [seconds since the swing started, Brannoc's walker row, his feet x, y,
 * his facing, the warden's feet x, y, the middle of the banner he goes through x, y]. Empty: no swing.
 */
export const SW_T = 0;
export const SW_ROW = 1;
export const SW_BX = 2;
export const SW_BY = 3;
export const SW_FACE = 4;
export const SW_WX = 5;
export const SW_WY = 6;
export const SW_HX = 7;
export const SW_HY = 8;

/** The Kaloseum's banners (the-pit.png, scripts/world-art.mjs): each pole's top in art pixels; the cloth is 8x13. */
export const PIT_BANNERS: [number, number][] = [
  [79, 47],
  [138, 23],
  [374, 23],
  [433, 47],
];
/** The middle of a banner's cloth, from its pole's top. */
export const clothOf = ([x, y]: [number, number]): [number, number] => [x + 5, y + 6];

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
 * The banner the warden goes through: the one nearest straight up from where he stood (its pole's top), so it
 * reads as torn banners, not a hole in the crowd.
 */
export function bannerFor(wx: number, wy: number, banners: [number, number][] = PIT_BANNERS): [number, number] {
  let best = banners[0];
  let score = Infinity;
  for (const b of banners) {
    const [cx, cy] = clothOf(b);
    // mostly sideways distance: he goes up
    const d = Math.abs(cx - wx) * 2 + Math.abs(cy - wy) * 0.5;
    if (d < score) {
      score = d;
      best = b;
    }
  }
  return best;
}

/** The hole in the banners, if the warden's been through them: the torn banner's pole top, in art pixels. */
export function holeAt(flags: readonly string[]): [number, number] | null {
  const f = flags.find((x) => x.startsWith(WARDEN_HOLE));
  if (!f) return null;
  const [x, y] = f.slice(WARDEN_HOLE.length).split(',').map(Number);
  return Number.isFinite(x) && Number.isFinite(y) ? [x, y] : null;
}

/** How far a walker's feet are below the middle of their body, at `size`. */
const MID = 10;

/**
 * The warden in flight, `t` seconds after the strike: [x, y (his feet), size, facing]. From where he stood (wx, wy)
 * he's hurled up and across to the banner's cloth at (hx, hy), through it at BREACH_AT, and on up out of the top of
 * the map, shrinking as he goes (away into the sky) and tumbling, slowly enough to see it's a man: his facing turns
 * round, front, side, back, side. Past FLY_TIME he's gone (size 0).
 */
export function wardenFlight(t: number, wx: number, wy: number, hx: number, hy: number): number[] {
  'worklet';
  if (t < 0) return [wx, wy, 2, 0];
  if (t >= FLY_TIME) return [hx, FLY_TOP, 0, 0];
  const f = t / FLY_TIME;
  let cx: number;
  let cy: number;
  let size: number;
  if (f < BREACH_AT) {
    const k = f / BREACH_AT;
    const e = 1 - (1 - k) * (1 - k);
    cx = wx + (hx - wx) * e;
    cy = wy - MID * 2 + (hy - (wy - MID * 2)) * e;
    size = 2 - 0.8 * k;
  } else {
    const k = (f - BREACH_AT) / (1 - BREACH_AT);
    cx = hx;
    cy = hy + (FLY_TOP - hy) * k * k;
    size = 1.2 - 0.6 * k;
  }
  const facing = [0, 3, 1, 2][Math.floor(t * 6) % 4];
  return [cx, cy + MID * size, size, facing];
}

/**
 * The swing's blade, `t` seconds after it starts: [angle (radians, facing right), how much of the arc is drawn
 * (0 to 1), the trail's opacity]. Raised back through the wind-up (a little shake at the top), swept over and down,
 * then the trail fades.
 */
export function bladeAt(t: number): number[] {
  'worklet';
  if (t < SWING_WINDUP) {
    const k = t / SWING_WINDUP;
    const e = 1 - (1 - k) * (1 - k);
    const shake = k > 0.6 ? Math.sin(t * 90) * 0.06 : 0;
    return [BLADE_REST + (BLADE_RAISED - BLADE_REST) * e + shake, 0, 0];
  }
  if (t < SWING_STRIKE) {
    const k = (t - SWING_WINDUP) / SWING_SWEEP;
    return [BLADE_RAISED + (BLADE_END - BLADE_RAISED) * k, k, 0.9];
  }
  const k = Math.min(1, (t - SWING_STRIKE) / SWING_TRAIL);
  return [BLADE_END, 1, 0.9 * (1 - k)];
}
