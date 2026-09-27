import type { SFSymbol } from 'expo-symbols';
import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, spacing } from '@/theme';

type Props = {
  icon: SFSymbol;
  iconColor?: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  /** Rendered on the right instead of a chevron. */
  accessory?: ReactNode;
};

export function SettingsRow({ icon, iconColor = colors.textMuted, title, subtitle, onPress, accessory }: Props) {
  const content = (
    <>
      <SymbolView name={icon} tintColor={iconColor} size={20} />
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {accessory ?? (onPress && <SymbolView name="chevron.right" tintColor={colors.textFaint} size={14} />)}
    </>
  );
  if (!onPress) return <View style={styles.row}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.cardRaised }]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 56,
  },
  text: { flex: 1, gap: 2 },
  title: { color: colors.text, fontSize: 21, fontFamily: fonts.semibold },
  subtitle: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
});
