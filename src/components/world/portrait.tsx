import { Canvas, FilterMode, Group, Image, MipmapMode, rect, useImage } from '@shopify/react-native-skia';
import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme';
import { WALKER_FRAME, WALKER_ROWS, type WalkerId } from '@/world/walkers';

const NEAREST = { filter: FilterMode.Nearest, mipmap: MipmapMode.None };
const WALKERS_IMAGE = require('@/assets/world/walkers.png');
/** Head and shoulders: the top of a walker's front-facing frame. */
const CROP = { width: WALKER_FRAME.width, height: 17 };
const ZOOM = 4;
export const PORTRAIT_SIZE = { width: CROP.width * ZOOM, height: CROP.height * ZOOM };

/**
 * A speaker's face beside their words: their own walker, cropped to head and
 * shoulders and drawn big with sharp pixels. `lift` bobs it a pixel, in time
 * with their voice while they talk.
 */
export function Portrait({ sprite, lift = false }: { sprite: WalkerId; lift?: boolean }) {
  const sheet = useImage(WALKERS_IMAGE);
  const row = WALKER_ROWS[sprite];
  return (
    <View style={styles.frame} accessible={false}>
      <Canvas style={PORTRAIT_SIZE}>
        {sheet && (
          <Group transform={[{ scale: ZOOM }]} clip={rect(0, 0, CROP.width, CROP.height)}>
            <Image
              image={sheet}
              x={0}
              y={-row * WALKER_FRAME.height + (lift ? -1 : 0) + 1}
              width={sheet.width()}
              height={sheet.height()}
              sampling={NEAREST}
            />
          </Group>
        )}
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderWidth: 2,
    borderColor: colors.frame,
    backgroundColor: colors.background,
    alignSelf: 'flex-start',
  },
});
