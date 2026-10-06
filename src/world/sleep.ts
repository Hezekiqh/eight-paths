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
