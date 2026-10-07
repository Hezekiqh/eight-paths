/**
 * Everyone standing about breathes (author, Oct 5, 2026): nothing aggressive, just a one-pixel dip of the
 * head and shoulders now and then, so a room full of people looks alive. Whoever's talking breathes a
 * little quicker. Never the hero (or the party): this is for the people around you.
 * scripts/episode-video.mjs draws the same, so the episodes look like the game.
 */

/** Rows of the 16×24 walker frame above this one dip; the rest (legs and feet) stay planted. */
export const IDLE_SPLIT = 13;
/** Seconds for one breath, standing and talking. */
const CALM = 1.8;
const TALKING = 0.6;

/**
 * How far someone's head and shoulders sit down right now: 0 or 1 art pixel. `who` keeps people out of
 * step with each other (their order on the map will do).
 */
export function idleDip(t: number, who: number, talking: boolean): number {
  'worklet';
  const period = talking ? TALKING : CALM;
  const phase = (t / period + who * 0.37) % 1;
  return phase < 0.45 ? 1 : 0;
}
