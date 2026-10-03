import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { CLASSES, type PathStat } from '@/game';
import { colors, fonts, spacing } from '@/theme';

/**
 * Each Path's completion rate as a bar in its class colour, best first, with
 * how many points it moved since the period before. Paths with nothing due
 * sit at the bottom, marked as such.
 */
export function PathBars({ paths }: { paths: PathStat[] }) {
  const sorted = [...paths].sort((a, b) => (b.current.rate ?? -1) - (a.current.rate ?? -1));
  return (
    <View style={styles.list}>
      {sorted.map((p) => {
        const info = CLASSES[p.dimension];
        const rate = p.current.rate;
        const moved = p.change === null ? null : Math.round(p.change * 100);
        return (
          <View
            key={p.dimension}
            style={styles.row}
            accessible
            accessibilityLabel={`${info.className}: ${rate === null ? 'nothing scheduled' : `${Math.round(rate * 100)} percent`}${moved ? `, ${moved > 0 ? 'up' : 'down'} ${Math.abs(moved)} points` : ''}`}>
            <View style={styles.name}>
              <SymbolView name={info.symbol} tintColor={info.color} size={14} />
              <Text style={styles.nameText} numberOfLines={1}>
                {info.className}
              </Text>
            </View>
            <View style={styles.track}>
              {rate !== null && (
                <View style={[styles.fill, { width: `${Math.max(2, rate * 100)}%`, backgroundColor: info.color }]} />
              )}
            </View>
            <Text style={[styles.value, rate === null && styles.none]}>
              {rate === null ? '—' : `${Math.round(rate * 100)}%`}
            </Text>
            <Text style={[styles.change, moved !== null && moved > 0 && styles.up, moved !== null && moved < 0 && styles.down]}>
              {moved === null || moved === 0 ? '' : `${moved > 0 ? '▲' : '▼'}${Math.abs(moved)}`}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { width: 92, flexDirection: 'row', alignItems: 'center', gap: 6 },
  nameText: { color: colors.text, fontFamily: fonts.bold, fontSize: 14 },
  track: { flex: 1, height: 12, backgroundColor: colors.cardRaised, borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%' },
  value: { width: 40, textAlign: 'right', color: colors.text, fontFamily: fonts.bold, fontSize: 14, fontVariant: ['tabular-nums'] },
  none: { color: colors.textFaint },
  change: { width: 34, textAlign: 'right', color: colors.textFaint, fontFamily: fonts.bold, fontSize: 11, fontVariant: ['tabular-nums'] },
  up: { color: '#2F7D32' },
  down: { color: colors.danger },
});
