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
  // PLACEHOLDERS: hand-made stand-ins until the PixelLab art replaces them.
  brannoc: { idle: { source: require('@/assets/sprites/brannoc/idle.png'), width: 32, height: 48, frames: 2, fps: 2 } },
  ysolde: { idle: { source: require('@/assets/sprites/ysolde/idle.png'), width: 32, height: 48, frames: 2, fps: 2 } },
  quill: { idle: { source: require('@/assets/sprites/quill/idle.png'), width: 32, height: 48, frames: 2, fps: 2 } },
  wren: { idle: { source: require('@/assets/sprites/wren/idle.png'), width: 32, height: 48, frames: 2, fps: 2 } },
  oren: { idle: { source: require('@/assets/sprites/oren/idle.png'), width: 32, height: 48, frames: 2, fps: 2 } },
  pip: { idle: { source: require('@/assets/sprites/pip/idle.png'), width: 32, height: 48, frames: 2, fps: 2 } },
  tamsin: { idle: { source: require('@/assets/sprites/tamsin/idle.png'), width: 32, height: 48, frames: 2, fps: 2 } },
  moss: { idle: { source: require('@/assets/sprites/moss/idle.png'), width: 32, height: 48, frames: 2, fps: 2 } },
};
