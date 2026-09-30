import { useMemo } from 'react';

import { useXpTotals } from '@/store/hooks';

import type { XpTotals } from './progress';
import { useWorldStore } from './store';

/** Everything the World's gates check: habit XP, and what's been done in the World. */
export function useWorldProgress(): XpTotals {
  const xp = useXpTotals();
  const flags = useWorldStore((s) => s.flags);
  return useMemo(() => ({ ...xp, flags }), [xp, flags]);
}
