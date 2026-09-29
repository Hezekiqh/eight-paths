import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { isCharacterId, type CharacterId } from '@/story/companions';

import { addLore, cleanLore, type LoreEntry } from './lore';
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
  /** Maps the player has set foot in: the World map shows only these. */
  discovered: MapId[];
  discover: (map: MapId) => void;
  setControls: (controls: ControlScheme) => void;
  savePosition: (position: WorldPosition) => void;
  /** What characters have told the player: the World menu's lore journal. */
  heard: LoreEntry[];
  hear: (entry: LoreEntry) => void;
};

/** v2 adds the lore journal (`heard`), which starts empty. */
const SAVE_VERSION = 2;

/** Drops anything malformed from a loaded save, keeping what's good. */
function sanitize(persisted: unknown): Partial<WorldState> {
  const data = (persisted ?? {}) as Record<string, unknown>;
  const out: Partial<WorldState> = {};
  if (data.controls === 'joystick' || data.controls === 'touchpad') out.controls = data.controls;
  if (isCharacterId(data.hero)) out.hero = data.hero;
  if (Array.isArray(data.discovered)) out.discovered = data.discovered.filter(isMapId);
  if (data.heard !== undefined) out.heard = cleanLore(data.heard);
  const p = data.position as Record<string, unknown> | null | undefined;
  if (p && isMapId(p.map) && Number.isFinite(p.x) && Number.isFinite(p.y) && FACINGS.includes(p.facing as Facing)) {
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
      discovered: [],
      discover: (map) => set((s) => (s.discovered.includes(map) ? s : { discovered: [...s.discovered, map] })),
      setControls: (controls) => set({ controls }),
      savePosition: (position) => set({ position }),
      heard: [],
      hear: (entry) => set((s) => ({ heard: addLore(s.heard, entry) })),
    }),
    {
      name: 'eight-paths-world',
      version: SAVE_VERSION,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        controls: s.controls,
        position: s.position,
        hero: s.hero,
        discovered: s.discovered,
        heard: s.heard,
      }),
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
