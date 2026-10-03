import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import type { CharacterId } from '@/story/companions';
import { fonts } from '@/theme';

/**
 * A few characters don't just stand there when they hatch: they do their own
 * thing. Only the ones listed here; everyone else keeps their idle bob.
 */
export const REVEAL_MOVES: Partial<Record<CharacterId, 'laugh'>> = {
  felix: 'laugh',
};

/** One go round the loop, in seconds: the laugh, then a breath. */
const LOOP = 3;
const LAUGH = 1.6;

/**
 * The laugh: a quick shake and a hop, head thrown back on every third beat, with
 * a HA or two popping out above and floating off; then a pause, and again.
 * `px` is the sprite's pixel size, so the shake is a pixel of art either way.
 */
export function RevealMove({
  kind,
  play,
  px,
  children,
}: {
  kind: 'laugh';
  play: boolean;
  px: number;
  children: ReactNode;
}) {
  const still = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (!play || still) return;
    t.set(0);
    t.set(withRepeat(withTiming(1, { duration: LOOP * 1000, easing: Easing.linear }), -1));
    return () => cancelAnimation(t);
  }, [play, still, t]);

  const body = useAnimatedStyle(() => {
    const s = t.get() * LOOP;
    if (s >= LAUGH) return { transform: [{ translateX: 0 }, { translateY: 0 }] };
    const beat = Math.floor(s * 12);
    return {
      transform: [{ translateX: (beat % 2 === 1 ? 1 : -1) * px }, { translateY: beat % 3 === 0 ? -2 * px : 0 }],
    };
  });
  const ha0 = useHa(t, 0, px);
  const ha1 = useHa(t, 1, px);
  const ha2 = useHa(t, 2, px);

  if (kind !== 'laugh') return children;
  return (
    <View>
      <Animated.View style={body}>{children}</Animated.View>
      {[ha0, ha1, ha2].map((style, k) => (
        <Animated.Text
          key={k}
          style={[styles.ha, { fontSize: 9 * px, left: k % 2 === 1 ? '62%' : '8%' }, style]}
          accessible={false}>
          HA
        </Animated.Text>
      ))}
    </View>
  );
}

/** The k-th HA of the laugh: pops out over the head, rises and fades. */
function useHa(t: ReturnType<typeof useSharedValue<number>>, k: number, px: number) {
  return useAnimatedStyle(() => {
    const age = t.get() * LOOP - k * 0.4;
    const on = age >= 0 && age <= 0.9;
    return { opacity: on ? 1 - age / 0.9 : 0, transform: [{ translateY: on ? -age * 10 * px : 0 }] };
  });
}

const styles = StyleSheet.create({
  ha: {
    position: 'absolute',
    top: '-4%',
    color: '#FFF4C0',
    fontFamily: fonts.bold,
    textShadowColor: '#07060B',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 0,
  },
});
