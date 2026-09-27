import { Pressable, StyleSheet, Text } from 'react-native';

import { FRAME, colors, fonts, radius, spacing } from '@/theme';

type Props = {
  title: string;
  onPress: () => void;
  color?: string;
  disabled?: boolean;
  variant?: 'solid' | 'ghost';
};

export function Button({ title, onPress, color = colors.grid, disabled, variant = 'solid' }: Props) {
  const solid = variant === 'solid';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        solid ? { backgroundColor: color, borderColor: colors.frame } : { borderColor: color },
        pressed && styles.pressed,
        disabled && { opacity: 0.4 },
      ]}>
      <Text style={[styles.label, { color: solid ? colors.background : color }]}>{title.toUpperCase()}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    borderWidth: FRAME,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOpacity: 1,
    shadowRadius: 0,
    shadowOffset: { width: 4, height: 4 },
  },
  // Pressing pushes the button into its shadow, like a real key.
  pressed: { transform: [{ translateX: 3 }, { translateY: 3 }], shadowOffset: { width: 1, height: 1 } },
  label: { fontSize: 22, fontFamily: fonts.bold, letterSpacing: 1.5 },
});
