import type { TabTriggerSlotProps } from 'expo-router/ui';
import { forwardRef } from 'react';
import { Pressable, StyleSheet, View, type View as ViewType } from 'react-native';

import { PixelIcon } from '@/components/pixel-icon';
import type { PixelIconName } from '@/components/pixel-icons';
import { haptics } from '@/haptics';
import { useTourTarget } from '@/tutorial/tour';
import { colors, spacing } from '@/theme';

type Props = TabTriggerSlotProps & {
  label: string;
  icon: PixelIconName;
  /** Shows a gold dot: something here is waiting for the player. */
  badge?: boolean;
  /** What the dot means, for VoiceOver. */
  badgeLabel?: string;
};

/**
 * One tab in the retro menu bar: an icon only, with the label kept for
 * VoiceOver. The active tab turns gold and gets a heart cursor, like picking
 * an option in an old RPG battle menu.
 */
export const RetroTabButton = forwardRef<ViewType, Props>(function RetroTabButton(
  { label, icon, badge, badgeLabel = 'rewards to claim', isFocused, onPress, ...props },
  ref,
) {
  // The Keeper's tour points at tabs by their label.
  const tourRef = useTourTarget(`tab:${label}`);
  const tint = isFocused ? colors.accent : colors.textMuted;
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
      accessibilityLabel={badge ? `${label}, ${badgeLabel}` : label}
      style={styles.tab}>
      <View ref={tourRef} collapsable={false}>
        {isFocused && (
          <View style={styles.cursor}>
            <PixelIcon name="heart" color={colors.accent} size={12} />
          </View>
        )}
        <PixelIcon name={icon} color={tint} size={24} />
        {badge && <View style={styles.badge} />}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  tab: { flex: 1, alignItems: 'center', paddingVertical: spacing.md },
  /** Sits left of the icon without nudging it off centre. */
  cursor: { position: 'absolute', left: -16, top: 6 },
  badge: {
    position: 'absolute',
    top: -2,
    right: -6,
    width: 9,
    height: 9,
    backgroundColor: colors.accent,
    borderWidth: 1.5,
    borderColor: colors.card,
  },
});
