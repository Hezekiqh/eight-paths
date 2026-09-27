import type { CharacterId } from '@/story/companions';

import { STAND_INS } from './stand-ins';

/**
 * One image of pixel art, or a horizontal strip of equal animation frames.
 * Files come from scripts/import-sprite.mjs, already enlarged ×12 with sharp
 * pixels; `width` and `height` are one frame's size in art pixels.
 */
export type SpriteSheet = {
  source: number;
  width: number;
  height: number;
  frames: number;
  /** Playback speed for strips. Defaults to 4. */
  fps?: number;
};

/** Everything drawn for one character. Only `idle` is required. */
export type CharacterArt = {
  idle: SpriteSheet;
};

/**
 * Real art, as it arrives from PixelLab (via scripts/import-sprite.mjs). Every
 * character without an entry here uses their generated stand-in.
 */
const ART: Partial<Record<CharacterId, CharacterArt>> = {};

export const CHARACTER_ART: Partial<Record<CharacterId, CharacterArt>> = { ...STAND_INS, ...ART };
