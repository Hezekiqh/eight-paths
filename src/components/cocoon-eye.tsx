import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { COCOON_ART } from '@/art/realms';

type Props = {
  /** 0 = shut (hidden), 1 = wide open; values between blink. */
  open: SharedValue<number>;
  /** Screen points per art pixel of the cocoon picture it sits on. */
  px: number;
  /** The iris colour. */
  color: string;
};

/**
 * An eye opening in a torn hole in the cocoon's silk, placed over the cocoon
 * picture (COCOON_ART), so it moves and tilts with it.
 */
export function CocoonEye({ open, px, color }: Props) {
  const e = COCOON_ART.eye;
  const holeStyle = useAnimatedStyle(() => ({ opacity: open.value > 0 ? 1 : 0 }));
  const lidStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: Math.max(0.12, open.value) }] }));
  return (
    <Animated.View
      style={[
        styles.hole,
        {
          left: (e.x - e.w / 2 - 2) * px,
          top: (e.y - e.h / 2 - 1.5) * px,
          width: (e.w + 4) * px,
          height: (e.h + 3) * px,
          borderRadius: (e.h + 3) * px,
        },
        holeStyle,
      ]}>
      <Animated.View style={[styles.eyeball, { width: e.w * px, height: e.h * px, borderRadius: e.h * px }, lidStyle]}>
        <View style={{ width: 7 * px, height: e.h * px, backgroundColor: color, alignItems: 'center' }}>
          <View style={{ width: 3 * px, height: e.h * px, backgroundColor: '#07060B' }} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  hole: { position: 'absolute', backgroundColor: '#0A0810', alignItems: 'center', justifyContent: 'center' },
  eyeball: { backgroundColor: '#F4F0E6', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
