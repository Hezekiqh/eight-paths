import { SymbolView } from 'expo-symbols';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Line, Polygon } from 'react-native-svg';

import { CLASSES, DIMENSIONS, type Dimension } from '@/game';
import { colors } from '@/theme';

import { pointOnAxis, polygonPoints } from './geometry';

const AnimatedPolygon = Animated.createAnimatedComponent(Polygon);

const N = DIMENSIONS.length;
const RINGS = [0.25, 0.5, 0.75, 1];
const LABEL_SPACE = 46;
const LABEL_WIDTH = 84;
/** Smallest plotted value, so an empty window still shows a small core. */
const FLOOR = 0.05;
const REDRAW_MS = 900;

type Props = {
  size: number;
  color: string;
  current: Record<Dimension, number>;
  ghost: Record<Dimension, number> | null;
  /** Per-dimension opacity from dimming (1, 0.5 or 0.25). */
  opacity: Record<Dimension, number>;
};

const toArray = (values: Record<Dimension, number>) => DIMENSIONS.map((d) => Math.max(FLOOR, values[d]));

/** Hook that animates a polygon from its last shape to `values`. */
function useAnimatedShape(values: number[], radius: number, center: number) {
  const from = useSharedValue(values);
  const to = useSharedValue(values);
  const t = useSharedValue(1);
  const key = values.join(',');

  useEffect(() => {
    const now = from.value.map((f, i) => f + (to.value[i] - f) * t.value);
    from.value = now;
    to.value = values;
    t.value = 0;
    t.value = withTiming(1, { duration: REDRAW_MS, easing: Easing.inOut(Easing.cubic) });
    // `key` captures every change to `values`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return useAnimatedProps(() => {
    const mixed = from.value.map((f, i) => f + (to.value[i] - f) * t.value);
    return { points: polygonPoints(mixed, radius, center) };
  });
}

export function RadarChart({ size, color, current, ghost, opacity }: Props) {
  const center = size / 2;
  const radius = center - LABEL_SPACE;

  const currentProps = useAnimatedShape(toArray(current), radius, center);
  const ghostProps = useAnimatedShape(ghost ? toArray(ghost) : DIMENSIONS.map(() => 0), radius, center);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {RINGS.map((r) => (
          <Polygon
            key={r}
            points={polygonPoints(DIMENSIONS.map(() => r), radius, center)}
            fill="none"
            stroke={colors.grid}
            strokeOpacity={r === 1 ? 0.55 : 0.2}
            strokeWidth={r === 1 ? 1.5 : 1}
          />
        ))}
        {DIMENSIONS.map((d, i) => {
          const end = pointOnAxis(i, N, 1, radius, center);
          return (
            <Line
              key={d}
              x1={center}
              y1={center}
              x2={end.x}
              y2={end.y}
              stroke={colors.grid}
              strokeOpacity={0.35 * opacity[d]}
              strokeWidth={1}
            />
          );
        })}
        <AnimatedPolygon
          animatedProps={ghostProps}
          fill={colors.textMuted}
          fillOpacity={ghost ? 0.08 : 0}
          stroke={colors.textMuted}
          strokeOpacity={ghost ? 0.45 : 0}
          strokeWidth={1}
          strokeDasharray="4 4"
        />
        <AnimatedPolygon
          animatedProps={currentProps}
          fill={color}
          fillOpacity={0.3}
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
        />
      </Svg>
      {DIMENSIONS.map((d, i) => {
        const info = CLASSES[d];
        const p = pointOnAxis(i, N, 1, radius + LABEL_SPACE / 2 + 4, center);
        return (
          <View
            key={d}
            pointerEvents="none"
            style={[
              styles.label,
              { left: p.x - LABEL_WIDTH / 2, top: p.y - 20, opacity: opacity[d] },
            ]}>
            <SymbolView name={info.symbol} tintColor={info.color} size={16} />
            <Text style={styles.labelText} numberOfLines={1}>
              {info.className}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { position: 'absolute', width: LABEL_WIDTH, height: 40, alignItems: 'center', justifyContent: 'center', gap: 2 },
  labelText: { color: colors.text, fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
});
