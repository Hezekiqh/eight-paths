import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { fetchMyStanding } from './api';
import { useSocial } from './store';

export type Standing = { rank: number | null; value: number | null };

/** Collection value and rank, refreshed on every visit: they shift as other players wake heroes. */
export function useStanding(): Standing | null {
  const profile = useSocial((s) => s.profile);
  const [standing, setStanding] = useState<Standing | null>(null);
  useFocusEffect(
    useCallback(() => {
      if (!profile) return;
      let live = true;
      fetchMyStanding()
        .then((v) => live && setStanding(v))
        .catch(() => {});
      return () => {
        live = false;
      };
    }, [profile]),
  );
  return profile ? standing : null;
}
