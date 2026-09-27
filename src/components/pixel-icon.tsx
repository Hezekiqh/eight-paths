import Svg, { Path } from 'react-native-svg';

import { PIXEL_ICONS, type PixelIconName } from './pixel-icons';

type Props = {
  name: PixelIconName;
  color: string;
  /** Points. Keep to multiples of 24 (or 12) so every pixel lands on the grid. */
  size?: number;
};

/**
 * A pixel-art icon from pixelarticons. Its pixels are whole units of a 24×24
 * grid, so at 24pt (or 12, 48) every edge lands on the screen's pixels.
 */
export function PixelIcon({ name, color, size = 24 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Path d={PIXEL_ICONS[name]} fill={color} />
    </Svg>
  );
}
