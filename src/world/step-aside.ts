import { walkFrame } from './engine';

// A field move, Pokémon style: the walker steps aside and the party member the
// job needs walks out from behind them, into the spot they left, facing the job.
//
// A cameo is [row, fromX, fromY, toX, toY, asideX, asideY, facing, t]: the
// helper's walker row, where they walk from and to (art pixels, at the feet),
// how far the walker steps aside, which way everyone faces, and the time, 0 to 1.

/** How long the whole step-aside takes, in seconds. */
export const STEP_ASIDE_SECONDS = 1.1;
/** How far the helper starts behind the walker, and how far the walker steps aside, in art pixels. */
const BEHIND = 16;
const ASIDE = 14;

/** A new step-aside for a walker at (x, y) facing `facing` (0 down, 1 up, 2 left, 3 right). */
export function newCameo(row: number, x: number, y: number, facing: number): number[] {
  const fx = facing === 2 ? -1 : facing === 3 ? 1 : 0;
  const fy = facing === 1 ? -1 : facing === 0 ? 1 : 0;
  // Aside is a quarter turn from the way they face: left of a walker facing down, and so on.
  return [row, x - fx * BEHIND, y - fy * BEHIND, x, y, -fy * ASIDE, fx * ASIDE, facing, 0];
}

/**
 * Where everyone is after `dt` more seconds: [t, asideX, asideY, helperX,
 * helperY, helperFrame, helperShown]. The walker sidesteps over the first
 * third; the helper appears behind them and walks into the gap.
 */
export function cameoAt(c: number[], dt: number): number[] {
  'worklet';
  const t = Math.min(1, c[8] + dt / STEP_ASIDE_SECONDS);
  const a = Math.min(1, t / 0.35);
  const w = Math.max(0, Math.min(1, (t - 0.3) / 0.6));
  return [
    t,
    c[5] * a,
    c[6] * a,
    c[1] + (c[3] - c[1]) * w,
    c[2] + (c[4] - c[2]) * w,
    walkFrame(w * 28, w > 0 && w < 1),
    t >= 0.3 ? 1 : 0,
  ];
}
