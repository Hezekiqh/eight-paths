import * as Haptics from 'expo-haptics';

import { useGameStore } from '@/store';
import type { Voice } from '@/world/portraits';
import type { Rumble } from '@/world/rumbles';

/**
 * Every vibration in the app goes through here, so the Vibration setting can
 * silence all of it. Each call is fire-and-forget; a failed buzz never matters.
 */
const on = () => useGameStore.getState().player?.hapticsEnabled !== false;
const run = (buzz: () => Promise<void>) => {
  if (on()) buzz().catch(() => {});
};
const { Light, Medium, Heavy, Soft, Rigid } = Haptics.ImpactFeedbackStyle;
const impact = (style: Haptics.ImpactFeedbackStyle) => run(() => Haptics.impactAsync(style));
/** One beat: an impact, or 'tick' for the faintest selection click. */
type Beat = [Haptics.ImpactFeedbackStyle | 'tick', number];
const beat = (style: Beat[0]) => (style === 'tick' ? run(Haptics.selectionAsync) : impact(style));
/** A run of beats, each [style, milliseconds after the first]. */
const pattern = (beats: Beat[]) => {
  for (const [style, at] of beats) {
    if (at === 0) beat(style);
    else setTimeout(() => beat(style), at);
  }
};

/** How each loud moment feels (see rumbles.ts). */
const RUMBLES: Record<Rumble, Beat[]> = {
  // A crowd swelling: it builds, peaks, and rolls off.
  roar: [[Light, 0], [Light, 80], [Medium, 160], [Medium, 240], [Heavy, 320], [Heavy, 410], [Medium, 520], [Light, 640]],
  // Short, sharp and frantic.
  scream: [[Rigid, 0], [Rigid, 45], [Rigid, 90], [Rigid, 135], [Medium, 190]],
  // One great blow and its echo.
  crash: [[Heavy, 0], [Medium, 110], [Soft, 230]],
  // Low and slow, felt more than heard.
  rumble: [[Soft, 0], [Soft, 130], [Medium, 260], [Soft, 390], [Soft, 520]],
  // Knock, knock.
  knock: [[Rigid, 0], [Rigid, 160]],
  // Lub-dub, lub-dub.
  heartbeat: [[Medium, 0], [Light, 120], [Medium, 700], [Light, 820]],
  // Breathe in… and a long, sleepy rattle out.
  snore: [[Soft, 0], [Soft, 90], [Soft, 180], [Soft, 600], [Light, 680], [Soft, 760]],
  // Ha-ha-ha-ha, tailing off.
  laugh: [[Light, 0], [Light, 110], [Light, 220], [Soft, 330], ['tick', 440]],
  // Ah… ah… CHOO.
  sneeze: [['tick', 0], ['tick', 220], ['tick', 400], [Heavy, 620]],
  // A warm, slow squeeze.
  hug: [[Soft, 0], [Soft, 60], [Soft, 120], [Soft, 180], [Soft, 240], [Soft, 300]],
  // Struck once, then ringing away.
  bell: [[Rigid, 0], ['tick', 150], ['tick', 320], ['tick', 520]],
  // A little march: dum, dum, da-da-dum.
  drum: [[Medium, 0], [Medium, 240], [Light, 420], [Light, 510], [Heavy, 620]],
  // A fine flutter, rising.
  whistle: [['tick', 0], ['tick', 50], ['tick', 100], ['tick', 150], ['tick', 200], [Rigid, 250]],
  // Hic!
  hiccup: [[Rigid, 0]],
};

export const haptics = {
  /** The faintest click: one typed letter in a dialogue box. */
  tick: () => run(Haptics.selectionAsync),
  /**
   * A speaker's voice, felt: deep voices thud softly, high ones click, and a
   * shouted line hits harder. Called alongside each dialogue blip.
   */
  speak: (voice: Voice, shouted: boolean) => {
    if (shouted) impact(voice <= 2 ? Heavy : voice >= 5 ? Rigid : Medium);
    else if (voice <= 2) impact(Soft);
    else if (voice >= 5) impact(Rigid);
    else run(Haptics.selectionAsync);
  },
  /** A loud moment in a line: a crowd roaring, a scream, a crash, a rumble. */
  rumble: (kind: Rumble) => pattern(RUMBLES[kind]),
  /** Moving between options: tabs, segments, months. */
  select: () => run(Haptics.selectionAsync),
  /** Pressing a button or card. */
  tap: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Something done: a quest, a goal, a claimed reward. */
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  /** A soft nudge: a quest completed without levelling. */
  nudge: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  /** Your attack lands in the World. */
  hit: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** An enemy falls. */
  kill: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** You lose a heart. */
  hurt: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  /** A heavy double thump for level-ups, shards and new characters. */
  celebrate: () => pattern([[Heavy, 0], [Medium, 140]]),
};
