import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { COCOON_ART } from '@/art/realms';

type Props = {
  /** 0 = shut (a closed lid), 1 = wide open; values between blink. */
  open: SharedValue<number>;
  /** Screen points per art pixel of the cocoon picture it sits on. */
  px: number;
  /** The iris colour. */
  color: string;
};

const SILK = '#EDE6D6';
const LASH = '#3A3044';

/**
 * An eye in the upper middle of the cocoon, placed over the cocoon picture
 * (COCOON_ART) so it moves and tilts with it. Closed, it's a quiet seam in the
 * silk; opening, the lids part top and bottom and a soft golden halo rises
 * around it. Blinks close the lids the same way.
 */
export function CocoonEye({ open, px, color }: Props) {
  const e = COCOON_ART.eye;
  const w = e.w * px;
  const h = e.h * px;
  const half = h / 2;

  const haloStyle = useAnimatedStyle(() => ({
    opacity: open.value * 0.55,
    transform: [{ scale: 0.8 + open.value * 0.4 }],
  }));
  // The lids slide apart from the middle; closed, they meet at the seam.
  const topLid = useAnimatedStyle(() => ({ transform: [{ translateY: -open.value * half }] }));
  const bottomLid = useAnimatedStyle(() => ({ transform: [{ translateY: open.value * half }] }));

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.halo,
          {
            left: (e.x - e.w * 1.25) * px,
            top: (e.y - e.w * 1.25) * px,
            width: e.w * 2.5 * px,
            height: e.w * 2.5 * px,
            borderRadius: e.w * 2.5 * px,
          },
          haloStyle,
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.eye,
          { left: (e.x - e.w / 2) * px, top: (e.y - e.h / 2) * px, width: w, height: h, borderRadius: h },
        ]}>
        {/* The eye itself, behind the lids. */}
        <View style={{ width: 7 * px, height: h, backgroundColor: color, alignItems: 'center' }}>
          <View style={{ width: 3 * px, height: h, backgroundColor: '#07060B' }} />
        </View>
        <Animated.View
          style={[styles.lid, { top: 0, height: half + 1, borderBottomWidth: Math.max(1, px * 0.8) }, topLid]}
        />
        <Animated.View
          style={[styles.lid, { bottom: 0, height: half + 1, borderTopWidth: Math.max(1, px * 0.6) }, bottomLid]}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  halo: { position: 'absolute', backgroundColor: '#FFE9A0' },
  eye: {
    position: 'absolute',
    backgroundColor: '#F4F0E6',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  lid: { position: 'absolute', left: 0, right: 0, backgroundColor: SILK, borderColor: LASH },
});
