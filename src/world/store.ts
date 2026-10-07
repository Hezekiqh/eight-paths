import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { isCharacterId, type CharacterId } from '@/story/companions';

import { addLore, cleanLore, type LoreEntry } from './lore';
import { FACINGS, isMapId, type Facing, type MapId } from './maps';
import type { Deed } from './honor';
import { isGameSpeed, type GameSpeed } from './speed';

export type ControlScheme = 'joystick' | 'touchpad';

/** Where the player stands, in art pixels (the point between their feet). */
export type WorldPosition = { map: MapId; x: number; y: number; facing: Facing };

/** Where the player rested by a candle, in tiles: one per place. */
export type CandleSpot = { map: MapId; x: number; y: number; facing: Facing };

type WorldState = {
  controls: ControlScheme;
  /** How fast dialogue types and cutscenes play (speed.ts). */
  speed: GameSpeed;
  setSpeed: (speed: GameSpeed) => void;
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
  /** Things done in the World that stay done: a winch pulled, a wall broken, a boss won over. */
  flags: string[];
  setFlag: (flag: string) => void;
  /** Things the player has run into and couldn't do yet (see notices.ts): the pause screen lists them. */
  noticed: string[];
  notice: (id: string) => void;
  /** Candles rested at, one spot per place, and the place of the last: you wake there if you fall. */
  candles: CandleSpot[];
  lastCandle: MapId | null;
  rest: (spot: CandleSpot) => void;
  /** The day (YYYY-MM-DD) Moss last loosed his Arrow Barrage: once a day. */
  barrageDay: string | null;
  useBarrage: (day: string) => void;
  /** Special moves used today, by the whole party (specials.ts): the day (YYYY-MM-DD) and how many. */
  specials: { day: string; used: number } | null;
  useSpecial: (day: string) => void;
  /** Kind and mean choices, each once (honor.ts). Part of this run of the story: a restart clears it. */
  deeds: Deed[];
  doDeed: (deed: Deed) => void;
  /** Hidden memories seen (memories.ts ids), oldest first. Yours for good: a restart of the story keeps them. */
  memories: string[];
  remember: (id: string) => void;
  /** Starts the Other World over from the Archive floor. Keeps the controls, the speed and who walks; never touches habits. */
  restart: () => void;
};

/** A fresh World save: everything the game remembers, before any of it happened. */
export const FRESH_WORLD = {
  position: null,
  discovered: [],
  heard: [],
  flags: [],
  noticed: [],
  candles: [],
  lastCandle: null,
  barrageDay: null,
  deeds: [],
} satisfies Partial<WorldState>;

/**
 * v2 adds the lore journal (`heard`); v3 adds story `flags`; v4 what's been `noticed`; v5 `candles`;
 * v6 `barrageDay`; v7 `specials`; v8 `deeds`; v9 `memories`. All start empty. v10 adds `speed` (normal).
 */
const SAVE_VERSION = 10;

function isSpot(value: unknown): value is CandleSpot {
  const v = value as Record<string, unknown> | null;
  return (
    !!v && isMapId(v.map) && Number.isInteger(v.x) && Number.isInteger(v.y) && FACINGS.includes(v.facing as Facing)
  );
}

/** Drops anything malformed from a loaded save, keeping what's good. */
function sanitize(persisted: unknown): Partial<WorldState> {
  const data = (persisted ?? {}) as Record<string, unknown>;
  const out: Partial<WorldState> = {};
  if (data.controls === 'joystick' || data.controls === 'touchpad') out.controls = data.controls;
  if (isGameSpeed(data.speed)) out.speed = data.speed;
  if (isCharacterId(data.hero)) out.hero = data.hero;
  if (Array.isArray(data.discovered)) out.discovered = data.discovered.filter(isMapId);
  if (data.heard !== undefined) out.heard = cleanLore(data.heard);
  if (Array.isArray(data.flags)) out.flags = data.flags.filter((f): f is string => typeof f === 'string');
  if (Array.isArray(data.noticed)) out.noticed = data.noticed.filter((n): n is string => typeof n === 'string');
  if (Array.isArray(data.candles)) out.candles = data.candles.filter(isSpot);
  if (isMapId(data.lastCandle) && out.candles?.some((c) => c.map === data.lastCandle)) out.lastCandle = data.lastCandle;
  if (typeof data.barrageDay === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.barrageDay))
    out.barrageDay = data.barrageDay;
  const sp = data.specials as { day?: unknown; used?: unknown } | null | undefined;
  if (sp && typeof sp.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(sp.day) && Number.isInteger(sp.used))
    out.specials = { day: sp.day, used: Math.max(0, sp.used as number) };
  if (Array.isArray(data.memories))
    out.memories = [...new Set(data.memories.filter((m): m is string => typeof m === 'string'))];
  if (Array.isArray(data.deeds))
    out.deeds = data.deeds.filter(
      (d): d is Deed =>
        !!d && typeof (d as Deed).id === 'string' && ((d as Deed).kind === 'good' || (d as Deed).kind === 'bad'),
    );
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
      speed: 'normal',
      setSpeed: (speed) => set({ speed }),
      position: null,
      hero: null,
      setHero: (hero) => set({ hero }),
      discovered: [],
      discover: (map) => set((s) => (s.discovered.includes(map) ? s : { discovered: [...s.discovered, map] })),
      setControls: (controls) => set({ controls }),
      savePosition: (position) => set({ position }),
      heard: [],
      hear: (entry) => set((s) => ({ heard: addLore(s.heard, entry) })),
      flags: [],
      setFlag: (flag) => set((s) => (s.flags.includes(flag) ? s : { flags: [...s.flags, flag] })),
      noticed: [],
      notice: (id) => set((s) => (s.noticed.includes(id) ? s : { noticed: [...s.noticed, id] })),
      candles: [],
      lastCandle: null,
      rest: (spot) =>
        set((s) => ({ candles: [...s.candles.filter((c) => c.map !== spot.map), spot], lastCandle: spot.map })),
      barrageDay: null,
      useBarrage: (day) => set({ barrageDay: day }),
      // kept through a restart of the story (not in FRESH_WORLD): today's are today's
      specials: null,
      useSpecial: (day) => set((s) => ({ specials: { day, used: s.specials?.day === day ? s.specials.used + 1 : 1 } })),
      deeds: [],
      doDeed: (deed) => set((s) => (s.deeds.some((d) => d.id === deed.id) ? s : { deeds: [...s.deeds, deed] })),
      // kept through a restart too: what you remember stays remembered
      memories: [],
      remember: (id) => set((s) => (s.memories.includes(id) ? s : { memories: [...s.memories, id] })),
      restart: () => set(FRESH_WORLD),
    }),
    {
      name: 'eight-paths-world',
      version: SAVE_VERSION,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        controls: s.controls,
        speed: s.speed,
        position: s.position,
        hero: s.hero,
        discovered: s.discovered,
        heard: s.heard,
        flags: s.flags,
        noticed: s.noticed,
        candles: s.candles,
        lastCandle: s.lastCandle,
        barrageDay: s.barrageDay,
        specials: s.specials,
        memories: s.memories,
        deeds: s.deeds,
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
