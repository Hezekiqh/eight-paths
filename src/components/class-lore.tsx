import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { NoteBox } from '@/components/note-box';
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
      <NoteBox symbol="arrow.up.circle.fill" color={info.color}>
        {info.growth}
      </NoteBox>
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
});
