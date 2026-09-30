import type { AudioSource } from 'expo-audio';

/**
 * Every sound the app plays. The files in assets/audio are stand-ins from
 * scripts/placeholder-audio.mjs; drop a real one in under the same name
 * (updating the extension here if it changes) and nothing else moves.
 *
 * Outside the World, effects are kept to the rare moments; the music carries
 * the mood. In the World, combat and dialogue voices get their own.
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
  /** Combat in the World: an attack thrown, landing, an enemy falling, you hurt. */
  swing: require('../../assets/audio/swing.wav'),
  hit: require('../../assets/audio/hit.wav'),
  kill: require('../../assets/audio/kill.wav'),
  hurt: require('../../assets/audio/hurt.wav'),
  /** A charged blow, a blow shrugged off, a dodge roll, Aurek's slam, a torch guttering (Kaldor's shadow back). */
  charged: require('../../assets/audio/charged.wav'),
  clang: require('../../assets/audio/clang.wav'),
  roll: require('../../assets/audio/roll.wav'),
  slam: require('../../assets/audio/slam.wav'),
  gutter: require('../../assets/audio/gutter.wav'),
  /** Dialogue voices, lowest to highest (see voiceFor in dialogue-box.tsx). */
  blip1: require('../../assets/audio/blip-1.wav'),
  blip2: require('../../assets/audio/blip-2.wav'),
  blip3: require('../../assets/audio/blip-3.wav'),
  blip4: require('../../assets/audio/blip-4.wav'),
  blip5: require('../../assets/audio/blip-5.wav'),
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
  swing: 0.5,
  hit: 0.8,
  kill: 0.9,
  hurt: 0.9,
  charged: 0.9,
  clang: 0.7,
  roll: 0.5,
  slam: 1,
  gutter: 0.9,
  blip1: 0.5,
  blip2: 0.5,
  blip3: 0.5,
  blip4: 0.5,
  blip5: 0.5,
};

/** Music sits under the game (and under whatever else the phone is playing). */
export const MUSIC_VOLUME = 0.5;
