import * as Haptics from 'expo-haptics';

import { useGameStore } from '@/store';

/**
 * Every vibration in the app goes through here, so the Vibration setting can
 * silence all of it. Each call is fire-and-forget; a failed buzz never matters.
 */
const on = () => useGameStore.getState().player?.hapticsEnabled !== false;
const run = (buzz: () => Promise<void>) => {
  if (on()) buzz().catch(() => {});
};

export const haptics = {
  /** The faintest click: one typed letter in a dialogue box. */
  tick: () => run(Haptics.selectionAsync),
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
  celebrate: () => {
    run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
    setTimeout(() => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)), 140);
  },
};
