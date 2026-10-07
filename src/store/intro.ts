import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** Whether this phone has seen the opening intro. It plays once; Settings can play it again. */
export const useIntroSeen = create<{ seen: boolean }>()(
  persist((): { seen: boolean } => ({ seen: false }), {
    name: 'eight-paths-intro',
    storage: createJSONStorage(() => AsyncStorage),
  }),
);

export function useIntroHydrated(): boolean {
  return useSyncExternalStore(
    (onChange) => useIntroSeen.persist.onFinishHydration(onChange),
    () => useIntroSeen.persist.hasHydrated(),
  );
}
