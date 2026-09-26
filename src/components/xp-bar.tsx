import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { colors, radius } from '@/theme';

type Props = {
  /** 0–1. Animates when it changes. */
  fill: number;
  color: string;
  height?: number;
  opacity?: number;
};

export function XpBar({ fill, color, height = 8, opacity = 1 }: Props) {
  const width = useSharedValue(fill);

  useEffect(() => {
    width.value = withTiming(fill, { duration: 500 });
  }, [fill, width]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${Math.min(1, width.value) * 100}%` }));

  return (
    <View style={[styles.track, { height, opacity }]}>
      <Animated.View style={[styles.fill, { backgroundColor: color }, fillStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { backgroundColor: colors.cardRaised, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
});
