import { useMemo } from 'react';

import { premiumEnabled } from '@/premium/config';
import { usePremium } from '@/premium/store';
import { useSession } from '@/store/session';
import { useXpTotals } from '@/store/hooks';

import type { XpTotals } from './progress';
import { useWorldStore } from './store';
import { TEST_TOOLS, testXp } from './test-tools';

/** Everything the World's gates check: habit XP, what's been done in the World, and Premium (no level barriers). */
export function useWorldProgress(): XpTotals {
  const xp = useXpTotals();
  const flags = useWorldStore((s) => s.flags);
  // test builds only: every Path at Lv 20, for walking the story through (test-tools.ts)
  const testing = useSession((s) => TEST_TOOLS && s.testLevels);
  const unlocked = usePremium((s) => premiumEnabled && s.premium);
  return useMemo(() => (testing ? testXp(flags) : { ...xp, flags, unlocked }), [xp, flags, testing, unlocked]);
}
