import type { AudioSource } from 'expo-audio';

/**
 * Every sound the app plays. The files in assets/audio are stand-ins from
 * scripts/placeholder-audio.mjs; drop a real one in under the same name
 * (updating the extension here if it changes) and nothing else moves.
 *
 * Effects are kept to the rare moments; the music carries the mood.
 */
export const EFFECTS = {
  /** A quest marked done. */
  quest: require('../../assets/audio/quest.wav'),
  /** A companion or Path levelling up. */
  levelUp: require('../../assets/audio/level-up.wav'),
  /** A new hero out of the cocoon. */
  hatch: require('../../assets/audio/hatch.wav'),
  /** The intro's heartbeat. */
  heartbeat: require('../../assets/audio/heartbeat.wav'),
} satisfies Record<string, AudioSource>;

/**
 * The soundtrack, by place. Like Minecraft's, a piece plays once and then
 * there's quiet for a while before the next, picked at random; only the
 * intro loops. Add a piece by listing its file here.
 */
export const MUSIC = {
  /** The Keeper's telling at launch. */
  intro: [require('../../assets/audio/intro.m4a')],
  /** Today, Profile, Social and Journey. */
  home: [require('../../assets/audio/home-1.m4a'), require('../../assets/audio/home-2.m4a')],
  /** The Archive and the caves under it. */
  world: [require('../../assets/audio/world-1.m4a'), require('../../assets/audio/world-2.m4a')],
} satisfies Record<string, AudioSource[]>;

export type Effect = keyof typeof EFFECTS;
export type Place = keyof typeof MUSIC;

/** How each place paces its music: seconds before the first piece, and the quiet between pieces. */
export const PACING: Record<Place, { first: [number, number]; gap: [number, number]; loop?: boolean }> = {
  intro: { first: [0, 0], gap: [0, 0], loop: true },
  home: { first: [4, 12], gap: [60, 150] },
  world: { first: [2, 6], gap: [40, 100] },
};

/** How loud each effect plays. */
export const EFFECT_VOLUME: Record<Effect, number> = {
  quest: 0.7,
  levelUp: 0.8,
  hatch: 1,
  heartbeat: 1,
};

/** Music sits under the game (and under whatever else the phone is playing). */
export const MUSIC_VOLUME = 0.5;
