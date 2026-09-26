import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import type { ClassInfo } from '@/game/classes';
import { colors, radius, spacing } from '@/theme';

export function ClassRow({ info }: { info: ClassInfo }) {
  return (
    <View style={styles.row}>
      <View style={[styles.badge, { borderColor: info.color }]}>
        <SymbolView name={info.symbol} tintColor={info.color} size={20} />
      </View>
      <View style={styles.text}>
        <Text style={[styles.className, { color: info.color }]}>{info.className}</Text>
        <Text style={styles.dimension}>{info.dimensionLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1 },
  className: { fontSize: 17, fontWeight: '700' },
  dimension: { color: colors.textMuted, fontSize: 13 },
});
