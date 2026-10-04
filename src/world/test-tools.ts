import { DIMENSIONS, emptyDimensionRecord, xpToNextLevel, type Dimension } from '@/game';

import type { XpTotals } from './progress';

// Tools for test builds only, to play the whole story through on a simulator (Oct 4, 2026). On only
// when the build sets EXPO_PUBLIC_TEST_TOOLS=1, which only the EAS "simulator" profile does: never in
// TestFlight or the App Store. Nothing here touches real habits or the save.

export const TEST_TOOLS = process.env.EXPO_PUBLIC_TEST_TOOLS === '1';

/** "Test levels" puts every Path at this level, for this session only. */
export const TEST_LEVEL = 20;

/** XP for a Path at `level`, from where everyone starts. */
function xpFor(level: number): number {
  let xp = 0;
  for (let l = 5; l < level; l++) xp += xpToNextLevel(l);
  return xp;
}

/** Every Path at TEST_LEVEL, as if the habits were done (they aren't). */
export function testXp(flags: string[]): XpTotals {
  const each = xpFor(TEST_LEVEL);
  const byPath = emptyDimensionRecord(each) as Record<Dimension, number>;
  return { total: each * DIMENSIONS.length, byPath, flags };
}
