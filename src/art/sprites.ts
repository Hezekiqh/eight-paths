import type { CharacterId } from '@/story/companions';

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

/** Characters without an entry fall back to their class symbol. */
export const CHARACTER_ART: Partial<Record<CharacterId, CharacterArt>> = {
  // PLACEHOLDER: a stand-in figure to prove the pipeline. Replace with the real
  // Brannoc from PixelLab before the next build.
  brannoc: {
    idle: { source: require('@/assets/sprites/brannoc/idle.png'), width: 32, height: 48, frames: 2, fps: 2 },
  },
};
