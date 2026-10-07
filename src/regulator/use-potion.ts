import { router, usePathname } from 'expo-router';
import { useEffect } from 'react';

import { useSession } from '@/store/session';
import { useTour } from '@/tutorial/tour';

import { useHp, useRegulatorActive } from './hooks';
import { useRegulator } from './store';

/** Where the Keeper may step in: the tabs (not the World's game) and the Regulator's own screens. */
const QUIET_ENOUGH = new Set([
  '/',
  '/journey',
  '/regulator',
  '/regulator/slip-calendar',
  '/social-tab',
  '/collection',
]);

/**
 * When the bar has fallen below 20, the potion has already lifted it to 50
 * (see simulateHp); this has the Keeper hand it over, once per potion, as
 * soon as the player is on a quiet screen.
 */
export function usePotionWatch(today: string) {
  const active = useRegulatorActive();
  const { potions } = useHp(today);
  const seen = useRegulator((s) => s.potionsSeen);
  const pathname = usePathname();
  const touring = useTour((s) => s.running);
  const introDone = useSession((s) => s.introDone);

  useEffect(() => {
    if (!active || potions <= seen || touring || !introDone || !QUIET_ENOUGH.has(pathname)) return;
    useRegulator.getState().setPotionsSeen(potions);
    router.push('/regulator-potion');
  }, [active, potions, seen, touring, introDone, pathname]);
}
