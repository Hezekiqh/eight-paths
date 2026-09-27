import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { CharacterPortrait } from '@/components/character-portrait';
import { CLASSES, type Dimension, type XpGain } from '@/game';
import { useGameStore } from '@/store';
import { COMPANIONS } from '@/story/companions';
import type { Milestone } from '@/store';
import { colors, fonts, radius, spacing, windowStyle } from '@/theme';

const FADE_IN_MS = 300;
const FILL_MS = 1400;
const FLASH_MS = 350;
const HOLD_MS = 1000;
const FILL_EASING = Easing.inOut(Easing.cubic);

type Props = {
  dimension: Dimension;
  gain: XpGain;
  milestone?: Milestone | null;
  onDone: () => void;
};

/** Extra time on screen so a milestone can be read. */
const MILESTONE_HOLD_MS = 1800;

/**
 * Fades in after a completion and fills the dimension's XP bar. On a
 * level-up the bar maxes out, flashes, announces the level, and refills
 * from the carry-over XP.
 */
export function XpBanner({ dimension, gain, milestone, onDone }: Props) {
  const info = CLASSES[dimension];
  const { before, after, leveledUp } = gain;
  const [level, setLevel] = useState(before.level);
  const [xpLabel, setXpLabel] = useState(`${before.xpIntoLevel} / ${before.xpForNext} XP`);

  const member = COMPANIONS[useGameStore((s) => s.party[dimension])];
  const hop = useSharedValue(0);
  const width = useSharedValue(before.xpIntoLevel / before.xpForNext);
  const flash = useSharedValue(0);

  useEffect(() => {
    const afterFill = after.xpIntoLevel / after.xpForNext;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const fill = { duration: FILL_MS, easing: FILL_EASING };
    const hold = HOLD_MS + (milestone ? MILESTONE_HOLD_MS : 0);
    const filled = FADE_IN_MS + FILL_MS;

    if (leveledUp) {
      width.value = withDelay(
        FADE_IN_MS,
        withSequence(
          withTiming(1, fill),
          withDelay(FLASH_MS, withTiming(0, { duration: 0 })),
          withTiming(afterFill, fill),
        ),
      );
      flash.value = withDelay(
        filled,
        withSequence(withTiming(1, { duration: FLASH_MS / 2 }), withTiming(0, { duration: FLASH_MS / 2 })),
      );
      // The party member cheers: three little hops as the level lands.
      const up = { duration: 120, easing: Easing.out(Easing.quad) };
      const down = { duration: 120, easing: Easing.in(Easing.quad) };
      hop.value = withDelay(
        filled,
        withSequence(
          withTiming(-10, up),
          withTiming(0, down),
          withTiming(-10, up),
          withTiming(0, down),
          withTiming(-10, up),
          withTiming(0, down),
        ),
      );
      timers.push(setTimeout(() => setLevel(after.level), filled));
      timers.push(setTimeout(() => setXpLabel(`${after.xpIntoLevel} / ${after.xpForNext} XP`), filled + FLASH_MS));
      timers.push(setTimeout(onDone, filled + FLASH_MS + FILL_MS + hold));
    } else {
      width.value = withDelay(FADE_IN_MS, withTiming(afterFill, fill));
      timers.push(setTimeout(() => setXpLabel(`${after.xpIntoLevel} / ${after.xpForNext} XP`), filled));
      timers.push(setTimeout(onDone, filled + hold));
    }
    return () => timers.forEach(clearTimeout);
    // The banner is keyed per completion, so this runs once per gain.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
  }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));
  const hopStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: hop.value }],
  }));
  const levelledNow = leveledUp && level === after.level;

  return (
    <Animated.View
      entering={FadeIn.duration(FADE_IN_MS)}
      exiting={FadeOut.duration(400)}
      style={[styles.wrap, { bottom: spacing.lg }]}>
      <Pressable onPress={onDone} style={[styles.card, { borderColor: info.color }]}>
        <View style={styles.header}>
          <Animated.View style={hopStyle}>
            <CharacterPortrait companion={member} />
          </Animated.View>
          <Text style={[styles.title, levelledNow && { color: info.color }]}>
            {levelledNow ? `${info.className} — Level ${level}` : `${info.className} · Level ${level}`}
          </Text>
          <Text style={[styles.gain, { color: info.color }]}>+{gain.gained} XP</Text>
        </View>
        <View style={styles.track}>
          <Animated.View style={[styles.fill, { backgroundColor: info.color }, fillStyle]} />
          <Animated.View style={[StyleSheet.absoluteFill, styles.flash, flashStyle]} />
        </View>
        <Text style={styles.xp}>{xpLabel}</Text>
        {milestone && (
          <Animated.View entering={FadeIn.delay(FADE_IN_MS + FILL_MS).duration(400)} style={styles.milestone}>
            <SymbolView name="sparkles" tintColor={info.color} size={20} />
            <View style={styles.milestoneText}>
              <Text style={styles.milestoneTitle}>{milestone.title}</Text>
              <Text style={styles.milestoneDetail}>{milestone.detail}</Text>
            </View>
          </Animated.View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: spacing.lg, right: spacing.lg },
  card: {
    ...windowStyle,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  title: { flex: 1, color: colors.text, fontSize: 22, fontFamily: fonts.bold },
  gain: { fontSize: 22, fontFamily: fonts.bold },
  track: {
    height: 12,
    backgroundColor: colors.cardRaised,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: radius.pill },
  flash: { backgroundColor: colors.card, borderRadius: radius.pill },
  xp: {
    color: colors.textMuted,
    fontFamily: fonts.regular,
    fontSize: 13,
    textAlign: 'right',
  },
  milestone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  milestoneText: { flex: 1, gap: 2 },
  milestoneTitle: { color: colors.text, fontSize: 21, fontFamily: fonts.bold },
  milestoneDetail: {
    color: colors.textMuted,
    fontFamily: fonts.regular,
    fontSize: 13,
  },
});
