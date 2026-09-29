import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { isCharacterId, type CharacterId } from '@/story/companions';

import { FACINGS, isMapId, type Facing, type MapId } from './maps';

export type ControlScheme = 'joystick' | 'touchpad';

/** Where the player stands, in art pixels (the point between their feet). */
export type WorldPosition = { map: MapId; x: number; y: number; facing: Facing };

type WorldState = {
  controls: ControlScheme;
  /** Null until the player first walks; they then start at the map's spawn. */
  position: WorldPosition | null;
  /** The one party member who walks the World (null: your class's companion). */
  hero: CharacterId | null;
  setHero: (hero: CharacterId) => void;
  setControls: (controls: ControlScheme) => void;
  savePosition: (position: WorldPosition) => void;
};

const SAVE_VERSION = 1;

/** Drops anything malformed from a loaded save, keeping what's good. */
function sanitize(persisted: unknown): Partial<WorldState> {
  const data = (persisted ?? {}) as Record<string, unknown>;
  const out: Partial<WorldState> = {};
  if (data.controls === 'joystick' || data.controls === 'touchpad') out.controls = data.controls;
  if (isCharacterId(data.hero)) out.hero = data.hero;
  const p = data.position as Record<string, unknown> | null | undefined;
  if (
    p &&
    isMapId(p.map) &&
    Number.isFinite(p.x) &&
    Number.isFinite(p.y) &&
    FACINGS.includes(p.facing as Facing)
  ) {
    out.position = { map: p.map, x: p.x as number, y: p.y as number, facing: p.facing as Facing };
  }
  return out;
}

/**
 * The World's own save, apart from the habit save, so nothing that happens in
 * the game can ever touch habit data.
 */
export const useWorldStore = create<WorldState>()(
  persist(
    (set) => ({
      controls: 'joystick',
      position: null,
      hero: null,
      setHero: (hero) => set({ hero }),
      setControls: (controls) => set({ controls }),
      savePosition: (position) => set({ position }),
    }),
    {
      name: 'eight-paths-world',
      version: SAVE_VERSION,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ controls: s.controls, position: s.position, hero: s.hero }),
      migrate: (persisted) => sanitize(persisted) as WorldState,
      merge: (persisted, current) => ({ ...current, ...sanitize(persisted) }),
    },
  ),
);

/** False until the World's save has loaded. */
export function useWorldHydrated(): boolean {
  return useSyncExternalStore(
    (onChange) => useWorldStore.persist.onFinishHydration(onChange),
    () => useWorldStore.persist.hasHydrated(),
  );
}
