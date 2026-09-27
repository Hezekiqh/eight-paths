import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import type { ClassInfo } from '@/game';
import { colors, fonts, radius, spacing } from '@/theme';

type Props = { info: ClassInfo; compact?: boolean };

/** The class's fantasy flavour plus a plain line on which habits grow it. */
export function ClassLore({ info, compact }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={[styles.emblem, { borderColor: info.color }]}>
          <SymbolView name={info.symbol} tintColor={info.color} size={compact ? 22 : 30} />
        </View>
        <View style={styles.titles}>
          <Text style={[styles.className, { color: info.color }, compact && styles.classNameCompact]}>
            {info.className}
          </Text>
          <Text style={styles.epithet}>{info.epithet}</Text>
        </View>
      </View>
      <Text style={styles.lore}>{info.lore}</Text>
      <View style={[styles.growth, { borderColor: info.color }]}>
        <SymbolView name="arrow.up.circle.fill" tintColor={info.color} size={18} />
        <Text style={styles.growthText}>{info.growth}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  emblem: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardRaised,
  },
  titles: { flex: 1, gap: 2 },
  className: { fontSize: 36, fontFamily: fonts.bold },
  classNameCompact: { fontSize: 29 },
  epithet: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 14, fontStyle: 'italic', letterSpacing: 0.3 },
  lore: { color: colors.text, fontFamily: fonts.regular, fontSize: 16, lineHeight: 23 },
  growth: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    backgroundColor: colors.cardRaised,
    borderLeftWidth: 3,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  growthText: { flex: 1, color: colors.textMuted, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
});
