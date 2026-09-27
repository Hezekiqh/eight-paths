import { SymbolView, type SFSymbol } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, spacing } from '@/theme';

type Props = { symbol: SFSymbol; color: string; iconColor?: string; children: string };

/** A small aside with an icon and a coloured edge: how a class grows, lock hints. */
export function NoteBox({ symbol, color, iconColor = color, children }: Props) {
  return (
    <View style={[styles.box, { borderColor: color }]}>
      <SymbolView name={symbol} tintColor={iconColor} size={16} />
      <Text style={styles.text}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    backgroundColor: colors.cardRaised,
    borderLeftWidth: 3,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  text: { flex: 1, color: colors.textMuted, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
});
