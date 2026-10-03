import { StyleSheet, Text, View } from 'react-native';

import type { Bar } from '@/game';
import { colors, fonts, spacing } from '@/theme';

type Props = {
  bars: Bar[];
  color: string;
  /** How tall the tallest bar can be. */
  height?: number;
  /** Label every bar (true), or only some so a long row stays readable. */
  every?: number;
  /** Bars to pick out (e.g. the best weekday), drawn fully; the rest a little faded. */
  highlight?: string | null;
};

const pct = (rate: number) => `${Math.round(rate * 100)}%`;

/**
 * Completion rates as columns: each bar's height is the share of what was due
 * that got done, with the percentage on top. A slice where nothing was due
 * shows an empty dashed outline, so "nothing scheduled" never reads as 0%.
 */
export function BarChart({ bars, color, height = 120, every = 1, highlight = null }: Props) {
  const showValues = bars.length <= 12;
  return (
    <View style={styles.chart} accessibilityRole="image" accessibilityLabel={describe(bars)}>
      {bars.map((b, i) => {
        const h = b.rate === null ? 0 : Math.max(3, Math.round(b.rate * height));
        const dim = highlight !== null && b.label !== highlight;
        return (
          <View key={`${b.label}-${i}`} style={styles.column}>
            {showValues && (
              <Text style={styles.value} numberOfLines={1}>
                {b.rate === null ? '' : pct(b.rate)}
              </Text>
            )}
            <View style={[styles.track, { height }]}>
              {b.rate === null ? (
                <View style={[styles.empty, { height: height * 0.35 }]} />
              ) : (
                <View style={[styles.bar, { height: h, backgroundColor: color, opacity: dim ? 0.45 : 1 }]} />
              )}
            </View>
            <Text style={[styles.label, highlight === b.label && { color, fontFamily: fonts.bold }]} numberOfLines={1}>
              {i % every === 0 || i === bars.length - 1 ? b.label : ''}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function describe(bars: Bar[]): string {
  return bars.map((b) => `${b.label}: ${b.rate === null ? 'nothing due' : pct(b.rate)}`).join(', ');
}

const styles = StyleSheet.create({
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  column: { flex: 1, alignItems: 'center', gap: 4 },
  value: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 11, fontVariant: ['tabular-nums'] },
  track: { width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  bar: { width: '78%', borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  empty: {
    width: '78%',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderBottomWidth: 0,
  },
  label: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 11, marginTop: spacing.xs / 2 },
});
