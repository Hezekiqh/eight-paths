import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useAudioSettings } from './settings';
import { EFFECTS, EFFECT_VOLUME, MUSIC, MUSIC_VOLUME, PACING, type Effect, type Place } from './sounds';

export { useAudioSettings } from './settings';
export type { Effect, Place } from './sounds';

/**
 * Every sound in the app goes through here, so the Music and Sounds settings
 * can silence all of it, like haptics.ts does for vibration. The game mixes
 * with whatever else the phone is playing (a podcast keeps going) and keeps
 * quiet when the ringer is off. Every call is fire-and-forget; a sound that
 * fails to play never matters.
 */

let configured = false;
const configure = () => {
  if (configured) return;
  configured = true;
  setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
  // The music rests with the app and picks up again when it's back.
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      if (piece) piece.player.play();
      else if (place) schedule(PACING[place].first);
    } else {
      clearTimeout(timer);
      piece?.player.pause();
    }
  });
  useAudioSettings.subscribe(syncMusic);
};

const effectPlayers = new Map<Effect, AudioPlayer>();

/** Plays a sound effect from the top, cutting off its own last play. */
export function playSound(effect: Effect) {
  if (!useAudioSettings.getState().sounds) return;
  configure();
  try {
    let player = effectPlayers.get(effect);
    if (!player) {
      player = createAudioPlayer(EFFECTS[effect]);
      player.volume = EFFECT_VOLUME[effect];
      effectPlayers.set(effect, player);
    }
    player.seekTo(0).catch(() => {});
    player.play();
  } catch {
    // A missing or broken sound is never worth a crash.
  }
}

// Places ask for their music while they're open; when two do (the intro over
// the tabs, the World over the tabs), the earlier one in this list wins.
const PRIORITY: Place[] = ['intro', 'world', 'home'];
const claims = new Map<Place, number>();
let place: Place | null = null;
let piece: { player: AudioPlayer; stop: () => void } | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
const lastPlayed = new Map<Place, number>();

const between = ([lo, hi]: [number, number]) => (lo + Math.random() * (hi - lo)) * 1000;

/** Eases a player's volume to `to` over `ms`, then calls `done`. */
function fade(player: AudioPlayer, to: number, ms: number, done?: () => void) {
  const from = player.volume;
  const steps = Math.max(1, Math.round(ms / 50));
  let step = 0;
  const id = setInterval(() => {
    step++;
    try {
      player.volume = from + ((to - from) * step) / steps;
    } catch {
      step = steps;
    }
    if (step >= steps) {
      clearInterval(id);
      done?.();
    }
  }, 50);
}

function schedule(range: [number, number]) {
  clearTimeout(timer);
  timer = setTimeout(playNext, between(range));
}

/** Starts a piece for the current place: a different one from last time, when there's a choice. */
function playNext() {
  if (!place) return;
  const here = place;
  const tracks = MUSIC[here];
  let pick = Math.floor(Math.random() * tracks.length);
  if (tracks.length > 1 && pick === lastPlayed.get(here)) pick = (pick + 1) % tracks.length;
  lastPlayed.set(here, pick);
  try {
    const player = createAudioPlayer(tracks[pick]);
    const pacing = PACING[here];
    player.loop = pacing.loop ?? false;
    player.volume = 0;
    player.play();
    fade(player, MUSIC_VOLUME, 2000);
    const finished = player.addListener('playbackStatusUpdate', (status) => {
      if (!status.didJustFinish || piece?.player !== player) return;
      piece.stop();
      piece = null;
      // Then quiet, before the next piece.
      schedule(pacing.gap);
    });
    piece = {
      player,
      stop: () => {
        finished.remove();
        player.pause();
        player.remove();
      },
    };
  } catch {
    piece = null;
  }
}

/** Fades out whatever is playing and moves to the music for the place now wanted. */
function syncMusic() {
  const wanted = useAudioSettings.getState().music ? (PRIORITY.find((p) => claims.get(p)) ?? null) : null;
  if (wanted === place) return;
  place = wanted;
  clearTimeout(timer);
  if (piece) {
    const old = piece;
    piece = null;
    fade(old.player, 0, 1200, old.stop);
  }
  if (wanted) schedule(PACING[wanted].first);
}

/** Asks for `place`'s music until the result is called. For a tab, call it in useFocusEffect. */
export function claimMusic(where: Place): () => void {
  configure();
  claims.set(where, (claims.get(where) ?? 0) + 1);
  syncMusic();
  let held = true;
  return () => {
    if (!held) return;
    held = false;
    claims.set(where, (claims.get(where) ?? 1) - 1);
    syncMusic();
  };
}

/** Asks for `place`'s music while the calling component is mounted. */
export function useMusic(where: Place) {
  useEffect(() => claimMusic(where), [where]);
}
