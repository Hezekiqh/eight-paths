import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import type { SpriteSheet } from '@/art/sprites';

type Props = {
  sheet: SpriteSheet;
  /**
   * Points per art pixel. 1 and 2 stay perfectly sharp on every iPhone, since
   * the ×12 files then shrink by a whole number on both 2× and 3× screens.
   */
  scale?: number;
  /** Paints every pixel this color: a silhouette. */
  tint?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Draws a sprite, stepping through its frames when it has more than one.
 * The whole strip sits inside a one-frame window and slides along it, which
 * keeps every frame in a single image. Holds on frame one for Reduce Motion.
 */
export function PixelSprite({ sheet, scale = 1, tint, style }: Props) {
  const reduceMotion = useReducedMotion();
  const [tick, setTick] = useState(0);
  const animated = sheet.frames > 1 && !reduceMotion;
  const frame = animated ? tick % sheet.frames : 0;

  useEffect(() => {
    if (!animated) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000 / (sheet.fps ?? 4));
    return () => clearInterval(id);
  }, [animated, sheet.fps]);

  const width = sheet.width * scale;
  const height = sheet.height * scale;
  return (
    <View style={[{ width, height, overflow: 'hidden' }, style]} accessible={false}>
      <Image
        source={sheet.source}
        contentFit="fill"
        tintColor={tint}
        style={{ width: width * sheet.frames, height, transform: [{ translateX: -frame * width }] }}
      />
    </View>
  );
}
