import { create } from 'zustand';

import { CLASSES, DIMENSIONS, type Dimension } from '@/game';

/** Key for one starter habit: `${dimension}:${presetIndex}`. */
export type StarterKey = `${Dimension}:${number}`;

type OnboardingDraft = {
  name: string;
  classDimension: Dimension | null;
  selected: StarterKey[];
  /** True once the player has ticked or unticked a quest themselves. */
  customized: boolean;
  setName: (name: string) => void;
  setClass: (dimension: Dimension) => void;
  toggleStarter: (key: StarterKey) => void;
  reset: () => void;
};

/** Quick wins offered alongside the class's own first quest. */
const SMALL_WINS: StarterKey[] = ['physical:2', 'emotional:1', 'social:0'];

/** How many quests a new player starts with, so day one feels doable. */
export const STARTER_QUEST_COUNT = 3;

/** Above this, onboarding suggests starting smaller. */
export const STARTER_QUEST_TIP_ABOVE = 5;

/** The class's first quest plus two quick wins from other Paths. */
export function defaultSelection(classDimension: Dimension | null): StarterKey[] {
  const own: StarterKey[] = classDimension ? [`${classDimension}:0`] : [];
  const wins = SMALL_WINS.filter((k) => !classDimension || !k.startsWith(`${classDimension}:`));
  return [...own, ...wins].slice(0, STARTER_QUEST_COUNT);
}

/** Unsaved answers while the player moves through onboarding. */
export const useOnboardingDraft = create<OnboardingDraft>()((set) => ({
  name: '',
  classDimension: null,
  selected: defaultSelection(null),
  customized: false,
  setName: (name) => set({ name }),
  // Re-pick the defaults for the new class unless the player already chose their own.
  setClass: (classDimension) =>
    set((s) => (s.customized ? { classDimension } : { classDimension, selected: defaultSelection(classDimension) })),
  toggleStarter: (key) =>
    set((s) => ({
      customized: true,
      selected: s.selected.includes(key) ? s.selected.filter((k) => k !== key) : [...s.selected, key],
    })),
  reset: () => set({ name: '', classDimension: null, selected: defaultSelection(null), customized: false }),
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
