import * as Haptics from 'expo-haptics';
import type { TabTriggerSlotProps } from 'expo-router/ui';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { forwardRef } from 'react';
import { Pressable, StyleSheet, Text, View, type View as ViewType } from 'react-native';

import { colors, fonts, spacing } from '@/theme';

type Props = TabTriggerSlotProps & {
  label: string;
  symbol: SymbolViewProps['name'];
};

/**
 * One tab in the retro menu bar. The active tab turns gold and gets a heart
 * cursor, like picking an option in an old RPG battle menu.
 */
export const RetroTabButton = forwardRef<ViewType, Props>(function RetroTabButton(
  { label, symbol, isFocused, onPress, ...props },
  ref,
) {
  const tint = isFocused ? colors.gold : colors.textMuted;
  return (
    <Pressable
      ref={ref}
      {...props}
      onPress={(e) => {
        if (!isFocused) Haptics.selectionAsync();
        onPress?.(e);
      }}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={label}
      style={styles.tab}>
      <SymbolView name={symbol} tintColor={tint} size={22} />
      <View style={styles.labelRow}>
        {isFocused && <SymbolView name="heart.fill" tintColor={colors.gold} size={9} />}
        <Text style={[styles.label, { color: tint }]}>{label.toUpperCase()}</Text>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  tab: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: spacing.sm },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  label: { fontFamily: fonts.bold, fontSize: 16, letterSpacing: 1 },
});
