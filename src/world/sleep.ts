/**
 * Someone fast asleep where they stand (Gary of the cells, author, Oct 6, 2026): little Zs float up off their
 * head, one after another, drifting right and growing as they go. Drawn by the World (world-view.tsx) and the
 * same way in the episodes (scripts/episode-video.mjs).
 */

/** Seconds from one Z to the next, and how long each one floats. */
export const Z_EVERY = 0.8;
export const Z_LIFE = 2.4;

/** A small Z and a big one, as [x, y] pixel cells. */
const SMALL = ['XXX', '.X.', 'XXX'];
const BIG = ['XXXX', '..X.', '.X..', 'XXXX'];
const cells = (rows: string[]) =>
  rows.flatMap((row, y) => [...row].flatMap((c, x) => (c === 'X' ? [[x, y] as [number, number]] : [])));
const SMALL_CELLS = cells(SMALL);
const BIG_CELLS = cells(BIG);

/**
 * Every pixel of the Zs over a sleeper whose feet are at (x, y), `t` seconds into the clock: [x, y] pairs.
 * Each Z rises 16 pixels from just above the head, swaying, small for its first half and big for the rest.
 */
export function sleepZs(t: number, x: number, y: number): number[][] {
  'worklet';
  const out: number[][] = [];
  const n = Math.ceil(Z_LIFE / Z_EVERY);
  const newest = Math.floor(t / Z_EVERY);
  for (let k = 0; k < n; k++) {
    const age = t - (newest - k) * Z_EVERY;
    if (age < 0 || age >= Z_LIFE) continue;
    const f = age / Z_LIFE;
    const ox = Math.round(x + 3 + f * 6 + Math.sin(age * 4) * 1.5);
    const oy = Math.round(y - 26 - f * 16);
    const glyph = f < 0.5 ? SMALL_CELLS : BIG_CELLS;
    for (let i = 0; i < glyph.length; i++) out.push([ox + glyph[i][0], oy + glyph[i][1]]);
  }
  return out;
}

/** How long a snot bubble takes to swell and shrink back. */
export const BUBBLE_EVERY = 1.6;

/**
 * A snot bubble at the nose of a sleeper whose feet are at (x, y) (Brannoc, out cold in the Kaloseum): it swells
 * from nothing to a big round bubble and shrinks again, over and over. Its pixels, as [x, y] pairs, and its
 * highlight, a pixel of shine on the upper left.
 */
export function snotBubble(t: number, x: number, y: number): { cells: number[][]; shine: number[] | null } {
  'worklet';
  const k = (t % BUBBLE_EVERY) / BUBBLE_EVERY;
  const r = 0.5 + 3 * Math.sin(k * Math.PI);
  // just off the nose, on the right, growing outwards
  const cx = x + 2 + r;
  const cy = y - 12;
  const cells: number[][] = [];
  const R = Math.ceil(r);
  for (let dy = -R; dy <= R; dy++)
    for (let dx = -R; dx <= R; dx++) if (dx * dx + dy * dy <= r * r) cells.push([Math.round(cx + dx), cy + dy]);
  return { cells, shine: r > 1.5 ? [Math.round(cx - r / 2), cy - Math.round(r / 2)] : null };
}
