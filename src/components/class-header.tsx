import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text } from 'react-native';

import type { ClassInfo } from '@/game';
import { haptics } from '@/haptics';
import { colors, fonts, spacing } from '@/theme';

/** Section header naming a class; tapping it opens the class sheet. */
export function ClassHeader({ info }: { info: ClassInfo }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={`About the ${info.className} class`}
      onPress={() => {
        haptics.tap();
        router.push(`/class/${info.dimension}`);
      }}
      style={({ pressed }) => [styles.header, pressed && { opacity: 0.6 }]}>
      <SymbolView name={info.symbol} tintColor={info.color} size={16} />
      <Text style={[styles.title, { color: info.color }]}>{info.className.toUpperCase()}</Text>
      <SymbolView name="info.circle" tintColor={colors.textFaint} size={14} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  title: { fontSize: 17, fontFamily: fonts.bold, letterSpacing: 1.2 },
});
