import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ClassInfo } from '@/game/classes';
import { colors, radius, spacing } from '@/theme';

export function ClassRow({ info }: { info: ClassInfo }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/class/${info.dimension}`)}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
      <View style={[styles.badge, { borderColor: info.color }]}>
        <SymbolView name={info.symbol} tintColor={info.color} size={20} />
      </View>
      <View style={styles.text}>
        <Text style={[styles.className, { color: info.color }]}>{info.className}</Text>
        <Text style={styles.dimension}>{info.epithet}</Text>
      </View>
      <SymbolView name="chevron.right" tintColor={colors.textFaint} size={14} />
    </Pressable>
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
  dimension: { color: colors.textMuted, fontSize: 13, fontStyle: 'italic' },
});
