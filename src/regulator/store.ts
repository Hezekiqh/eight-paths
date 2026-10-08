import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  BUILT_IN_STIMULI,
  MAX_COUNT,
  clampSeverity,
  type DayReport,
  type RegulatorMode,
  type Stimulus,
} from '@/game/regulator';

type RegulatorState = {
  /** Switched on in Settings. Off by default. */
  enabled: boolean;
  /** Has been through the Keeper's introduction. */
  onboarded: boolean;
  mode: RegulatorMode;
  /** The super stimuli being tracked, by id (built-in or custom). */
  selected: string[];
  /** Ones the player named themselves. */
  custom: Stimulus[];
  /** The first day a check-in can be about (the day before switching on). */
  start: string | null;
  /** The moment the bar started counting, in milliseconds. */
  startAt: number | null;
  /** Morning answers, by the day they're about. */
  reports: Record<string, DayReport>;
  /** When each day was first answered: its drain lands then. */
  reportedAt: Record<string, number>;
  /** Potions the Keeper has already handed over (and said so). */
  potionsSeen: number;

  setEnabled: (on: boolean) => void;
  setMode: (mode: RegulatorMode) => void;
  setSelected: (ids: string[]) => void;
  addCustom: (name: string, severity: number) => Stimulus;
  removeCustom: (id: string) => void;
  /** Ends the introduction: switched on, counting from `start`. */
  finishOnboarding: (start: string) => void;
  report: (date: string, report: DayReport) => void;
  setPotionsSeen: (n: number) => void;
  /** Erases everything the Regulator holds, back to off. */
  reset: () => void;
};

const EMPTY = {
  enabled: false,
  onboarded: false,
  mode: 'easy' as RegulatorMode,
  selected: [] as string[],
  custom: [] as Stimulus[],
  start: null as string | null,
  startAt: null as number | null,
  reports: {} as Record<string, DayReport>,
  reportedAt: {} as Record<string, number>,
  potionsSeen: 0,
};

/**
 * The Dopamine Regulator's data. Private by design: kept only on this phone,
 * in its own store, apart from the game save. It is never part of a backup,
 * never synced, and never sent to the server.
 */
export const useRegulator = create<RegulatorState>()(
  persist(
    (set, get) => ({
      ...EMPTY,
      setEnabled: (enabled) => set({ enabled }),
      setMode: (mode) => set({ mode }),
      setSelected: (selected) => set({ selected: [...new Set(selected)] }),
      addCustom: (name, severity) => {
        const stimulus: Stimulus = {
          id: `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          name: name.trim().slice(0, 40),
          severity: clampSeverity(severity),
          custom: true,
        };
        set({ custom: [...get().custom, stimulus], selected: [...get().selected, stimulus.id] });
        return stimulus;
      },
      // Archived, not deleted: past check-ins that counted it keep their drain.
      removeCustom: (id) =>
        set({
          custom: get().custom.map((s) => (s.id === id ? { ...s, archived: true } : s)),
          selected: get().selected.filter((s) => s !== id),
        }),
      finishOnboarding: (start) =>
        set({ onboarded: true, enabled: true, start: get().start ?? start, startAt: get().startAt ?? Date.now() }),
      report: (date, report) => {
        const clean: DayReport = {};
        for (const [id, times] of Object.entries(report))
          clean[id] = Math.min(MAX_COUNT, Math.max(0, Math.floor(times)));
        const { reports, reportedAt } = get();
        set({
          reports: { ...reports, [date]: clean },
          reportedAt: reportedAt[date] ? reportedAt : { ...reportedAt, [date]: Date.now() },
        });
      },
      setPotionsSeen: (potionsSeen) => set({ potionsSeen }),
      reset: () => set(EMPTY),
    }),
    {
      name: 'eight-paths-regulator',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({
        enabled,
        onboarded,
        mode,
        selected,
        custom,
        start,
        startAt,
        reports,
        reportedAt,
        potionsSeen,
      }) => ({
        enabled,
        onboarded,
        mode,
        selected,
        custom,
        start,
        startAt,
        reports,
        reportedAt,
        potionsSeen,
      }),
    },
  ),
);

/** Every stimulus there is to pick from: the built-in ones, then the player's own. */
export function allStimuli(custom: Stimulus[]): Stimulus[] {
  return [...BUILT_IN_STIMULI, ...custom];
}

/** The tracked stimuli, in list order. */
export function selectedStimuli(selected: string[], custom: Stimulus[]): Stimulus[] {
  const ids = new Set(selected);
  return allStimuli(custom).filter((s) => ids.has(s.id));
}
