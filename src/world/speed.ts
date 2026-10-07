// How fast the Other World plays (author, Oct 7, 2026: fast readers shouldn't wait on the
// dialogue). Scales how fast lines type out and how fast the scripted walks go; fights and
// walking about keep their own pace.

export type GameSpeed = 'slow' | 'normal' | 'fast';

/** The pause menu's three speeds, slowest first. */
export const SPEEDS = [
  { value: 'slow', label: '0.5×' },
  { value: 'normal', label: '1×' },
  { value: 'fast', label: '2×' },
] as const satisfies readonly { value: GameSpeed; label: string }[];

/** How many times faster than normal each speed plays. */
export const SPEED_RATE: Record<GameSpeed, number> = { slow: 0.5, normal: 1, fast: 2 };

export const SPEED_HINTS: Record<GameSpeed, string> = {
  slow: 'Lines type out at half speed, and cutscenes take their time.',
  normal: 'Lines type out at the usual pace.',
  fast: 'Lines type out twice as fast, and cutscenes hurry along. Tap to finish a line at any speed.',
};

export function isGameSpeed(value: unknown): value is GameSpeed {
  return value === 'slow' || value === 'normal' || value === 'fast';
}
