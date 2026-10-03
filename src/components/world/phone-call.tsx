import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { playSound } from '@/audio';
import { Portrait } from '@/components/world/portrait';
import { haptics } from '@/haptics';
import { colors, fonts, spacing, windowStyle } from '@/theme';

/** How often it rings, in ms (one ring of scripts/ring-sound.mjs, then a pause). */
const RING_EVERY = 2200;

/**
 * Your pocket ringing: the Keeper's telephone (keeper-calls.ts). It rings and buzzes until you
 * answer; there's no declining the Keeper.
 */
export function PhoneCall({ caller, onAnswer }: { caller: string; onAnswer: () => void }) {
  const shake = useSharedValue(0);
  useEffect(() => {
    shake.set(withRepeat(withSequence(withTiming(1, { duration: 50 }), withTiming(-1, { duration: 50 })), -1, true));
    const ringOnce = () => {
      playSound('ring');
      haptics.select();
    };
    ringOnce();
    const timer = setInterval(ringOnce, RING_EVERY);
    return () => clearInterval(timer);
  }, [shake]);
  const shaking = useAnimatedStyle(() => ({ transform: [{ rotate: `${shake.get() * 4}deg` }] }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View style={styles.center} pointerEvents="box-none">
        <Animated.View
          style={[styles.window, shaking]}
          accessibilityRole="alert"
          accessibilityLabel={`${caller} is calling`}>
          <Portrait sprite="keeper" />
          <View style={styles.words}>
            <Text style={styles.ringing}>☎ RING RING</Text>
            <Text style={styles.caller}>{caller.toUpperCase()}</Text>
            <Text style={styles.calling}>is calling…</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Answer"
            onPress={() => {
              haptics.tap();
              playSound('select');
              onAnswer();
            }}
            hitSlop={8}
            style={({ pressed }) => [styles.answer, pressed && styles.pressed]}>
            <Text style={styles.answerLabel}>ANSWER</Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  window: {
    ...windowStyle,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  words: { gap: 2 },
  ringing: { color: colors.accent, fontFamily: fonts.bold, fontSize: 14, letterSpacing: 1 },
  caller: { color: colors.text, fontFamily: fonts.bold, fontSize: 22 },
  calling: { color: colors.textFaint, fontFamily: fonts.dialogue, fontSize: 16 },
  answer: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 4,
  },
  pressed: { opacity: 0.7 },
  answerLabel: { color: colors.background, fontFamily: fonts.bold, fontSize: 16, letterSpacing: 1 },
});
