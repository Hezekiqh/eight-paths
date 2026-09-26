import { addDays } from './dates';
import { emptyDimensionRecord, xpByDimension } from './xp';
import { DIMENSIONS, type Completion, type Dimension } from './types';

export type RadarFilter = 'week' | 'month' | 'all';

export const WINDOW_DAYS: Record<Exclude<RadarFilter, 'all'>, number> = { week: 7, month: 30 };
export const MIN_OUTER_RING_XP: Record<Exclude<RadarFilter, 'all'>, number> = { week: 70, month: 300 };

export type RadarData = {
  /** 0–1 per dimension, where 1 touches the outer ring. */
  current: Record<Dimension, number>;
  /** Previous window, same scale; null for all-time. */
  ghost: Record<Dimension, number> | null;
  /** XP represented by the outer ring; null for all-time (shares, not amounts). */
  outerRingXp: number | null;
  /** Raw XP per dimension in the current window. */
  xp: Record<Dimension, number>;
};

function inWindow(completions: Completion[], start: string, end: string) {
  return completions.filter((c) => c.date >= start && c.date <= end);
}

function normalise(xp: Record<Dimension, number>, max: number) {
  const out = emptyDimensionRecord(0);
  for (const d of DIMENSIONS) out[d] = max > 0 ? Math.min(1, xp[d] / max) : 0;
  return out;
}

/**
 * Week and Month are rolling windows ending today, drawn against the previous
 * window of the same length. All-time shows each dimension's share of XP,
 * scaled so the largest share touches the ring; with no XP it's an even octagon.
 */
export function radarData(completions: Completion[], filter: RadarFilter, today: string): RadarData {
  if (filter === 'all') {
    const xp = xpByDimension(completions);
    const top = Math.max(...DIMENSIONS.map((d) => xp[d]));
    return {
      current: top === 0 ? emptyDimensionRecord(1) : normalise(xp, top),
      ghost: null,
      outerRingXp: null,
      xp,
    };
  }

  const days = WINDOW_DAYS[filter];
  const start = addDays(today, -(days - 1));
  const prevEnd = addDays(start, -1);
  const prevStart = addDays(prevEnd, -(days - 1));

  const xp = xpByDimension(inWindow(completions, start, today));
  const prevXp = xpByDimension(inWindow(completions, prevStart, prevEnd));
  const outerRingXp = Math.max(
    MIN_OUTER_RING_XP[filter],
    ...DIMENSIONS.map((d) => xp[d]),
    ...DIMENSIONS.map((d) => prevXp[d]),
  );

  return {
    current: normalise(xp, outerRingXp),
    ghost: normalise(prevXp, outerRingXp),
    outerRingXp,
    xp,
  };
}
