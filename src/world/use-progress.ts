import { useMemo } from 'react';

import { useSession } from '@/store/session';
import { useXpTotals } from '@/store/hooks';

import type { XpTotals } from './progress';
import { useWorldStore } from './store';
import { TEST_TOOLS, testXp } from './test-tools';

/** Everything the World's gates check: habit XP, and what's been done in the World. */
export function useWorldProgress(): XpTotals {
  const xp = useXpTotals();
  const flags = useWorldStore((s) => s.flags);
  // test builds only: every Path at Lv 20, for walking the story through (test-tools.ts)
  const testing = useSession((s) => TEST_TOOLS && s.testLevels);
  return useMemo(() => (testing ? testXp(flags) : { ...xp, flags }), [xp, flags, testing]);
}
