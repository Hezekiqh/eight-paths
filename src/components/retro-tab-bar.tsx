import type { TabTriggerSlotProps } from 'expo-router/ui';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { forwardRef } from 'react';
import { Pressable, StyleSheet, View, type View as ViewType } from 'react-native';

import { haptics } from '@/haptics';
import { colors, spacing } from '@/theme';

type Props = TabTriggerSlotProps & {
  label: string;
  symbol: SymbolViewProps['name'];
  /** Shows a gold dot: something here is waiting for the player. */
  badge?: boolean;
};

/**
 * One tab in the retro menu bar: an icon only, with the label kept for
 * VoiceOver. The active tab turns gold and gets a heart cursor, like picking
 * an option in an old RPG battle menu.
 */
export const RetroTabButton = forwardRef<ViewType, Props>(function RetroTabButton(
  { label, symbol, badge, isFocused, onPress, ...props },
  ref,
) {
  const tint = isFocused ? colors.gold : colors.textMuted;
  return (
    <Pressable
      ref={ref}
      {...props}
      onPress={(e) => {
        if (!isFocused) haptics.select();
        onPress?.(e);
      }}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={badge ? `${label}, rewards to claim` : label}
      style={styles.tab}>
      <View>
        {isFocused && <SymbolView name="heart.fill" tintColor={colors.gold} size={10} style={styles.cursor} />}
        <SymbolView name={symbol} tintColor={tint} size={26} />
        {badge && <View style={styles.badge} />}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  tab: { flex: 1, alignItems: 'center', paddingVertical: spacing.md },
  /** Sits left of the icon without nudging it off centre. */
  cursor: { position: 'absolute', left: -16, top: 8 },
  badge: {
    position: 'absolute',
    top: -2,
    right: -6,
    width: 9,
    height: 9,
    backgroundColor: colors.gold,
    borderWidth: 1.5,
    borderColor: colors.card,
  },
});
