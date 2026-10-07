import type { RegulatorMode } from '@/game/regulator';

export const MODES = [
  { value: 'easy', label: 'Easy' },
  { value: 'hard', label: 'Hard' },
] as const;

export const MODE_HINTS: Record<RegulatorMode, string> = {
  easy: 'One yes or no for each. The whole check-in takes about ten seconds.',
  hard: 'After a yes, say how many times. The cost adds up with each one, for a truer bar.',
};
