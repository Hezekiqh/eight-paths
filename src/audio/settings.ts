import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type AudioSettings = {
  music: boolean;
  sounds: boolean;
  setMusic: (on: boolean) => void;
  setSounds: (on: boolean) => void;
};

/** Kept apart from the game save: how loud a phone is belongs to that phone. */
export const useAudioSettings = create<AudioSettings>()(
  persist(
    (set) => ({
      music: true,
      sounds: true,
      setMusic: (music) => set({ music }),
      setSounds: (sounds) => set({ sounds }),
    }),
    {
      name: 'eight-paths-audio',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ music, sounds }) => ({ music, sounds }),
    },
  ),
);
