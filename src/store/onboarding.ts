import { create } from 'zustand';

import { CLASSES, DIMENSIONS, type Dimension } from '@/game';

/** Key for one starter habit: `${dimension}:${presetIndex}`. */
export type StarterKey = `${Dimension}:${number}`;

type OnboardingDraft = {
  name: string;
  classDimension: Dimension | null;
  selected: StarterKey[];
  setName: (name: string) => void;
  setClass: (dimension: Dimension) => void;
  toggleStarter: (key: StarterKey) => void;
  reset: () => void;
};

const defaultSelection = (): StarterKey[] => DIMENSIONS.map((d) => `${d}:0` as const);

/** Unsaved answers while the player moves through onboarding. */
export const useOnboardingDraft = create<OnboardingDraft>()((set) => ({
  name: '',
  classDimension: null,
  selected: defaultSelection(),
  setName: (name) => set({ name }),
  setClass: (classDimension) => set({ classDimension }),
  toggleStarter: (key) =>
    set((s) => ({
      selected: s.selected.includes(key) ? s.selected.filter((k) => k !== key) : [...s.selected, key],
    })),
  reset: () => set({ name: '', classDimension: null, selected: defaultSelection() }),
}));

export function starterQuestsFrom(selected: StarterKey[]) {
  return DIMENSIONS.flatMap((dimension) =>
    CLASSES[dimension].starterHabits
      .map((title, i) => ({ title, dimension, key: `${dimension}:${i}` as StarterKey }))
      .filter((q) => selected.includes(q.key))
      .map(({ title }) => ({ title, dimension })),
  );
}

export const DEFAULT_PLAYER_NAME = 'Adventurer';
